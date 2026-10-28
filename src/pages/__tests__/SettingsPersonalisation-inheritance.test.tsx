// @vitest-environment jsdom
/**
 * Phase 14 — Personnalisation profil/organisation : persistance, restauration,
 * isolation des préférences, et héritage mère→annexe.
 *
 * Ce fichier COMPLÈTE `SettingsPersonalisation.test.tsx` (déjà centré sur le
 * défaut « nom d'organisation persisté en base »). Il verrouille les chemins
 * RÉELS d'écriture/lecture :
 *   - persistance d'une préférence (thème `lumina-theme`, nom d'org
 *     `lumina-config`) via la couche réelle — pas de mock du composant ;
 *   - restauration au remontage (relecture du storage) ;
 *   - isolation entre utilisateurs/organisations : la clé est-elle scopée ?
 *     → NON (défaut de conception, documenté ci-dessous, NON corrigé ici) ;
 *   - héritage mère→annexe : la personnalisation est-elle héritée ?
 *     → NON (aucun mécanisme ne lit `parent_org_id` côté config). Ces cas sont
 *     des tests de CARACTÉRISATION (R3) : ils figent le comportement ACTUEL.
 *
 * Les seuls mocks sont des frontières de plateforme (PowerSync WASM, cache,
 * store local, auth Supabase, Ionic shadow-DOM, upload) : la logique de
 * persistance (`localStorage`, `executeWrite`, `useAppConfig`) est exercée
 * telle quelle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
  renderHook,
} from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";

// État partagé, hoisté (lisible par les factories `vi.mock` et par les tests).
type ExecFn = (sql: string, params?: unknown[]) => Promise<{ rowsAffected: number }>;

const h = vi.hoisted(() => ({
  exec: vi.fn(async () => ({ rowsAffected: 1 })) as unknown as ExecFnMock,
  orgId: "org-mere",
  role: "ADMIN",
  store: { appConfig: {} } as Record<string, unknown>,
}));

type ExecFnMock = ReturnType<typeof vi.fn> & ExecFn;

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: () => ({ execute: h.exec }),
  getPowerSyncConnector: () => ({}),
  initPowerSync: async () => {},
  disconnectPowerSync: async () => {},
  ON_DEMAND_STREAMS: [],
}));

vi.mock("@/lib/cache", () => ({
  get: async () => null,
  set: async () => {},
  invalidate: () => {},
  clear: () => {},
  asyncGetOrSet: async () => null,
}));

// Store local : exposé à la fois comme hook (`useLocalStore()`) et comme objet
// zustand (`.getState`/`.setState`) car `dataLayer` utilise les deux.
vi.mock("@/store/useLocalStore", () => {
  const fn = (() => h.store) as unknown as {
    (): Record<string, unknown>;
    getState: () => Record<string, unknown>;
    setState: (patch: unknown) => void;
  };
  fn.getState = () => h.store;
  fn.setState = (patch: unknown) => {
    const next =
      typeof patch === "function"
        ? (patch as (s: Record<string, unknown>) => Record<string, unknown>)(h.store)
        : (patch as Record<string, unknown>);
    h.store = { ...h.store, ...next };
  };
  return { useLocalStore: fn };
});

vi.mock("@/lib/auth", () => ({
  authService: {
    getState: () => ({ profile: { id: "u1", role: h.role, org_id: h.orgId } }),
    subscribe: () => () => {},
    updateProfile: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
  },
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => h.orgId,
  hasResolvedOrganization: () => true,
  setOrganizationId: vi.fn(),
  resetOrganizationId: vi.fn(),
  subscribeOrganization: () => () => {},
}));

vi.mock("@/lib/storageService", () => ({
  uploadLuminaFile: vi.fn(async () => "logos/x.png"),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
  },
}));

vi.mock("@/components/SettingsShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

import SettingsPersonalisation from "@/pages/SettingsPersonalisation";
import SettingsTheme from "@/pages/SettingsTheme";
import { useAppConfig } from "@/lib/dataLayer";
import { getStoredThemeId, persistThemeId, type ThemeId } from "@/ionic/themes";
import { buildClosure, computeAncestors, computeDescendants } from "@/lib/orgTree";

const CONFIG_KEY = "lumina-config";
const THEME_KEY = "lumina-theme";

/** Remplit le champ « nom d'organisation » (IonInput rendu en <input> par le mock). */
function setOrgName(value: string) {
  const el = document.getElementById("org-name") as HTMLInputElement;
  fireEvent.change(el, { target: { value } });
}

beforeEach(() => {
  localStorage.clear();
  h.exec.mockClear();
  h.orgId = "org-mere";
  h.role = "ADMIN";
});

afterEach(cleanup);

