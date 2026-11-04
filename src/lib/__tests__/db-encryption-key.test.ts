// @vitest-environment node
/**
 * A4 — chiffrement de la base locale : la CLÉ.
 *
 * Ce que ces tests protègent (décision §7 #6 « chiffrement requis ») :
 *   - la clé n'est jamais dérivée d'un identifiant public, elle vient d'un
 *     générateur cryptographique ;
 *   - elle est stable entre deux démarrages (sinon la base devient illisible) ;
 *   - un coffre natif en panne ne provoque JAMAIS d'ouverture en clair
 *     silencieuse ni la génération d'une seconde clé ;
 *   - sans générateur sûr, on refuse de chiffrer plutôt que de faire semblant.
 *
 * NON-VACUITÉ : remplacer `random(KEY_BYTES)` par `Math.random()` ⇒ le test
 * « 256 bits hexadécimaux issus de getRandomValues » échoue (longueur 64 mais
 * générateur non appelé) ; supprimer la vérification `isHexKey` ⇒ le test
 * « clé corrompue » échoue (l'app repartirait sur une base déjà chiffrée avec
 * une clé tronquée = base définitivement illisible).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/observability/errorReporter", () => ({ reportError: vi.fn() }));

import {
  ENCRYPTION_KEY_STORAGE_ID,
  EncryptionKeyError,
  databaseFilenameFor,
  forgetDatabaseKey,
  loadOrCreateDatabaseKey,
  type SecureKeyStore,
} from "@/lib/powersync/encryptionKey";

const KEY_A = "a".repeat(64);
const KEY_B = "b".repeat(64);

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

function fixedRandom(hexChar = "c") {
  return vi.fn((bytes: number) => new Uint8Array(bytes).fill(parseInt(hexChar + hexChar, 16)));
}

function failingStore(): SecureKeyStore {
  return {
    get: vi.fn(async () => {
      throw new Error("Keystore indisponible");
    }),
    set: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}

beforeEach(() => vi.clearAllMocks());

describe("A4 — clé de chiffrement de la base", () => {
  it("génère 256 bits hexadécimaux avec le générateur cryptographique", async () => {
    const storage = memoryStorage();
    const random = fixedRandom("c");
    const state = await loadOrCreateDatabaseKey({ storage, store: null, random });

    expect(random).toHaveBeenCalledWith(32);
    expect(state.kind).toBe("encrypted");
    if (state.kind !== "encrypted") throw new Error("attendu chiffré");
    expect(state.key).toHaveLength(64);
    expect(state.key).toMatch(/^[0-9a-f]{64}$/);
    expect(storage.data.get(ENCRYPTION_KEY_STORAGE_ID)).toBe(state.key);
  });

  it("réutilise la clé existante — deux démarrages, une seule clé", async () => {
    const storage = memoryStorage({ [ENCRYPTION_KEY_STORAGE_ID]: KEY_A });
    const random = fixedRandom("d");
    const state = await loadOrCreateDatabaseKey({ storage, store: null, random });

    if (state.kind !== "encrypted") throw new Error("attendu chiffré");
    expect(state.key).toBe(KEY_A);
    expect(random).not.toHaveBeenCalled();
  });

  it("préfère le coffre natif au stockage web", async () => {
    const storage = memoryStorage({ [ENCRYPTION_KEY_STORAGE_ID]: KEY_B });
    const store: SecureKeyStore = {
      get: vi.fn(async () => KEY_A),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    const state = await loadOrCreateDatabaseKey({ storage, store, random: fixedRandom() });

    if (state.kind !== "encrypted") throw new Error("attendu chiffré");
    expect(state.key).toBe(KEY_A);
    expect(state.source).toBe("keystore");
  });

  it("écrit dans le coffre quand il est disponible", async () => {
    const store: SecureKeyStore = {
      get: vi.fn(async () => null),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    const storage = memoryStorage();
    const state = await loadOrCreateDatabaseKey({ storage, store, random: fixedRandom("e") });

    if (state.kind !== "encrypted") throw new Error("attendu chiffré");
    expect(store.set).toHaveBeenCalledWith(ENCRYPTION_KEY_STORAGE_ID, state.key);
    expect(state.source).toBe("keystore");
    expect(storage.data.size).toBe(0);
  });

  it("coffre en panne : erreur typée, jamais de nouvelle clé ni de base en clair", async () => {
    const storage = memoryStorage({ [ENCRYPTION_KEY_STORAGE_ID]: KEY_A });
    const store = failingStore();

    await expect(loadOrCreateDatabaseKey({ storage, store, random: fixedRandom() })).rejects.toBeInstanceOf(
      EncryptionKeyError,
    );
    // La clé existante n'a pas été écrasée : la base reste ouvrable une fois
    // le Keystore rétabli.
    expect(storage.data.get(ENCRYPTION_KEY_STORAGE_ID)).toBe(KEY_A);
  });

  it("clé stockée corrompue : refus explicite (pas de réouverture hasardeuse)", async () => {
    const storage = memoryStorage({ [ENCRYPTION_KEY_STORAGE_ID]: "trop-courte" });
    const promise = loadOrCreateDatabaseKey({ storage, store: null, random: fixedRandom() });

    await expect(promise).rejects.toMatchObject({ code: "corrupted-key" });
  });

  it("sans générateur sûr : base NON chiffrée et motif explicite", async () => {
    const storage = memoryStorage();
    const random = vi.fn(() => {
      throw new Error("crypto.getRandomValues absent");
    });
    const state = await loadOrCreateDatabaseKey({ storage, store: null, random });

    expect(state).toEqual({ kind: "unencrypted", reason: "generation-failed", error: expect.any(Error) });
    expect(storage.data.size).toBe(0);
  });

  it("fichiers distincts : une base chiffrée n'écrase jamais l'ancienne", () => {
    expect(databaseFilenameFor(true)).not.toBe(databaseFilenameFor(false));
    expect(databaseFilenameFor(true)).toBe("lumina-enc.db");
    expect(databaseFilenameFor(false)).toBe("lumina.db");
  });

  it("forgetDatabaseKey purge le coffre ET le repli", async () => {
    const storage = memoryStorage({ [ENCRYPTION_KEY_STORAGE_ID]: KEY_A });
    const store: SecureKeyStore = {
      get: vi.fn(async () => KEY_A),
      set: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    await forgetDatabaseKey({ storage, store });

    expect(store.remove).toHaveBeenCalledWith(ENCRYPTION_KEY_STORAGE_ID);
    expect(storage.data.has(ENCRYPTION_KEY_STORAGE_ID)).toBe(false);
  });
});
