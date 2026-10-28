// @vitest-environment jsdom
/**
 * Accessibilité automatisée — écrans prioritaires (contrat Phase 10, §5.1).
 *
 * Objectif mesurable : rendre l'a11y **vérifiée automatiquement** sur les
 * écrans principaux (`/splash`, `/auth`, `/dashboard`, `/members`, `/finance`,
 * `/forms`) SANS nouvelle dépendance. On teste des invariants solides qui
 * échouent dès qu'ils sont violés :
 *
 *   1. Chaque écran expose un `data-screen-state` valide (catalogue §5.1) —
 *      analogue à la garde d'inventaire RLS de la Phase 8.
 *   2. Chaque écran expose un titre de niveau 1 (`<h1>`) unique et non vide
 *      (repère de navigation WCAG 2.4.1 / structure de titres).
 *   3. Chaque champ de formulaire visible a un nom accessible (`aria-label`,
 *      `aria-labelledby`, `<label for>` ou texte de label englobant).
 *   4. Chaque bouton visible a un nom accessible (texte, `aria-label`, ou
 *      `aria-labelledby`).
 *   5. Chaque `<img>` a un attribut `alt` (vide = décoratif assumé).
 *
 * Les tests échouent sans le correctif : les `data-screen-state` des écrans
 * prioritaires et les `aria-label` manquants ont été ajoutés dans le même
 * commit.
 *
 * Les composants Ionic sont remplacés par le mock HTML partagé (`ion-input` →
 * `<input>`, etc.) : les champs deviennent des éléments réellement présents
 * dans l'arbre accessible, ce qui permet d'exiger un nom accessible.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";

// ─── Ionic → HTML (noms accessibles observables) ──────────────────────────
vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

// ─── dataLayer : hooks synchrones, données vides (états « vide »/« prêt ») ─
vi.mock("@/lib/dataLayer", () => ({
  useTransactions: () => ({ data: [], isLoading: false }),
  useEvents: () => ({ data: [], isLoading: false }),
  useMembers: () => ({ data: [], isLoading: false, error: undefined, retry: vi.fn() }),
  useGroups: () => ({ data: [], isLoading: false }),
  useCaisses: () => ({ data: [], isLoading: false }),
  useAccounts: () => ({ data: [], isLoading: false }),
  useCategories: () => ({ data: [], isLoading: false }),
  useNotifications: () => ({ data: [], isLoading: false }),
  useReportsReceived: () => ({ data: [], isLoading: false }),
  useOrganizations: () => ({ data: [], isLoading: false }),
  useVersements: () => ({ data: [], isLoading: false }),
  useCotisations: () => ({ data: [], isLoading: false }),
  useOrgUnits: () => ({ data: [], isLoading: false }),
  useBudgetLines: () => ({ data: [], isLoading: false }),
  useEventBudgets: () => ({ data: [], isLoading: false }),
  useAuditEntries: () => ({ data: [], isLoading: false }),
  useCurrentUser: () => ({
    id: "user-1",
    email: "u@example.com",
    firstName: "Test",
    lastName: "User",
    role: "TREASURIER",
    org: { id: "org-1", name: "Lumina", type: "Église", accentColor: "#FF6B00" },
  }),
  useAppConfig: () => ({
    config: { churchName: "Lumina", churchLogoUrl: "", userPhoto: "" },
    updateConfig: vi.fn(async () => undefined),
  }),
  usePowerSyncStatus: () => true,
  useLoadInitialData: () => ({ loaded: true }),
  markReportRead: vi.fn(async () => undefined),
  parseBudgetItems: () => [],
  addMemberPS: vi.fn(async () => undefined),
  isPowerSyncReadyNow: () => true,
}));

vi.mock("@/lib/auth", () => ({
  authService: {
    getSession: vi.fn(async () => null),
    getState: () => ({ session: null, user: null }),
    subscribe: vi.fn(() => () => undefined),
    hydrateProfile: vi.fn(async () => undefined),
  },
  useAuth: () => ({ getState: () => ({ profile: null }) }),
}));

vi.mock("@/lib/authOneSignal", () => ({
  oneSignalService: { login: vi.fn(async () => undefined) },
}));

vi.mock("@/lib/onboardingState", () => ({
  needsOnboarding: () => false,
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: (sel: (s: unknown) => unknown) =>
    sel({ loadInitialData: vi.fn(async () => undefined), auditEntries: [] }),
}));

vi.mock("@/hooks/useKeyboardAvoidance", () => ({
  useKeyboardAvoidance: () => 0,
}));

vi.mock("@/hooks/useAppUrlOpen", () => ({
  LUMINA_DEEPLINK_EVENT: "lumina:deeplink",
  useAppUrlOpen: () => undefined,
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
}));

vi.mock("@/lib/organization-context", () => ({
  useOrganizationContext: () => ({ mode: "ORG", orgId: "org-1", label: "Lumina" }),
  useMyOrgs: () => ({ data: [], refetch: vi.fn() }),
  enterOrganization: vi.fn(async () => ({ mode: "ORG", orgId: "org-1", label: "Lumina" })),
  exitToCentral: vi.fn(),
  resolveCurrentUserId: () => "user-1",
}));

vi.mock("@/lib/hooks/usePowerSyncIndicator", () => ({
  usePowerSyncIndicator: () => ({
    online: true,
    lastSyncAt: null,
    syncing: false,
    syncError: null,
  }),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
}));

vi.mock("@/capabilities/resource", () => ({
  resource: {
    list: vi.fn(async () => ({ items: [] })),
    listArchived: vi.fn(async () => ({ items: [] })),
  },
}));

vi.mock("@/capabilities/lifecycle", () => ({
  lifecycle: { archive: vi.fn(), restore: vi.fn() },
}));

vi.mock("@/capabilities/workflow", () => ({
  workflow: { check: () => ({ allowed: true }) },
}));

vi.mock("@/lib/formSystem", () => ({
  formDefinitionRepo: {
    // Un formulaire DRAFT porteur d'un champ : le banc a11y couvre ainsi les
    // boutons d'édition de champ (obligatoire / supprimer), pas seulement
    // l'état vide de la page.
    list: vi.fn(async () => [
      {
        id: "form-1",
        orgId: "org-1",
        key: "demande_cotisation",
        name: "Demande de cotisation",
        description: "Cotisation mensuelle",
        version: 1,
        targetEntityType: null,
        status: "DRAFT",
        fields: [
          { key: "nom", label: "Nom du membre", type: "text", required: true, order: 0 },
        ],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]),
    create: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
  },
}));

vi.mock("@/utils/toast", () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock("@/components/GoogleButton", () => ({
  default: ({ onClick }: { onClick?: () => void }) => (
    <button type="button" aria-label="Continuer avec Google" onClick={onClick}>
      Continuer avec Google
    </button>
  ),
}));

// Sous-composants lourds (recharts) ou redondants pour l'inventaire a11y.
vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title?: string }) => <div>{title}</div>,
}));
vi.mock("@/components/CapabilityBanner", () => ({ default: () => null }));
vi.mock("@/components/TrendChart", () => ({ default: () => null }));
vi.mock("@/components/OrgSwitcher", () => ({ default: () => null }));
vi.mock("@/components/DashboardOnboarding", () => ({ default: () => null }));

import Splash from "@/pages/Splash";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import MembersPage from "@/pages/Members";
import Finance from "@/pages/Finance";
import FormBuilder from "@/pages/FormBuilder";
import Help from "@/pages/Help";
import Notifications from "@/pages/Notifications";

const VALID_STATES = new Set([
  "loading",
  "ready",
  "empty",
  "error",
  "offline",
  "syncing",
  "forbidden",
  "notfound",
  "partial",
  "success",
  "destructive-confirm",
]);

afterEach(() => {
  cleanup();
});

function renderScreen(node: ReactElement) {
  return render(<MemoryRouter initialEntries={["/"]}>{node}</MemoryRouter>);
}

/** Contrôles de formulaire « nus » (ceux qui exigent un nom accessible). */
function formControls(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>("input, textarea, select"),
  ).filter((el) => {
    const type = (el as HTMLInputElement).type;
    return type !== "hidden" && type !== "checkbox" && type !== "radio";
  });
}