// ─────────────────────────────────────────────────────────────────────────────
describe("persistance d'une préférence (chemins réels)", () => {
  it("thème : le choix est écrit dans `lumina-theme` via le vrai ThemePicker", () => {
    render(<SettingsTheme />);
    fireEvent.click(screen.getByLabelText("Bleu Confiance"));
    expect(localStorage.getItem(THEME_KEY)).toBe("trust");
  });

  it("nom d'organisation : écrit EN BASE (UPDATE organizations) puis dans `lumina-config`", async () => {
    render(<SettingsPersonalisation />);
    setOrgName("Église Réelle");
    fireEvent.click(screen.getByLabelText("Sauvegarder la personnalisation"));

    await waitFor(() => expect(h.exec).toHaveBeenCalled());
    expect(String(h.exec.mock.calls[0][0])).toMatch(
      /UPDATE organizations SET name = \?/,
    );
    await waitFor(() => {
      const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? "{}");
      expect(cfg.churchName).toBe("Église Réelle");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("restauration au remontage", () => {
  it("thème : la préférence enregistrée est relue (aria-pressed) au remontage", () => {
    render(<SettingsTheme />);
    fireEvent.click(screen.getByLabelText("Bleu Confiance"));
    cleanup();

    render(<SettingsTheme />);
    expect(screen.getByLabelText("Bleu Confiance")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("config : `useAppConfig` relit `lumina-config` au montage (chemin réel)", async () => {
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({ churchName: "Nom Enregistré", churchLogoUrl: "", userPhoto: "" }),
    );
    const { result } = renderHook(() => useAppConfig());
    await waitFor(() => expect(result.current.config.churchName).toBe("Nom Enregistré"));
  });

  it("CARACTÉRISATION (R3) : le champ « nom d'organisation » ne se restaure PAS au remontage (valeur capturée au 1er rendu, jamais resynchronisée)", async () => {
    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify({ churchName: "Nom Enregistré", churchLogoUrl: "", userPhoto: "" }),
    );
    render(<SettingsPersonalisation />);
    const el = document.getElementById("org-name") as HTMLInputElement;
    // Le hook `useAppConfig` charge le storage APRÈS le 1er rendu ; la page a
    // figé `churchName` dans un `useState` initialisé au 1er rendu (vide) et ne
    // resynchronise jamais. Le nom enregistré n'apparaît donc pas.
    await waitFor(() => expect(h.exec).not.toHaveBeenCalled()); // laisse passer l'effet
    expect(el.value).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("isolation entre utilisateurs / organisations", () => {
  it("DÉFAUT (caractérisation) : `lumina-theme` est GLOBAL — le thème d'une org s'applique à l'autre", () => {
    // « org-mere » choisit un thème (clé sans suffixe org/utilisateur).
    persistThemeId("trust" as ThemeId);
    expect(localStorage.getItem(THEME_KEY)).toBe("trust");
    // « org-annexe » (autre contexte) lit la MÊME clé globale : partage.
    h.orgId = "org-annexe";
    expect(getStoredThemeId()).toBe("trust");
    // La clé n'est pas scopée : aucun segment org/utilisateur.
    expect(THEME_KEY).not.toMatch(/org|user|:/);
  });

  it("DÉFAUT (caractérisation) : `lumina-config` est GLOBAL — deux organisations partagent la même préférence", async () => {
    // org A écrit sa config via la couche réelle.
    h.orgId = "org-mere";
    const a = renderHook(() => useAppConfig());
    await act(async () => {
      await a.result.current.updateConfig({ churchName: "Nom de l'org mère" });
    });
    a.unmount();

    // org B (contexte différent) relit la même clé : elle voit la valeur de A.
    h.orgId = "org-annexe";
    const b = renderHook(() => useAppConfig());
    await waitFor(() =>
      expect(b.result.current.config.churchName).toBe("Nom de l'org mère"),
    );
    // Défaut de conception : la préférence n'est pas isolée par org/utilisateur.
    // (L'atténuation existante — purge `ensureLocalDataOwnedBy` au changement de
    // COMPTE — ne scopera pas la clé : même compte, autre org ⇒ même valeur.)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("héritage mère→annexe (caractérisation R3)", () => {
  it("l'arbre mère→annexe existe bien (orgTree) : l'annexe est un descendant de la mère", () => {
    const rows = [
      { id: "org-mere", parentOrgId: null },
      { id: "org-annexe", parentOrgId: "org-mere" },
    ];
    const closure = buildClosure(rows);
    expect(computeDescendants("org-mere", closure).map((e) => e.descendant)).toContain(
      "org-annexe",
    );
    expect(computeAncestors("org-annexe", closure).map((e) => e.ancestor)).toContain(
      "org-mere",
    );
  });

  it("DÉFAUT (caractérisation) : aucune configuration n'est héritée de la mère — l'annexe sans config locale reste vide", async () => {
    // La mère possède une configuration… mais rien ne la propage à l'annexe :
    // la personnalisation est stockée PAR NAVIGATEUR (`lumina-config`), pas par
    // organisation, et aucune requête ne remonte `parent_org_id`.
    h.orgId = "org-annexe";
    const { result } = renderHook(() => useAppConfig());
    await waitFor(() => expect(result.current.config).toBeDefined());
    expect(result.current.config.churchName).toBe("");
  });

  it("preuve : la couche de personnalisation ne référence JAMAIS l'arbre de fédération", () => {
    const configSrc = readFileSync(resolve(__dirname, "../../lib/dataLayer.ts"), "utf8");
    const themeSrc = readFileSync(resolve(__dirname, "../../ionic/themes.ts"), "utf8");
    // La clé de config est bien la clé GLOBALE non scopée…
    expect(configSrc).toMatch(/lumina-config/);
    // …et aucune des deux couches ne lit l'arbre mère→annexe (pas d'héritage).
    for (const src of [configSrc, themeSrc]) {
      expect(src).not.toMatch(/parent_org_id/);
      expect(src).not.toMatch(/org_family|org_descendants/);
    }
  });
});
