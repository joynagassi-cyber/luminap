/**
 * Clé de chiffrement de la base locale — source unique.
 *
 * DÉCISION (Joy, §7 #6) : le chiffrement de la base SQLite locale est REQUIS.
 * La réplique PowerSync contient des transactions nominatives (dîmes, offrandes,
 * salaires) : sur un appareil perdu ou rooté, un fichier `lumina.db` en clair est
 * une fuite de données financières de tiers.
 *
 * COMMENT (vérifié dans les sources installées, pas supposé) :
 * - `@powersync/web` accepte `database.encryptionKey` ; la valeur est échappée
 *   puis appliquée par `PRAGMA key = '…'` à l'ouverture, et le module WASM
 *   « mc » (SQLite3MultipleCiphers, ChaCha20) est chargé au lieu du module
 *   standard (`RawSqliteConnection.js`, `vfs.js`). Une base chiffrée reste donc
 *   illisible sans la clé, y compris en copiant les fichiers IndexedDB.
 * - La clé vit dans le Keystore Android (chiffré par le matériel) via
 *   `@aparajita/capacitor-secure-storage@7`, et dans `localStorage` sur le web
 *   (l'implémentation web du plugin n'offre pas de coffre : elle ne protège pas
 *   contre un attaquant qui lit le profil du navigateur — c'est documenté dans
 *   `docs/audit-permissions.md` comme limite du canal web, pas comme preuve).
 *
 * INTERDITS :
 * - Ne JAMAIS dériver la clé d'un identifiant utilisateur sans secret (un UUID
 *   n'est pas un secret) ni d'une valeur embarquée dans le bundle (elle serait
 *   publique par construction : le bundle est téléchargé).
 * - Ne JAMAIS journaliser la clé, ni la mettre dans un message d'erreur.
 *
 * ROTATION : changer la clé d'une base existante exige de la rouvrir avec
 * l'ancienne puis `PRAGMA rekey`. Ce n'est pas fait ici (aucun besoin produit
 * exprimé) ; `rotate()` est refusé explicitement plutôt que mal implémenté.
 */

const KEY_STORAGE_ID = "lumina_db_encryption_key";
const KEY_BYTES = 32; // 256 bits — recommandation de SQLite3MultipleCiphers.

/** Résultat de la lecture de la clé. Aucun état « silencieux ». */
export type EncryptionKeyState =
  | { kind: "encrypted"; key: string; source: "keystore" | "localStorage" }
  | { kind: "unencrypted"; reason: "generation-failed"; error: unknown };

/** Sous-ensemble du plugin réellement utilisé (facilite le mock en test). */
export interface SecureKeyStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface EncryptionKeyOptions {
  /** Injectable en test ; par défaut le coffre natif + repli localStorage. */
  store?: SecureKeyStore;
  /** Injectable en test ; par défaut `crypto.getRandomValues`. */
  random?: (bytes: number) => Uint8Array;
  /** Injectable en test ; par défaut l'objet `window` du navigateur. */
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  /** Force le mode « pas de coffre » (Cypress, SSR) sans toucher au reste. */
  useLocalStorageOnly?: boolean;
}

/** Erreur typée : la clé existe mais n'a pas pu être lue (Keystore HS, etc.). */
export class EncryptionKeyError extends Error {
  readonly code: "keystore-unavailable" | "corrupted-key";
  constructor(code: "keystore-unavailable" | "corrupted-key", message: string) {
    super(message);
    this.name = "EncryptionKeyError";
    this.code = code;
  }
}

/**
 * Coffre réel : `@aparajita/capacitor-secure-storage@7` (EncryptedSharedPreferences
 * / Keystore sur Android, Keychain sur iOS, `localStorage` côté web).
 *
 * Import DYNAMIQUE : le module Capacitor appelle `registerPlugin` au chargement.
 * Un import statique ferait payer ce coût au chunk d'entrée ET casserait les
 * tests en environnement `node` (aucun `window`). L'échec renvoie `null` —
 * jamais une exception : un appareil sans Keystore doit pouvoir démarrer.
 */