function accessibleName(el: HTMLElement): string {
  const aria = el.getAttribute("aria-label");
  if (aria && aria.trim()) return aria.trim();
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const target = document.getElementById(labelledby);
    if (target?.textContent?.trim()) return target.textContent.trim();
  }
  const id = el.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }
  const wrapping = el.closest("label");
  if (wrapping?.textContent?.trim()) return wrapping.textContent.trim();
  return "";
}

function accessibleButtonName(btn: HTMLElement): string {
  const aria = btn.getAttribute("aria-label");
  if (aria && aria.trim()) return aria.trim();
  const labelledby = btn.getAttribute("aria-labelledby");
  if (labelledby) {
    const target = document.getElementById(labelledby);
    if (target?.textContent?.trim()) return target.textContent.trim();
  }
  return (btn.textContent ?? "").trim();
}

/** Assertions a11y communes — échouent si l'invariant est violé. */
function expectScreenA11y(container: HTMLElement, screenName: string) {
  // 1. data-screen-state valide (§5.1)
  const markers = Array.from(
    container.querySelectorAll("[data-screen-state]"),
  );
  expect(
    markers.length,
    `${screenName} : aucun data-screen-state (catalogue §5.1)`,
  ).toBeGreaterThan(0);
  for (const m of markers) {
    expect(
      VALID_STATES.has(m.getAttribute("data-screen-state") ?? ""),
      `${screenName} : data-screen-state invalide « ${m.getAttribute("data-screen-state")} »`,
    ).toBe(true);
  }

  // 2. Un seul <h1>, non vide
  const h1s = Array.from(container.querySelectorAll("h1"));
  expect(h1s.length, `${screenName} : attendu exactement un <h1>`).toBe(1);
  expect(
    h1s[0].textContent?.trim().length ?? 0,
    `${screenName} : <h1> vide`,
  ).toBeGreaterThan(0);

  // 3. Champs de formulaire nommés
  for (const field of formControls(container)) {
    expect(
      accessibleName(field),
      `${screenName} : champ sans nom accessible (${field.outerHTML.slice(0, 80)})`,
    ).not.toBe("");
  }

  // 4. Boutons nommés
  for (const btn of Array.from(container.querySelectorAll("button"))) {
    expect(
      accessibleButtonName(btn),
      `${screenName} : bouton sans nom accessible (${btn.outerHTML.slice(0, 80)})`,
    ).not.toBe("");
  }

  // 5. Images décoratives ou nommées
  for (const img of Array.from(container.querySelectorAll("img"))) {
    expect(
      img.hasAttribute("alt"),
      `${screenName} : <img> sans attribut alt (${img.getAttribute("src")})`,
    ).toBe(true);
  }
}

