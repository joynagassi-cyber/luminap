/**
 * Régression — résolution du profil (donc de l'ORGANISATION) hors ligne.
 *
 * Défaut produit visé : « je coupe la connexion, plus rien ne marche, toutes
 * les listes sont vides ». Cause racine : `authService.getProfile()` faisait
 * une requête RÉSEAU (`supabase.from("profiles")`) sans repli local. Au
 * démarrage à froid hors ligne, il rendait `null` → `AppContext` ne résolvait
 * JAMAIS l'organisation → `getOrganizationId()` restait `__no_org__` → tous
 * les écrans filtrés par `org_id` étaient vides (« transaction introuvable »)
 * alors que la réplique PowerSync locale contenait les lignes.
 *
 * Correctif : repli sur le profil PERSISTÉ localement (`lumina-user`), lu sans
 * réseau. Ce test échoue si l'on retire le repli (retour à `return null`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "stub-anon-key");
});

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}
if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
}

// `maybeSingle` configurable : simule une réponse réseau (profil ou erreur).
const sb = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(),
      signOut: vi.fn(async () => ({ error: null })),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: () => {} } },
      })),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: sb.maybeSingle }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  }),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
}));

import {
  authService,
  readStoredProfile,
  persistProfileLocally,
} from "@/lib/auth";

function setOnline(online: boolean) {
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: online },
    configurable: true,
  });
}

const LOCAL_PROFILE = {
  id: "user-1",
  email: "a@b.com",
  firstName: "Jean",
  lastName: "Dupont",
  role: "ADMIN",
  org: { id: "org-42", name: "Église MF" },
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setOnline(true);
});

afterEach(() => {
  setOnline(true);
});

describe("getProfile — repli local hors ligne (résolution d'organisation)", () => {
  it("rend le profil PERSISTÉ sans réseau quand l'appareil est hors ligne", async () => {
    localStorage.setItem("lumina-user", JSON.stringify(LOCAL_PROFILE));
    setOnline(false);

    const profile = await authService.getProfile("user-1");

    expect(profile).not.toBeNull();
    expect(profile?.org_id).toBe("org-42");
    expect(profile?.role).toBe("ADMIN");
    // Aucune requête réseau tentée hors ligne.
    expect(sb.maybeSingle).not.toHaveBeenCalled();
  });

  it("retombe sur le profil local si la requête réseau échoue (online mais injoignable)", async () => {
    localStorage.setItem("lumina-user", JSON.stringify(LOCAL_PROFILE));
    sb.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "Failed to fetch" },
    });

    const profile = await authService.getProfile("user-1");

    expect(profile?.org_id).toBe("org-42");
  });

  it("privilégie la réponse réseau quand elle existe (comportement nominal)", async () => {
    localStorage.setItem("lumina-user", JSON.stringify(LOCAL_PROFILE));
    sb.maybeSingle.mockResolvedValue({
      data: { id: "user-1", org_id: "org-99", role: "MEMBRE" },
      error: null,
    });

    const profile = await authService.getProfile("user-1");

    expect(profile?.org_id).toBe("org-99");
    expect(profile?.role).toBe("MEMBRE");
  });

  it("ne sert jamais le profil d'un AUTRE utilisateur", async () => {
    localStorage.setItem("lumina-user", JSON.stringify(LOCAL_PROFILE));
    setOnline(false);

    const profile = await authService.getProfile("user-2");

    expect(profile).toBeNull();
  });
});

describe("persistProfileLocally — écriture locale fusionnante", () => {
  it("persiste l'org_id relu ensuite par readStoredProfile", () => {
    persistProfileLocally({
      id: "user-1",
      email: "a@b.com",
      first_name: "Jean",
      last_name: "Dupont",
      role: "ADMIN",
      org_id: "org-42",
      created_at: "",
      updated_at: "",
    });

    const back = readStoredProfile("user-1");
    expect(back?.org_id).toBe("org-42");
    expect(back?.first_name).toBe("Jean");
  });

  it("ne remplace pas une valeur connue par du vide (fusion)", () => {
    localStorage.setItem("lumina-user", JSON.stringify(LOCAL_PROFILE));
    persistProfileLocally({
      id: "user-1",
      email: "",
      first_name: "",
      last_name: "",
      role: "",
      org_id: "",
      created_at: "",
      updated_at: "",
    });

    const back = readStoredProfile("user-1");
    expect(back?.org_id).toBe("org-42");
    expect(back?.role).toBe("ADMIN");
  });
});
