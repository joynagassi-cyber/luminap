/**
 * Integration tests verifying that the cotisation payment pages enforce
 * policy.cotisation.validateAmount before calling the store / capability layer.
 *
 * Mocking:
 *  - @/store/useLocalStore  : markCotisationPaid / markCotisationsAbsent spys
 *  - @/lib/dataLayer        : useEvents / useMembers / useCotisations / ...
 *  - react-router-dom       : useParams / useNavigate
 *  - @ionic/react / lucide-react : shallow wrappers (same pattern as
 *                                core-components.test.tsx)
 *  - policy module          : real — we spy on validateAmount to prove it's
 *                            called; the page's business-rule check is the
 *                            subject under test.
 *
 * No source files are modified.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { policy } from "@/capabilities/policy";

type StoreState = Record<string, unknown> & {
  markCotisationPaid: ReturnType<typeof vi.fn>;
  markCotisationsAbsent: ReturnType<typeof vi.fn>;
};

(globalThis as Record<string, unknown>).__cotStoreState = {
  markCotisationPaid: vi.fn(async () => {}),
  markCotisationsAbsent: vi.fn(async () => {}),
} as unknown as StoreState;

(globalThis as Record<string, unknown>).__cotNavigateRef = {
  fn: vi.fn() as ReturnType<typeof vi.fn>,
};

(globalThis as Record<string, unknown>).__cotParams = { id: "ev-1" } as Record<string, string>;

(globalThis as Record<string, unknown>).__cotDataLayer = {
  events: [] as unknown[],
  members: [] as unknown[],
  cotisations: [] as unknown[],
  transactions: [] as unknown[],
  caisses: [] as unknown[],
  categories: [] as unknown[],
  currentUser: null as unknown,
  organizations: [] as unknown[],
};

// ─── vi.mock blocks ───────────────────────────────────────────────────────────

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: ((selector?: (s: StoreState) => unknown) => {
    const state = (globalThis as Record<string, unknown>).__cotStoreState as StoreState;
    return selector ? selector(state) : state;
  }) as unknown as typeof import("@/store/useLocalStore").useLocalStore,
}));

vi.mock("@/lib/dataLayer", () => ({
  useEvents: () => ({ data: (globalThis as Record<string, unknown>).__cotDataLayer.events }),
  useMembers: () => ({ data: (globalThis as Record<string, unknown>).__cotDataLayer.members }),
  useCotisations: () => ({ data: (globalThis as Record<string, unknown>).__cotDataLayer.cotisations }),
  useTransactions: () => ({ data: (globalThis as Record<string, unknown>).__cotDataLayer.transactions }),
  useCaisses: () => ({ data: (globalThis as Record<string, unknown>).__cotDataLayer.caisses }),
  useCategories: () => ({ data: (globalThis as Record<string, unknown>).__cotDataLayer.categories }),
  useCurrentUser: () => (globalThis as Record<string, unknown>).__cotDataLayer.currentUser,
  useOrganizations: () => ({ data: (globalThis as Record<string, unknown>).__cotDataLayer.organizations }),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "test-org",
  setOrganizationId: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useParams: () => (globalThis as Record<string, unknown>).__cotParams as any,
  useNavigate: () => (globalThis as Record<string, unknown>).__cotNavigateRef.fn,
}));

vi.mock("@ionic/react", () => {
  function makeWrapper(tag: string, props: Record<string, unknown>, children: unknown[]) {
    if (tag === "ion-button") {
      const { onClick, disabled, ...rest } = props as Record<string, unknown>;
      return React.createElement("button", { type: "button", onClick, disabled, ...rest }, children);
    }
    // ion-input: wrap the DOM input so onIonChange fires with { detail: { value } }
    // (matching Ionic's real event shape) rather than the plain DOM Event.
    if (tag === "ion-input") {
      const { onIonChange, onChange, ...rest } = props as Record<string, unknown>;
      return React.createElement("input", {
        ...rest,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          if (onIonChange) {
            onIonChange({
              detail: { value: e.target.value },
              currentTarget: e.currentTarget,
              target: e.target,
            } as any);
          }
          if (onChange) onChange(e);
        },
      });
    }
    return React.createElement("div", { ...props }, children);
  }
  return {
    IonPage: (p: any) => React.createElement("div", p, p.children),
    IonHeader: (p: any) => makeWrapper("ion-header", p, [p.children]),
    IonContent: (p: any) => makeWrapper("ion-content", p, [p.children]),
    IonTitle: (p: any) => makeWrapper("ion-title", p, [p.children]),
    IonToolbar: (p: any) => makeWrapper("ion-toolbar", p, [p.children]),
    IonButtons: (p: any) => makeWrapper("ion-buttons", p, [p.children]),
    IonBackButton: (p: any) => makeWrapper("ion-back-button", p, []),
    IonButton: (p: any) => makeWrapper("ion-button", p, [p.children]),
    IonInput: (p: any) => makeWrapper("ion-input", p, []),
  };
});

vi.mock("lucide-react", () => {
  const makeIcon = (name: string) =>
    function Icon({ className }: { className?: string }) {
      return React.createElement("svg", { "data-icon": name, className });
    };
  return {
    ArrowLeft: makeIcon("ArrowLeft"),
    CheckCircle: makeIcon("CheckCircle"),
    Clock: makeIcon("Clock"),
    Plus: makeIcon("Plus"),
    X: makeIcon("X"),
    Coins: makeIcon("Coins"),
  };
});

vi.mock("@/components/TopHeader", () => ({
  default: (props: { title?: string }) => React.createElement("div", { "data-testid": "top-header" }, props.title),
}));
vi.mock("@/components/BottomNav", () => ({
  default: () => React.createElement("div", { "data-testid": "bottom-nav" }),
}));

// ─── Imports under test (after hoisted mocks) ────────────────────────────────

import SaisieRapide from "@/pages/SaisieRapide";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setEvents(events: unknown[]) {
  (globalThis as Record<string, unknown>).__cotDataLayer.events = events;
}

function setMembers(members: unknown[]) {
  (globalThis as Record<string, unknown>).__cotDataLayer.members = members;
}

function setCotisations(cots: unknown[]) {
  (globalThis as Record<string, unknown>).__cotDataLayer.cotisations = cots;
}

function navigateRef(): ReturnType<typeof vi.fn> {
  return (globalThis as Record<string, unknown>).__cotNavigateRef.fn;
}

function storeState(): StoreState {
  return (globalThis as Record<string, unknown>).__cotStoreState as StoreState;
}

function resetState() {
  vi.mocked(storeState().markCotisationPaid).mockClear();
  vi.mocked(storeState().markCotisationsAbsent).mockClear();
  navigateRef().mockClear();
}

function makeCot(overrides: Record<string, unknown> = {}) {
  return {
    id: "cot-1",
    culte_id: "ev-1",
    membre_id: "mem-1",
    statut: "NON_PAYE",
    montantObligatoire: 5000,
    montantPaye: 0,
    ...overrides,
  };
}

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: "mem-1",
    last_name: "Diallo",
    first_name: "Awa",
    ...overrides,
  };
}

function makeCulte(overrides: Record<string, unknown> = {}) {
  return {
    id: "ev-1",
    name: "Culte dimanche",
    start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

// ─── SaisieRapide ─────────────────────────────────────────────────────────────

describe("SaisieRapide — policy wiring", () => {
  beforeEach(() => {
    resetState();
    setEvents([makeCulte()]);
    setMembers([makeMember()]);
  });

  it("rejects a 0-cent payment via policy before calling markCotisationPaid", async () => {
    // Set montantObligatoire = 0 so the default Pay amount is 0 cents.
    setCotisations([makeCot({ montantObligatoire: 0 })]);

    const validateSpy = vi.spyOn(policy.cotisation, "validateAmount");

    render(React.createElement(SaisieRapide));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // The "Payé" button inside the first (and only) card.
    const payBtn = document.querySelectorAll("button")[0] as HTMLButtonElement;
    expect(payBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(payBtn);
    });

    // policy.validateAmount was invoked with the 0 amount.
    expect(validateSpy).toHaveBeenCalledWith(0);
    // markCotisationPaid was NOT called (policy rejected it early).
    expect(vi.mocked(storeState().markCotisationPaid)).not.toHaveBeenCalled();
    // The error banner surfaces the policy message.
    expect(screen.getByText(/1 FCFA/)).toBeInTheDocument();

    validateSpy.mockRestore();
  });

  it("calls markCotisationPaid when policy validates OK", async () => {
    // Set montantObligatoire = 0 so the default Pay button would pass 0.
    setCotisations([makeCot({ montantObligatoire: 0 })]);

    const validateSpy = vi.spyOn(policy.cotisation, "validateAmount");
    // Override to always accept so we can verify the store is reached.
    validateSpy.mockReturnValue({ ok: true });

    render(React.createElement(SaisieRapide));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const payBtn = document.querySelectorAll("button")[0] as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(payBtn);
    });

    // policy.validateAmount was invoked (gate exercised).
    expect(validateSpy).toHaveBeenCalledWith(0);
    // Because policy said OK, markCotisationPaid proceeds.
    expect(vi.mocked(storeState().markCotisationPaid)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(storeState().markCotisationPaid).mock.calls[0][0]).toBe("cot-1");
    // No error banner.
    expect(screen.queryByText(/1 FCFA/)).not.toBeInTheDocument();

    validateSpy.mockRestore();
  });
});
