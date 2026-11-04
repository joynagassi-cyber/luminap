// @vitest-environment node
/**
 * A4 — choix de la base au démarrage, et surtout : NE RIEN PERDRE.
 *
 * Le risque réel de cette phase n'est pas « la clé est mal générée », c'est
 * qu'un utilisateur ayant saisi des transactions hors-ligne avant la mise à
 * jour retrouve une application vide. Ces tests verrouillent les trois
 * propriétés qui l'empêchent :
 *
 *   1. une base historique n'est JAMAIS ignorée tant que sa file d'upload n'a
 *      pas été prouvée vide (pas de marqueur ⇒ on l'ouvre encore) ;
 *   2. elle n'est supprimée qu'APRÈS le marqueur, posé seulement une fois la
 *      preuve faite (`initPowerSync` : compteur à 0 ET aucune CRUD à envoyer) ;
 *   3. une base chiffrée dont la clé est perdue est supprimée plutôt que
 *      laissée illisible — et ce cas est SIGNALÉ, pas silencieux.
 *
 * NON-VACUITÉ : retirer la condition `isMigrationMarked` ⇒ le test « base
 * historique conservée » échoue (la base serait ouverte en chiffré, donc
 * vide). Retirer la suppression de la base orpheline ⇒ le test correspondant
 * échoue.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/observability/errorReporter", () => ({ reportError: vi.fn() }));

import {
  DB_MIGRATION_MARKER,
  indexedDbExists,
  markLegacyMigrationComplete,
  prepareDatabaseBoot,
  type IndexedDbLike,
} from "@/lib/powersync/encryptedDatabase";
import { ENCRYPTION_KEY_STORAGE_ID } from "@/lib/powersync/encryptionKey";

const KEY = "f".repeat(64);

/** Faux IndexedDB : ne modélise que ce que le code utilise. */
type FakeRequest = {
  onupgradeneeded: (() => void) | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onblocked: (() => void) | null;
  result: { close: () => void };
  transaction?: { abort: () => void };
};

function fakeIdb(existing: string[] = []) {
  const names = new Set(existing);
  const deleted: string[] = [];
  const idb: IndexedDbLike = {
    databases: async () => [...names].map((name) => ({ name })),
    open: (name: string) => {
      const request: FakeRequest = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
        result: { close: () => undefined },
        transaction: { abort: () => undefined },
      };
      queueMicrotask(() => {
        if (!names.has(name)) {
          names.add(name);
          request.onupgradeneeded?.();
        }
        request.onsuccess?.();
      });
      return request as unknown as IDBOpenDBRequest;
    },
    deleteDatabase: (name: string) => {
      deleted.push(name);
      names.delete(name);
      const request: FakeRequest = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        onblocked: null,
        result: { close: () => undefined },
      };
      queueMicrotask(() => request.onsuccess?.());
      return request as unknown as IDBOpenDBRequest;
    },
  };
  return { idb, names, deleted, created: () => [...names] };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const random = () => vi.fn((n: number) => new Uint8Array(n).fill(0xaa));

beforeEach(() => vi.clearAllMocks());

