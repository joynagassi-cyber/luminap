// @vitest-environment jsdom
/**
 * Défaut MAJEUR — création d'organisation self-serve depuis l'onboarding.
 *
 * Avant correctif, « Créer l'organisation » n'écrivait QUE du localStorage :
 *   - aucun appel serveur (`create_org`) → l'utilisateur restait
 *     `org_id = '__no_org__'` en base, sans grant `org_admins` ;
 *   - aucune résolution du contexte d'organisation ni miroir local ;
 *   - le rôle choisi (cosmétique) était posé tel quel.
 * Résultat : après « création », la garde de route `needs-membership` bloquait
 * le dashboard (écran « Organisation non rejointe ») → application inutilisable.
 *
 * NON-VACUITÉ : retirer l'appel `bootstrapOrganization(...)` (ou le miroir local
 * / `setOrganizationId`) fait échouer ces tests — l'organisation n'existe alors
 * que dans localStorage et aucune preuve d'appartenance n'est écrite.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

// ThemePicker : composant lourd — remplacé par un div neutre.
vi.mock("@/components/ThemePicker", () => ({
  default: () => <div data-testid="theme-picker" />,
}));

vi.mock("@/ionic/themes", () => ({
  LUMINA_THEMES: [{ id: "classic", label: "Classique" }],
  applyTheme: vi.fn(),
}));

// ─── Mocks pilotés par le test ──────────────────────────────────────────────
const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigate };
});

const state = vi.hoisted(() => ({
  bootstrapCalls: [] as any[],
  mirrorCalls: [] as any[],
  selectRoleCalls: [] as any[],
  setOrgCalls: [] as string[],
  bootstrapImpl: null as null | ((input: any) => Promise<any>),
  /** Miroir local des orgs du compte (garde anti-doublon). */
  existingOrgs: null as null | Array<{ orgId: string; name?: string | null; status?: string | null }>,
  /** Profil renvoyé par authService.getState(). */
  profile: { id: "user-1", org_id: "__no_org__" } as { id: string; org_id?: string | null },
}));

vi.mock("@/lib/orgBootstrap", () => ({
  bootstrapOrganization: vi.fn(async (input: any) => {
    state.bootstrapCalls.push(input);
    if (state.bootstrapImpl) return state.bootstrapImpl(input);
    return {
      orgId: "org-created-1",
      name: input.name,
      type: input.type,
      status: "ACTIVE",
      grantId: "grant-created-1",
      role: "ADMIN",
    };
  }),
}));

vi.mock("@/lib/dataLayer", () => ({
  useAppConfig: () => ({ config: { churchName: "" }, updateConfig: vi.fn() }),
  selectRole: vi.fn(async (role: string) => {
    state.selectRoleCalls.push(role);
    return "session-1";
  }),
  mirrorNewOrganizationLocally: vi.fn(async (input: any) => {
    state.mirrorCalls.push(input);
  }),
  findExistingRootOrganization: vi.fn(async () => state.existingOrgs),
}));

vi.mock("@/lib/orgContext", () => ({
  setOrganizationId: vi.fn((id: string) => state.setOrgCalls.push(id)),
  getOrganizationId: () => "__no_org__",
}));

vi.mock("@/lib/auth", () => ({
  authService: {
    getState: () => ({
      profile: state.profile,
      user: { id: state.profile.id },
    }),
    refreshProfile: vi.fn(async () => null),
  },
}));

import OrgSetup from "@/pages/OrgSetup";
import { completeOnboarding } from "@/lib/onboardingState";

function fillAndCreate() {
  fireEvent.change(screen.getByPlaceholderText("Église MFE-JC Centrale"), {
    target: { value: "Église Test Self-Serve" },
  });
  // Type : carte « Église » (1er template).
  fireEvent.click(screen.getAllByText("Église")[0]);
  // Rôle : « Pasteur principal ».
  fireEvent.click(screen.getByText("Pasteur principal"));
  fireEvent.click(screen.getByText("Créer l'organisation"));
}

beforeEach(() => {
  localStorage.clear();
  state.bootstrapCalls = [];
  state.mirrorCalls = [];
  state.selectRoleCalls = [];
  state.setOrgCalls = [];
  state.bootstrapImpl = null;
  state.existingOrgs = [];
  state.profile = { id: "user-1", org_id: "__no_org__" };
  navigate.mockClear();
});
afterEach(() => cleanup());

