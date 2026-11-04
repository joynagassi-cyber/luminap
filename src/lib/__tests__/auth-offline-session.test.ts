/**
 * Régression « offline » (demande terrain) : après une période sans
 * connexion, l'utilisateur restait bloqué sur la page d'authentification,
 * impossible d'entrer sur le dashboard hors ligne.
 *
 * Mécanisme fautif reproduit ici :
 *  1. `validateCurrentSession()` (toutes les 60 s) rafraîchit le token
 *     quand il approche de l'expiration ; HORS LIGNE, `refreshSession`
 *     échoue (réseau) et l'échec était traité comme une session invalide
 *     → `signOut()` → session locale détruite.
 *  2. `getSession()` ne rendait que la session du SDK : token expiré +
 *     refresh impossible (offline) → `null` → RouteGuard/Splash
 *     renvoyaient vers /welcome → /auth, alors que la session persistée
 *     existe toujours en localStorage et que toutes les données sont
 *     locales (PowerSync).
 *
 * Correctif attendu :
 *  - une erreur RÉSEAU ne déconnecte jamais (seul un rejet auth explicite
 *    en ligne invalide la session) ;
 *  - `getSession()` retombe sur la session persistée localement
 *    (`sb-…-auth-token`) quand le SDK n'en rend pas — un sign-out
 *    explicite vide le stockage, donc ce repli ne ressuscite personne.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.hoisted(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://stub.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "stub-anon-key");
});

// ─── In-memory localStorage (env node) ──────────────────────────────────────
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

// ─── Supabase mock ──────────────────────────────────────────────────────────
const sb = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: () => {} } },
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getSession: sb.getSession,
      refreshSession: sb.refreshSession,
      signOut: sb.signOut,
      getUser: sb.getUser,
      onAuthStateChange: sb.onAuthStateChange,
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
  }),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
}));

import { authService } from "@/lib/auth";

const STORED_SESSION = {
  access_token: "stored-access",
  refresh_token: "stored-refresh",
  expires_at: Math.floor(Date.now() / 1000) - 3600, // expiré (cas offline réel)
  user: { id: "user-1", email: "a@b.com" },
};

function setOnline(online: boolean) {
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: online },
    configurable: true,
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  sb.signOut.mockResolvedValue({ error: null } as any);
  // État du singleton réinitialisé entre les cas.
  (authService as any).state = {
    session: null,
    user: null,
    profile: null,
    isLoading: false,
    error: null,
  };
  setOnline(true);
});

afterEach(() => {
  setOnline(true);
});

describe("getSession — accès local hors ligne", () => {
  it("retombe sur la session persistée quand le SDK n'en rend pas (token expiré, offline)", async () => {
    localStorage.setItem("sb-stub-auth-token", JSON.stringify(STORED_SESSION));
    sb.getSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Failed to fetch", name: "AuthRetryableFetchError" },
    });
    setOnline(false);

    const session = await authService.getSession();

    expect(session).not.toBeNull();
    expect(session?.user?.id).toBe("user-1");
    expect(session?.access_token).toBe("stored-access");
  });

  it("ne ressuscite personne après un sign-out explicite (stockage vidé)", async () => {
    sb.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const session = await authService.getSession();

    expect(session).toBeNull();
  });

  it("rend la session du SDK quand elle existe (comportement nominal inchangé)", async () => {
    const live = { ...STORED_SESSION, access_token: "live-access" };
    sb.getSession.mockResolvedValue({ data: { session: live }, error: null });

    const session = await authService.getSession();

    expect(session?.access_token).toBe("live-access");
  });
});

describe("validateCurrentSession — ne jamais déconnecter hors ligne", () => {
  const expiringSession = {
    ...STORED_SESSION,
    expires_at: Math.floor(Date.now() / 1000) + 60, // expire dans < buffer 5 min
  } as any;

  it("erreur réseau sur refreshSession → pas de signOut, session conservée", async () => {
    (authService as any).state.session = expiringSession;
    sb.getSession.mockResolvedValue({
      data: { session: expiringSession },
      error: null,
    });
    sb.refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Failed to fetch", name: "AuthRetryableFetchError" },
    });
    setOnline(false);

    await (authService as any).validateCurrentSession();

    expect(sb.signOut).not.toHaveBeenCalled();
    expect(authService.getState().session).not.toBeNull();
  });

  it("rejet auth explicite en ligne → invalidation (signOut) préservée", async () => {
    (authService as any).state.session = expiringSession;
    sb.getSession.mockResolvedValue({
      data: { session: expiringSession },
      error: null,
    });
    sb.refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: {
        message: "Invalid Refresh Token: Refresh Token Not Found",
        name: "AuthApiError",
        status: 401,
      },
    });
    setOnline(true);

    await (authService as any).validateCurrentSession();

    expect(sb.signOut).toHaveBeenCalled();
    expect(authService.getState().session).toBeNull();
  });
});

describe("getSession — local-first (boot hors ligne instantané)", () => {
  it("rend la session persistée SANS appeler le SDK (aucun réseau bloquant)", async () => {
    localStorage.setItem("sb-stub-auth-token", JSON.stringify(STORED_SESSION));
    // Le SDK ne résout JAMAIS : s'il était attendu, getSession resterait
    // bloqué. C'est précisément la cause du splash long hors ligne.
    sb.getSession.mockImplementation(() => new Promise(() => {}));
    sb.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Failed to fetch", name: "AuthRetryableFetchError" },
    });
    setOnline(true);

    const session = await authService.getSession();

    expect(session?.user?.id).toBe("user-1");
    expect(sb.getSession).not.toHaveBeenCalled();
  });

  it("sans session persistée : borne l'attente réseau du SDK (ne bloque pas le boot)", async () => {
    vi.useFakeTimers();
    try {
      sb.getSession.mockImplementation(() => new Promise(() => {})); // ne résout jamais
      const p = authService.getSession();
      await vi.advanceTimersByTimeAsync(5000);
      expect(await p).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("resumeSession — retour au premier plan sans déconnexion", () => {
  afterEach(() => {
    (authService as any).stopSessionValidation();
  });

  it("session en mémoire : conserve la session (aucun signOut)", async () => {
    (authService as any).state.session = {
      ...STORED_SESSION,
      expires_at: Math.floor(Date.now() / 1000) + 60,
    };
    sb.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Failed to fetch", name: "AuthRetryableFetchError" },
    });
    setOnline(true);

    await authService.resumeSession();

    expect(sb.signOut).not.toHaveBeenCalled();
    expect(authService.getState().session).not.toBeNull();
  });

  it("état mémoire perdu + session persistée : restaure sans signOut", async () => {
    (authService as any).state.session = null;
    localStorage.setItem("sb-stub-auth-token", JSON.stringify(STORED_SESSION));
    setOnline(true);

    await authService.resumeSession();

    expect(sb.signOut).not.toHaveBeenCalled();
    expect(authService.getState().session?.user?.id).toBe("user-1");
  });

  it("hors ligne : ne tente rien et ne déconnecte pas", async () => {
    (authService as any).state.session = null;
    setOnline(false);

    await authService.resumeSession();

    expect(sb.signOut).not.toHaveBeenCalled();
  });

  it("ne ressuscite PAS un compte volontairement quitté (backup ignoré)", async () => {
    (authService as any).state.session = null;
    // Backup soft-session présent (compte quitté via « Mes comptes ») mais
    // AUCUNE session active persistée : la reprise ne doit pas reconnecter.
    localStorage.setItem(
      "lumina-session-backup",
      JSON.stringify({
        userId: "user-1",
        access_token: "backup-access",
        refresh_token: "backup-refresh",
      }),
    );
    setOnline(true);

    await authService.resumeSession();

    expect(sb.signOut).not.toHaveBeenCalled();
    expect(sb.refreshSession).not.toHaveBeenCalled();
    expect(authService.getState().session).toBeNull();
  });
});
