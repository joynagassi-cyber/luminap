/**
 * Choix de la base locale au démarrage : chiffrée ou historique.
 *
 * POURQUOI CE MODULE EXISTE (et pas un simple `encryptionKey` en dur) :
 * les installations existantes ont déjà une base `lumina.db` EN CLAIR, avec
 * potentiellement une file d'écritures non synchronisées. Chiffrer du jour au
 * lendemain sans précaution produirait l'un de ces deux dégâts :
 *   - ouvrir la base chiffrée à la place de l'ancienne → toutes les écritures
 *     faites hors-ligne, jamais synchronisées, disparaissent sans trace ;
 *   - chiffrer l'ancienne base sur place → impossible sans la rouvrir, et une
 *     clé perdue (mise à jour du Keystore, restauration système) rendrait la
 *     réplique illisible au prochain lancement.
 *
 * STRATÉGIE RETENUE :
 *   1. base chiffrée présente + clé disponible → on l'ouvre (cas nominal) ;
 *   2. base historique présente et PAS encore migrée → on la garde pour ce
 *      démarrage (`reason: "legacy-pending-migration"`), et on ne la supprime
 *      qu'une fois la file d'upload vide (`finalizeLegacyMigration`) ;
 *   3. base chiffrée présente mais clé absente/illisible → la réplique est
 *      définitivement inaccessible ; on la supprime et on repart d'une base
 *      neuve, en le signalant (les données viennent du serveur) ;
 *   4. aucune clé générable (WebView sans `crypto.getRandomValues`) → on
 *      n'invente PAS une clé faible : base en clair + incident signalé.
 *
 * Aucun de ces chemins n'échoue en silence : le plan retourné est journalisé
 * par `initPowerSync`, et les cas 3/4 passent par `reportError`.
 */

import {
  databaseFilenameFor,
  loadOrCreateDatabaseKey,
  type EncryptionKeyOptions,
  type EncryptionKeyState,
} from "./encryptionKey";

/** Sous-ensemble d'IndexedDB utilisé (injectable en test). */
export interface IndexedDbLike {
  databases?: () => Promise<{ name?: string }[]>;
  open: (name: string, version?: number) => IDBOpenDBRequest;
  deleteDatabase: (name: string) => IDBOpenDBRequest;
}

export type DatabaseUnencryptedReason =
  | "key-corrupted"
  | "keystore-unavailable"
  | "no-random"
  | "legacy-pending-migration"
  | "no-indexeddb";

export interface DatabaseBootPlan {
  mode: "encrypted" | "unencrypted";
  /** Nom du fichier SQLite (base de données IndexedDB sous PowerSync web). */
  filename: string;
  /** Absent en mode non chiffré. Ne JAMAIS journaliser. */
  encryptionKey?: string;
  /** Où la clé a été trouvée — `localStorage` sur natif est un incident. */
  keySource?: "keystore" | "localStorage";
  reason?: DatabaseUnencryptedReason;
  /** Une base chiffrée orpheline a été supprimée (clé perdue). */
  orphanedEncryptedDbRemoved?: boolean;
}

export const DB_MIGRATION_MARKER = "lumina_db_encryption_migrated";

function defaultIdb(): IndexedDbLike | null {
  const idb = (globalThis as { indexedDB?: IndexedDbLike }).indexedDB;
  return idb ?? null;
}

/**
 * Une base (fichier SQLite → IndexedDB) existe-t-elle déjà ?
 *
 * `indexedDB.databases()` est la voie directe mais n'existe pas partout ; on
 * retombe alors sur une ouverture avortée : `onupgradeneeded` signifie que la
 * base n'existait pas. Aucun accès en écriture n'est laissé derrière nous.
 */
export async function indexedDbExists(
  name: string,
  idb: IndexedDbLike | null = defaultIdb(),
): Promise<boolean> {
  if (!idb) return false;
  if (typeof idb.databases === "function") {
    try {
      const list = await idb.databases();
      return list.some((entry) => entry?.name === name);
    } catch {
      /* certaines implémentations lèvent : on retombe sur la sonde */
    }
  }
  return new Promise<boolean>((resolve) => {
    let created = false;
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    try {
      const request = idb.open(name);
      request.onupgradeneeded = () => {
        created = true;
        // La base n'existait pas : on ANNULE l'ouverture pour ne pas laisser
        // un fichier vide derrière nous (`indexedDB.databases()` est absent
        // sur certains WebView).
        try {
          request.transaction?.abort();
        } catch {
          /* transaction déjà terminée : le nettoyage ci-dessous s'en charge */
        }
      };
      request.onsuccess = () => {
        request.result.close();
        finish(!created);
      };
      request.onerror = () => finish(!created);
      request.onblocked = () => finish(!created);
      // L'ouverture d'une base inexistante déclenche une création : on
      // l'annule immédiatement pour ne pas laisser un fichier vide.
      queueMicrotask(() => {
        if (created) {
          try {
            idb.deleteDatabase(name);
          } catch {
            /* best-effort : la base créée est vide, sans conséquence */
          }
          finish(false);
        }
      });
    } catch {
      finish(false);
    }
  });
}