describe("OrgSetup — création self-serve réellement persistée", () => {
  it("appelle le serveur (create_org) avec le nom et le type canonique", async () => {
    render(
      <MemoryRouter>
        <OrgSetup />
      </MemoryRouter>,
    );
    fillAndCreate();
    await waitFor(() => expect(state.bootstrapCalls.length).toBe(1));
    expect(state.bootstrapCalls[0]).toMatchObject({
      name: "Église Test Self-Serve",
      type: "CHURCH",
    });
  });

  it("résout le contexte local + miroir + rôle ADMIN + navigation dashboard", async () => {
    render(
      <MemoryRouter>
        <OrgSetup />
      </MemoryRouter>,
    );
    fillAndCreate();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true }));

    // Contexte d'organisation posé (mémoire + localStorage).
    expect(state.setOrgCalls).toContain("org-created-1");
    expect(localStorage.getItem("lumina-active-org")).toBe("org-created-1");

    // Miroir local : c'est lui qui rend `canAccessOrganization` vrai tout de
    // suite (garde « needs-membership ») sans attendre le sync.
    expect(state.mirrorCalls.length).toBe(1);
    expect(state.mirrorCalls[0]).toMatchObject({
      orgId: "org-created-1",
      userId: "user-1",
      role: "ADMIN",
      grantId: "grant-created-1",
    });

    // Rôle effectif ADMIN (le créateur administre son organisation).
    expect(state.selectRoleCalls).toContain("ADMIN");
    expect(localStorage.getItem("lumina-role")).toBe("ADMIN");

    // Onboarding marqué terminé.
    expect(localStorage.getItem("lumina-onboarded")).toBe("true");
  });

  it("un échec serveur est VISIBLE (message) et ne navigue pas", async () => {
    state.bootstrapImpl = async () => {
      throw new Error("Admin central requis (aucun grant org_admins actif)");
    };
    render(
      <MemoryRouter>
        <OrgSetup />
      </MemoryRouter>,
    );
    fillAndCreate();
    await waitFor(() =>
      expect(
        screen.getByText("Admin central requis (aucun grant org_admins actif)"),
      ).toBeInTheDocument(),
    );
    expect(navigate).not.toHaveBeenCalled();
  });
});

// Garde anti-dérive : `completeOnboarding` est bien utilisé (pas de raccourci
// localStorage manuel qui divergerait de la source de vérité).
describe("OrgSetup — garde", () => {
  it("completeOnboarding écrit bien les flags lus par le Splash", () => {
    completeOnboarding({ ...({} as any), role: "ADMIN" } as any);
    expect(localStorage.getItem("lumina-onboarded")).toBe("true");
  });
});

// ─── Garde anti-doublon (P0) ────────────────────────────────────────────────
//
// NON-VACUITÉ : ces tests ÉCHOUENT sans le correctif. Avant, `handleCreate`
// appelait TOUJOURS `bootstrapOrganization` → chaque passage au wizard créait
// une nouvelle organisation (1452 ACTIVE mesurées). Retirer l'effet de garde
// (ou la garde dans `handleCreate`) fait réapparaître l'appel serveur et
// l'absence de redirection.
describe("OrgSetup — garde anti-doublon (compte possédant déjà une org)", () => {
  it("redirige vers le dashboard SANS créer d'organisation", async () => {
    state.existingOrgs = [
      { orgId: "org-existante", name: "Église Existante", status: "ACTIVE" },
    ];
    render(
      <MemoryRouter>
        <OrgSetup />
      </MemoryRouter>,
    );
    // Le wizard est court-circuité : aucun appel serveur de création.
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true }),
    );
    expect(state.bootstrapCalls).toHaveLength(0);
    expect(state.mirrorCalls).toHaveLength(0);
    // Contexte posé sur l'organisation EXISTANTE (pas de nouvelle).
    expect(state.setOrgCalls).toContain("org-existante");
  });

  it("affiche le message « continuer avec mon organisation »", async () => {
    state.existingOrgs = [
      { orgId: "org-existante", name: "Église Existante", status: "ACTIVE" },
    ];
    render(
      <MemoryRouter>
        <OrgSetup />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("Continuer avec mon organisation")).toBeInTheDocument(),
    );
    expect(screen.getByText(/déjà une organisation/)).toBeInTheDocument();
  });

  it("un clic sur « Créer l'organisation » ne déclenche AUCUN appel serveur", async () => {
    state.existingOrgs = [
      { orgId: "org-existante", name: "Église Existante", status: "ACTIVE" },
    ];
    render(
      <MemoryRouter>
        <OrgSetup />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("Continuer avec mon organisation")).toBeInTheDocument(),
    );
    navigate.mockClear();
    fillAndCreate();
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true }),
    );
    expect(state.bootstrapCalls).toHaveLength(0);
  });

  it("le self-serve NEUF (aucune org) crée bien sa première organisation", async () => {
    state.existingOrgs = []; // miroir vide = compte sans organisation
    render(
      <MemoryRouter>
        <OrgSetup />
      </MemoryRouter>,
    );
    fillAndCreate();
    await waitFor(() => expect(state.bootstrapCalls.length).toBe(1));
    expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true });
  });

  it("repli sur le profil quand le miroir est indisponible (null)", async () => {
    state.existingOrgs = null; // réplique PowerSync indisponible
    state.profile = { id: "user-1", org_id: "org-profil" };
    render(
      <MemoryRouter>
        <OrgSetup />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/dashboard", { replace: true }),
    );
    expect(state.bootstrapCalls).toHaveLength(0);
    expect(state.setOrgCalls).toContain("org-profil");
  });

  it("une org ARCHIVED ne bloque pas (le compte peut repartir de zéro)", async () => {
    state.existingOrgs = [
      { orgId: "org-archivee", name: "Ancienne", status: "ARCHIVED" },
    ];
    render(
      <MemoryRouter>
        <OrgSetup />
      </MemoryRouter>,
    );
    fillAndCreate();
    await waitFor(() => expect(state.bootstrapCalls.length).toBe(1));
  });
});