async function resolveSecureStore(): Promise<SecureKeyStore | null> {
  try {
    // Sur le WEB, le proxy du plugin lève « not implemented on web » à l'appel :
    // la clé vit dans localStorage (documenté, docs/audit-permissions.md).
    // Le coffre natif n'est utilisé que sur plateforme native.
    const core = await import("@capacitor/core");
    if (!core.Capacitor.isNativePlatform()) return null;
    const mod = await import("@aparajita/capacitor-secure-storage");
    const proxy = mod.SecureStorage as unknown as SecureKeyStore;
    if (!proxy || typeof proxy.get !== "function") return null;
    return proxy;
  } catch {
    return null;
  }
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function isHexKey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

/**
 * Lit la clé ; la CRÉE à la première ouverture.
 *
 * SÉRIALISÉ : deux appels concurrents (boot + provider React) ne doivent pas
 * générer deux clés différentes — la seconde rendrait la base illisible. On
 * chaîne les appels plutôt que de partager un unique résultat en vol : deux
 * appels avec des `options` différentes (tests) ne doivent pas se contaminer.
 */
let queue: Promise<unknown> = Promise.resolve();

export function loadOrCreateDatabaseKey(
  options: EncryptionKeyOptions = {},
): Promise<EncryptionKeyState> {
  const run = queue.then(
    () => resolveKey(options),
    () => resolveKey(options),
  );
  // La file ne doit jamais rester « rejetée » : un échec ne bloque pas l'appel
  // suivant (sinon la clé ne serait plus jamais lue après un Keystore en
  // panne transitoire).
  queue = run.catch(() => undefined);
  return run;
}

async function resolveKey(options: EncryptionKeyOptions): Promise<EncryptionKeyState> {
  const storage = options.storage ?? safeWindowStorage();
  // `null` explicite = « pas de coffre » (tests, SSR) : ne PAS retomber sur le
  // coffre réel, sinon le test en environnement `node` charge un module
  // Capacitor sans `window`.
  const store = options.useLocalStorageOnly
    ? null
    : options.store !== undefined
      ? options.store
      : await resolveSecureStore();
  const random = options.random ?? ((n: number) => crypto.getRandomValues(new Uint8Array(n)));

  const readFrom = async (): Promise<string | null> => {
    if (store) {
      try {
        const value = await store.get(KEY_STORAGE_ID);
        if (value !== null && value !== undefined) return String(value);
      } catch (error) {
        throw new EncryptionKeyError(
          "keystore-unavailable",
          `Coffre natif illisible (${(error as Error)?.message ?? "erreur inconnue"})`,
        );
      }
    }
    return storage?.getItem(KEY_STORAGE_ID) ?? null;
  };

  const writeTo = async (key: string): Promise<"keystore" | "localStorage"> => {
    if (store) {
      try {
        await store.set(KEY_STORAGE_ID, key);
        return "keystore";
      } catch {
        // Repli assumé : on ne perd pas la clé. `initPowerSync` journalise la
        // source réellement utilisée (une clé en `localStorage` sur natif est
        // un incident de sécurité à remonter, pas une situation nominale).
      }
    }
    if (!storage) {
      throw new EncryptionKeyError(
        "keystore-unavailable",
        "Aucun stockage disponible pour conserver la clé de chiffrement.",
      );
    }
    storage.setItem(KEY_STORAGE_ID, key);
    return "localStorage";
  };

  // Le coffre peut exister mais ne plus répondre : `readFrom` lève alors une
  // `EncryptionKeyError`. On la LAISSE remonter — il faut refuser d'ouvrir en
  // clair ET refuser de générer une nouvelle clé (la base deviendrait
  // illisible). `prepareDatabaseBoot` qualifie ce cas, il ne l'avale pas.
  const existing = await readFrom();

  if (existing !== null) {
    if (!isHexKey(existing)) {
      throw new EncryptionKeyError(
        "corrupted-key",
        "La clé de chiffrement stockée est corrompue (format inattendu).",
      );
    }
    // Source réelle : si le coffre répond, la clé y est forcément (c'est lui
    // qui a été lu en premier) ; sinon elle vient du repli.
    return { kind: "encrypted", key: existing, source: store ? "keystore" : "localStorage" };
  }

  let generated: string;
  try {
    generated = toHex(random(KEY_BYTES));
  } catch (error) {
    // `crypto.getRandomValues` absent (vieux WebView) : on ne fabrique PAS une
    // clé faible avec Math.random — mieux vaut une base non chiffrée et
    // signalée qu'une fausse sécurité.
    return { kind: "unencrypted", reason: "generation-failed", error };
  }

  const source = await writeTo(generated);
  return { kind: "encrypted", key: generated, source };
}

function safeWindowStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined {
  try {
    if (typeof window === "undefined" || !window.localStorage) return undefined;
    // Sonde : Safari privé lève à l'écriture.
    const probe = "__lumina_storage_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Purge (déconnexion définitive, remise à zéro) — jamais appelée en usage normal. */
export async function forgetDatabaseKey(options: EncryptionKeyOptions = {}): Promise<void> {
  const storage = options.storage ?? safeWindowStorage();
  // `null` explicite = « pas de coffre » (tests, SSR) : ne PAS retomber sur le
  // coffre réel, sinon le test en environnement `node` charge un module
  // Capacitor sans `window`.
  const store = options.useLocalStorageOnly
    ? null
    : options.store !== undefined
      ? options.store
      : await resolveSecureStore();
  if (store) {
    try {
      await store.remove(KEY_STORAGE_ID);
    } catch {
      /* le repli localStorage est purgé juste après */
    }
  }
  storage?.removeItem(KEY_STORAGE_ID);
}

/** Nom du fichier pour un mode de stockage donné. */
export function databaseFilenameFor(encrypted: boolean): string {
  // Deux fichiers distincts : une base chiffrée ne peut pas être ouverte sans
  // clé, et une base en clair ne doit pas être confondue avec elle. Séparer
  // évite qu'un démarrage dégradé (clé perdue) écrase la base chiffrée.
  return encrypted ? "lumina-enc.db" : "lumina.db";
}

export const ENCRYPTION_KEY_STORAGE_ID = KEY_STORAGE_ID;