export async function deleteIndexedDb(
  name: string,
  idb: IndexedDbLike | null = defaultIdb(),
): Promise<void> {
  if (!idb) return;
  await new Promise<void>((resolve) => {
    try {
      const request = idb.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      // `onblocked` (base encore ouverte ailleurs) : on ne bloque PAS le boot.
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

export interface BootPlanDeps {
  keyOptions?: EncryptionKeyOptions;
  idb?: IndexedDbLike | null;
  /** Injectable en test (marqueur de migration). */
  storage?: Pick<Storage, "getItem" | "setItem">;
}

/**
 * Décide — SANS ouvrir PowerSync — quelle base utiliser ce démarrage.
 * Ne lève jamais : un démarrage doit rester possible, mais l'état est toujours
 * qualifié (jamais « silence »).
 */
export async function prepareDatabaseBoot(
  deps: BootPlanDeps = {},
): Promise<DatabaseBootPlan> {
  const idb = deps.idb === undefined ? defaultIdb() : deps.idb;
  const storage = deps.storage ?? (safeStorage() as Pick<Storage, "getItem" | "setItem"> | undefined);
  const encryptedName = databaseFilenameFor(true);
  const legacyName = databaseFilenameFor(false);

  if (!idb) {
    // SSR / environnement sans IndexedDB : base en mémoire, rien à chiffrer.
    return { mode: "unencrypted", filename: legacyName, reason: "no-indexeddb" };
  }

  const encryptedExists = await indexedDbExists(encryptedName, idb);

  let keyState: EncryptionKeyState;
  try {
    keyState = await loadOrCreateDatabaseKey(deps.keyOptions);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    // Clé illisible ou corrompue : la base chiffrée est définitivement perdue.
    // On la supprime (pas de fichier illisible qui traîne) et on repart ; le
    // serveur reste la source de vérité.
    let orphanedEncryptedDbRemoved = false;
    if (encryptedExists) {
      await deleteIndexedDb(encryptedName, idb);
      orphanedEncryptedDbRemoved = true;
    }
    return {
      mode: "unencrypted",
      filename: legacyName,
      reason: code === "corrupted-key" ? "key-corrupted" : "keystore-unavailable",
      orphanedEncryptedDbRemoved,
    };
  }

  if (keyState.kind === "unencrypted") {
    return { mode: "unencrypted", filename: legacyName, reason: "no-random" };
  }

  if (!encryptedExists) {
    const legacyExists = await indexedDbExists(legacyName, idb);
    if (legacyExists) {
      if (!isMigrationMarked(storage)) {
        // Base historique : on la garde jusqu'à ce que sa file d'upload soit
        // PROUVÉE vide (`markLegacyMigrationComplete`). La clé est déjà créée
        // pour le prochain démarrage.
        return { mode: "unencrypted", filename: legacyName, reason: "legacy-pending-migration" };
      }
      // Le démarrage précédent a prouvé la file vide : la base historique ne
      // contient plus rien d'unique. Elle n'est PAS ouverte ici, donc la
      // suppression aboutit (fortiori si un onglet la retient, elle sera
      // simplement ignorée la prochaine fois).
      await deleteIndexedDb(legacyName, idb);
    }
  }

  return {
    mode: "encrypted",
    filename: encryptedName,
    encryptionKey: keyState.key,
    keySource: keyState.source,
  };
}

/** Marque la migration comme faite — utile si la base historique n'existe plus. */
export function markMigrationDone(
  storage: Pick<Storage, "setItem"> | undefined = safeStorage(),
): void {
  try {
    storage?.setItem(DB_MIGRATION_MARKER, new Date().toISOString());
  } catch {
    /* stockage indisponible : la migration sera re-tentée, sans dommage */
  }
}

/** Le marqueur est-il posé (file d'upload prouvée vide au démarrage précédent) ? */
export function isMigrationMarked(
  storage: Pick<Storage, "getItem"> | undefined = safeStorage() as
    | Pick<Storage, "getItem">
    | undefined,
): boolean {
  try {
    return Boolean(storage?.getItem(DB_MIGRATION_MARKER));
  } catch {
    return false;
  }
}

export interface MigrationDeps {
  storage?: Pick<Storage, "setItem">;
}

/**
 * Appelée UNIQUEMENT quand la file d'upload est prouvée vide (voir
 * `initPowerSync`). On ne supprime pas la base maintenant : elle est OUVERTE,
 * et une suppression d'IndexedDB ouverte est bloquée (donc silencieusement
 * sans effet). On pose le marqueur ; le démarrage suivant ouvre la base
 * chiffrée et supprime l'ancienne (`prepareDatabaseBoot`).
 *
 * @returns true si le marqueur vient d'être posé.
 */
export function markLegacyMigrationComplete(
  plan: DatabaseBootPlan,
  deps: MigrationDeps = {},
): boolean {
  if (plan.reason !== "legacy-pending-migration") return false;
  markMigrationDone(deps.storage ?? (safeStorage() as Pick<Storage, "setItem"> | undefined));
  return true;
}

function safeStorage(): Pick<Storage, "getItem" | "setItem"> | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