describe("A4 — plan de démarrage de la base", () => {
  it("installation neuve : base chiffrée, fichier distinct de l'ancien", async () => {
    const { idb } = fakeIdb();
    const storage = memoryStorage();
    const plan = await prepareDatabaseBoot({
      idb,
      storage,
      keyOptions: { storage, store: null, random: random() },
    });

    expect(plan.mode).toBe("encrypted");
    expect(plan.filename).toBe("lumina-enc.db");
    expect(plan.encryptionKey).toHaveLength(64);
    expect(storage.data.get(ENCRYPTION_KEY_STORAGE_ID)).toBe(plan.encryptionKey);
  });

  it("base historique sans marqueur : elle est CONSERVÉE (aucune écriture perdue)", async () => {
    const { idb, created } = fakeIdb(["lumina.db"]);
    const storage = memoryStorage();
    const plan = await prepareDatabaseBoot({
      idb,
      storage,
      keyOptions: { storage, store: null, random: random() },
    });

    expect(plan).toMatchObject({
      mode: "unencrypted",
      filename: "lumina.db",
      reason: "legacy-pending-migration",
    });
    // Rien n'a été supprimé et aucune base chiffrée vide n'a été créée.
    expect(created()).toEqual(["lumina.db"]);
  });

  it("base historique marquée migrée : on passe au chiffré et l'ancienne est supprimée", async () => {
    const { idb, deleted } = fakeIdb(["lumina.db"]);
    const storage = memoryStorage({ [DB_MIGRATION_MARKER]: "2026-01-01T00:00:00Z" });
    const plan = await prepareDatabaseBoot({
      idb,
      storage,
      keyOptions: { storage, store: null, random: random() },
    });

    expect(plan).toMatchObject({ mode: "encrypted", filename: "lumina-enc.db" });
    expect(deleted).toEqual(["lumina.db"]);
  });

  it("clé perdue d'une base chiffrée : la base illisible est supprimée et signalée", async () => {
    const { idb, deleted } = fakeIdb(["lumina-enc.db"]);
    const storage = memoryStorage({ [ENCRYPTION_KEY_STORAGE_ID]: "corrompue" });
    const plan = await prepareDatabaseBoot({ idb, storage, keyOptions: { storage, store: null } });

    expect(plan).toMatchObject({
      mode: "unencrypted",
      reason: "key-corrupted",
      orphanedEncryptedDbRemoved: true,
    });
    expect(deleted).toEqual(["lumina-enc.db"]);
  });

  it("sans IndexedDB (SSR) : base en mémoire, jamais chiffrée « pour faire joli »", async () => {
    const plan = await prepareDatabaseBoot({ idb: null });
    expect(plan).toEqual({
      mode: "unencrypted",
      filename: "lumina.db",
      reason: "no-indexeddb",
    });
  });

  it("sans générateur aléatoire : motif explicite, aucun chiffrement factice", async () => {
    const { idb } = fakeIdb();
    const storage = memoryStorage();
    const plan = await prepareDatabaseBoot({
      idb,
      storage,
      keyOptions: {
        storage,
        store: null,
        random: () => {
          throw new Error("pas de crypto");
        },
      },
    });

    expect(plan).toMatchObject({ mode: "unencrypted", reason: "no-random" });
    expect(plan.encryptionKey).toBeUndefined();
  });

  it("le marqueur n'est posé que pour une base historique en cours de migration", async () => {
    const storage = memoryStorage();
    expect(
      markLegacyMigrationComplete(
        { mode: "encrypted", filename: "lumina-enc.db" },
        { storage },
      ),
    ).toBe(false);
    expect(storage.data.has(DB_MIGRATION_MARKER)).toBe(false);

    expect(
      markLegacyMigrationComplete(
        { mode: "unencrypted", filename: "lumina.db", reason: "legacy-pending-migration" },
        { storage },
      ),
    ).toBe(true);
    expect(storage.data.get(DB_MIGRATION_MARKER)).toBeTruthy();
  });

  it("existence d'une base : sonde correcte quand `databases()` est absent", async () => {
    const names = new Set(["lumina.db"]);
    const idb: IndexedDbLike = {
      open: (name: string) => {
        const request: FakeRequest = {
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
          onblocked: null,
          result: { close: () => undefined },
          transaction: { abort: () => undefined },
        };
        queueMicrotask(() => {
          if (!names.has(name)) request.onupgradeneeded?.();
          request.onsuccess?.();
        });
        return request as unknown as IDBOpenDBRequest;
      },
      deleteDatabase: () => ({}) as IDBOpenDBRequest,
    };

    expect(await indexedDbExists("lumina.db", idb)).toBe(true);
    expect(await indexedDbExists("absent.db", idb)).toBe(false);
  });
});