const SCREENS: { name: string; route: string; render: () => ReactElement }[] = [
  { name: "/splash", route: "/splash", render: () => <Splash /> },
  { name: "/auth", route: "/auth", render: () => <AuthPage /> },
  { name: "/dashboard", route: "/dashboard", render: () => <Dashboard /> },
  { name: "/members", route: "/members", render: () => <MembersPage /> },
  { name: "/finance", route: "/finance", render: () => <Finance /> },
  { name: "/forms", route: "/forms", render: () => <FormBuilder /> },
  { name: "/help", route: "/help", render: () => <Help /> },
  { name: "/notifications", route: "/notifications", render: () => <Notifications /> },
];

describe("a11y — écrans prioritaires (invariants §5.1 + WCAG)", () => {
  for (const { name, render: renderScreenFn } of SCREENS) {
    it(`${name} — data-screen-state, <h1>, labels, boutons, alt`, async () => {
      const { container } = renderScreen(renderScreenFn());
      // Certains écrans démarrent en « loading » (skeleton sans titre) puis
      // basculent en « ready » quand la ressource résout. On verrouille
      // l'état PRÊT (le seul qui doit porter un <h1> et des contrôles nommés).
      await waitFor(() =>
        expect(
          container.querySelector('[data-screen-state="ready"]'),
          `${name} : jamais passé à l'état « ready »`,
        ).not.toBeNull(),
      );
      expectScreenA11y(container, name);
    });
  }

  it("/forms — modale d'édition de champ : tous les contrôles nommés", async () => {
    const { container } = renderScreen(<FormBuilder />);
    // Ouvre la modale d'édition du formulaire DRAFT (fixture) → rend l'éditeur
    // de champs (libellé, type, conditionnel, regex, mappage…).
    const editBtn = await screen.findByRole("button", { name: "Modifier" });
    fireEvent.click(editBtn);
    await waitFor(() =>
      expect(container.querySelector('[data-screen-state="ready"]')).not.toBeNull(),
    );
    expectScreenA11y(container, "/forms (modale)");
  });
});

describe("a11y — les assertions détectent réellement les violations", () => {
  it("un écran sans data-screen-state est refusé", () => {
    const { container } = renderScreen(
      <div>
        <h1>Écran</h1>
      </div>,
    );
    expect(() => expectScreenA11y(container, "écran factice")).toThrow(
      /data-screen-state/,
    );
  });

  it("un écran sans <h1> est refusé", () => {
    const { container } = renderScreen(
      <div data-screen-state="ready">
        <p>Contenu sans titre</p>
      </div>,
    );
    expect(() => expectScreenA11y(container, "écran factice")).toThrow(/h1/);
  });

  it("un bouton sans nom accessible est refusé", () => {
    const { container } = renderScreen(
      <div data-screen-state="ready">
        <h1>Titre</h1>
        <button type="button">
          <svg aria-hidden="true" />
        </button>
      </div>,
    );
    expect(() => expectScreenA11y(container, "écran factice")).toThrow(
      /bouton sans nom/,
    );
  });

  it("un champ sans nom accessible est refusé", () => {
    const { container } = renderScreen(
      <div data-screen-state="ready">
        <h1>Titre</h1>
        <input type="text" />
      </div>,
    );
    expect(() => expectScreenA11y(container, "écran factice")).toThrow(
      /champ sans nom/,
    );
  });
});
