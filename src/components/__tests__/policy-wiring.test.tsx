// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ─── Mutables read by mock factories at call time ──────────────────────────
(globalThis as Record<string, unknown>).__sharedNavigate = vi.fn();
(globalThis as Record<string, unknown>).__locationRef = { pathname: "/", search: "" };
(globalThis as Record<string, unknown>).__luminaThemes = [
  { id: "fire", name: "Orange Fire", primary: "#FF6B00", light: "#FF8533", dark: "#CC5500", inspiration: "communauté" },
];

// ─── Mock lucide-react icons (explicit names + default) ──────────────────
vi.mock("lucide-react", () => {
  const makeIcon = (name: string) => {
    const C = ({ className }: { className?: string }) => (
      <svg className={className} data-icon={name} />
    );
    C.displayName = name;
    return C;
  };
  const names = [
    "Plus", "Check", "Clock", "X", "Coins",
    "ArrowLeft", "CheckCircle", "Calendar",
    "ArrowUpRight", "ArrowDownRight", "User",
    "AlertCircle", "Wallet", "RefreshCw",
  ];
  const mod: Record<string, unknown> = {};
  for (const n of names) mod[n] = makeIcon(n);
  mod.default = { ...mod, Sparkles: makeIcon("Sparkles") };
  return mod;
});

// ─── Mock TopHeader / BottomNav ────────────────────────────────────────────
vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));
vi.mock("@/components/BottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

// ─── Mock @ionic/react ────────────────────────────────────────────────────
vi.mock("@ionic/react", () => {
  function makeWrapper(tag: string, props: Record<string, unknown>, children: React.ReactNode[]) {
    if (tag === "ion-button") {
      const { onClick, ...rest } = props;
      return <button type="button" onClick={onClick as (() => void) | undefined} {...rest}>{children}</button>;
    }
    return <div {...props}>{children}</div>;
  }
  return {
    IonPage: ({ children, ...props }: any) => makeWrapper("ion-page", props, [children]),
    IonHeader: ({ children, ...props }: any) => makeWrapper("ion-header", props, [children]),
    IonContent: ({ children, ...props }: any) => makeWrapper("ion-content", props, [children]),
    IonTitle: ({ children, ...props }: any) => makeWrapper("ion-title", props, [children]),
    IonToolbar: ({ children, ...props }: any) => makeWrapper("ion-toolbar", props, [children]),
    IonButtons: ({ children, ...props }: any) => makeWrapper("ion-buttons", props, [children]),
    IonBackButton: () => <button data-testid="back-button">back</button>,
    IonButton: ({ children, ...props }: any) => makeWrapper("ion-button", props, [children]),
    IonInput: ({ value, onIonChange, ...props }: any) => (
      <input
        data-testid="ion-input"
        value={value}
        onChange={(e: any) => onIonChange?.({ detail: { value: e.target.value } })}
        {...props}
      />
    ),
  };
});

// ─── Mock react-router-dom (useParams is reactive per-route) ───────────────
let _params: Record<string, string> = {};
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: vi.fn(() => _params),
    useNavigate: () => (globalThis as Record<string, unknown>).__sharedNavigate,
    useLocation: vi.fn(() => (globalThis as Record<string, unknown>).__locationRef),
  };
});

// ─── Mock dataLayer ────────────────────────────────────────────────────────
const {
  mockMarkCotisationPaid,
  mockCollectCotisation,
  mockCreateCotisationSession,
  mockAddTransactionPS,
  mockUpdateTransactionPS,
  mockCreateVersement,
} = vi.hoisted(() => ({
  mockMarkCotisationPaid: vi.fn(async () => {}),
  mockCollectCotisation: vi.fn(async () => {}),
  mockCreateCotisationSession: vi.fn(async () => ({ event: { id: "e1" } })),
  mockAddTransactionPS: vi.fn(async () => {}),
  mockUpdateTransactionPS: vi.fn(async () => {}),
  mockCreateVersement: vi.fn(async () => {}),
}));

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: vi.fn(() => ({ id: "user-1", role: "ADMIN" })),
  useGroups: vi.fn(() => ({ data: [{ id: "g1", name: "Test Group" }] })),
  useGroupMemberships: vi.fn(() => ({ data: [] })),
  useMembers: vi.fn(() => ({ data: [] })),
  useEvents: vi.fn(() => ({ data: [] })),
  useCotisations: vi.fn(() => ({ data: [] })),
  useCaisses: vi.fn(() => ({ data: [{ id: "c1", name: "Main" }] })),
  useAccounts: vi.fn(() => ({ data: [{ id: "c1", name: "Main", owner_type: "GROUP", status: "ACTIVE" }] })),
  useTransactions: vi.fn(() => ({ data: [] })),
  useCategories: vi.fn(() => ({ data: [] })),
  useOrgUnits: vi.fn(() => ({ data: [] })),
  addTransactionPS: mockAddTransactionPS,
  updateTransactionPS: mockUpdateTransactionPS,
  createVersement: mockCreateVersement,
  markCotisationPaid: mockMarkCotisationPaid,
  collectCotisation: mockCollectCotisation,
  createCotisationSession: mockCreateCotisationSession,
}));

// ─── Mock orgContext ───────────────────────────────────────────────────────
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
}));

// ─── Mock useLocalStore for SaisieRapide ──────────────────────────────────
const mockMarkCotisationPaidFromStore = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/store/useLocalStore", () => {
  const useLocalStore = vi.fn((selector: (s: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = {
      markCotisationPaid: mockMarkCotisationPaidFromStore,
    };
    return selector(state);
  });
  useLocalStore.getState = () => ({
    markCotisationPaid: mockMarkCotisationPaidFromStore,
    markCotisationsAbsent: vi.fn(async () => {}),
  });
  return { useLocalStore };
});

// ─── Mock policy module ───────────────────────────────────────────────────
const {
  mockCotisationValidateAmount,
  mockTransactionValidateAmount,
  mockVersementCheckBalance,
} = vi.hoisted(() => ({
  mockCotisationValidateAmount: vi.fn((cents: number) => {
    if (cents < 100) {
      return { ok: false, rule: "COTISATION_MIN_AMOUNT", message: "Le montant doit etre d'au moins 1 FCFA" };
    }
    return { ok: true };
  }),
  mockTransactionValidateAmount: vi.fn((cents: number) => {
    if (cents <= 0) {
      return { ok: false, rule: "TRANSACTION_POSITIVE_AMOUNT", message: "Le montant doit etre superieur a 0" };
    }
    return { ok: true };
  }),
  mockVersementCheckBalance: vi.fn(
    ({ balanceCents, amountCents }: { balanceCents: number; amountCents: number }) => {
      if (amountCents <= 0) {
        return { ok: false, rule: "VERSEMENT_POSITIVE_AMOUNT", message: "Le montant doit etre superieur a 0" };
      }
      if (amountCents > balanceCents) {
        return { ok: false, rule: "VERSEMENT_INSUFFICIENT_BALANCE", message: "Solde insuffisant pour ce versement" };
      }
      return { ok: true };
    },
  ),
}));

vi.mock("@/capabilities/policy", () => ({
  policy: {
    cotisation: {
      validateAmount: mockCotisationValidateAmount,
      canModify: () => ({ ok: true }),
    },
    transaction: {
      validateAmount: mockTransactionValidateAmount,
      canEdit: () => ({ ok: true }),
    },
    versement: {
      checkBalance: mockVersementCheckBalance,
      validateAtomic: () => ({ ok: true }),
    },
  },
}));

// Import pages after mocks
import GroupCotisation from "@/pages/GroupCotisation";
import SaisieRapide from "@/pages/SaisieRapide";
import TransactionNew from "@/pages/TransactionNew";
import TransactionEdit from "@/pages/TransactionEdit";
import Versement from "@/pages/Versement";
import {
  useCurrentUser,
  useGroups,
  useGroupMemberships,
  useMembers,
  useEvents,
  useCotisations,
  useCaisses,
  useAccounts,
  useTransactions,
  useCategories,
  useOrgUnits,
} from "@/lib/dataLayer";

describe("Policy wiring in pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _params = {};
    (globalThis as Record<string, unknown>).__sharedNavigate = vi.fn();
    vi.mocked(useCurrentUser).mockReturnValue({ id: "user-1", role: "ADMIN" });
    vi.mocked(useGroups).mockReturnValue({ data: [{ id: "g1", name: "Test Group" }] });
    vi.mocked(useGroupMemberships).mockReturnValue({ data: [] });
    vi.mocked(useMembers).mockReturnValue({ data: [] });
    vi.mocked(useEvents).mockReturnValue({ data: [] });
    vi.mocked(useCotisations).mockReturnValue({ data: [] });
    vi.mocked(useCaisses).mockReturnValue({ data: [{ id: "c1", name: "Main" }] });
    vi.mocked(useAccounts).mockReturnValue({ data: [{ id: "c1", name: "Main", owner_type: "GROUP", status: "ACTIVE" }] });
    vi.mocked(useTransactions).mockReturnValue({ data: [] });
    vi.mocked(useCategories).mockReturnValue({ data: [] });
    vi.mocked(useOrgUnits).mockReturnValue({ data: [] });
  });

  // ─── GroupCotisation ────────────────────────────────────────────────────
  describe("GroupCotisation page", () => {
    it("blocks creation when amount is below policy minimum", async () => {
      _params = { id: "g1" };
      render(
        <MemoryRouter initialEntries={["/groups/g1/cotisation"]}>
          <Routes>
            <Route path="/groups/:id/cotisation" element={<GroupCotisation />} />
          </Routes>
        </MemoryRouter>,
      );

      const newBtn = screen.getByText(/Nouvelle cotisation/i);
      await act(async () => { fireEvent.click(newBtn); });

      const amountInputs = screen.getAllByTestId("ion-input");
      const amountInput = amountInputs[amountInputs.length - 1] as HTMLInputElement;
      await act(async () => { fireEvent.change(amountInput, { target: { value: "0.5" } }); });

      const createBtn = screen.getByText(/Créer la session/i);
      await act(async () => { fireEvent.click(createBtn); });

      await waitFor(() => {
        expect(mockCotisationValidateAmount).toHaveBeenCalledWith(50);
      });
      await waitFor(() => {
        expect(screen.getByText(/Le montant doit etre d'au moins 1 FCFA/i)).toBeInTheDocument();
      });
    });

    it("allows creation when amount meets policy threshold", async () => {
      _params = { id: "g1" };
      render(
        <MemoryRouter initialEntries={["/groups/g1/cotisation"]}>
          <Routes>
            <Route path="/groups/:id/cotisation" element={<GroupCotisation />} />
          </Routes>
        </MemoryRouter>,
      );

      const newBtn = screen.getByText(/Nouvelle cotisation/i);
      await act(async () => { fireEvent.click(newBtn); });

      const amountInputs = screen.getAllByTestId("ion-input");
      const amountInput = amountInputs[amountInputs.length - 1] as HTMLInputElement;
      await act(async () => { fireEvent.change(amountInput, { target: { value: "2000" } }); });

      const createBtn = screen.getByText(/Créer la session/i);
      await act(async () => { fireEvent.click(createBtn); });

      await waitFor(() => {
        expect(mockCotisationValidateAmount).toHaveBeenCalledWith(200000);
      });
    });
  });

  // ─── SaisieRapide ────────────────────────────────────────────────────────
  describe("SaisieRapide page", () => {
    it("blocks payment when amount is below policy minimum", async () => {
      _params = { id: "e1" };
      vi.mocked(useEvents).mockReturnValue({
        data: [{ id: "e1", name: "Test Culte", start_date: "2026-09-01" }],
      });
      vi.mocked(useCotisations).mockReturnValue({
        data: [
          { id: "cot-1", culte_id: "e1", membre_id: "m1", statut: "NON_PAYE", montantObligatoire: 500000 },
        ],
      });
      vi.mocked(useMembers).mockReturnValue({
        data: [{ id: "m1", last_name: "张", first_name: "三" }],
      });

      render(
        <MemoryRouter initialEntries={["/saisie-rapide/e1"]}>
          <Routes>
            <Route path="/saisie-rapide/:id" element={<SaisieRapide />} />
          </Routes>
        </MemoryRouter>,
      );

      const amountInput = screen.getByTestId("ion-input") as HTMLInputElement;
      await act(async () => { fireEvent.change(amountInput, { target: { value: "0.5" } }); });

      const payBtn = screen.getByText(/Payé/i);
      await act(async () => { fireEvent.click(payBtn); });

      await waitFor(() => {
        expect(mockCotisationValidateAmount).toHaveBeenCalledWith(50);
      });
      await waitFor(() => {
        expect(screen.getByText(/Le montant doit etre d'au moins 1 FCFA/i)).toBeInTheDocument();
      });
      expect(mockMarkCotisationPaidFromStore).not.toHaveBeenCalled();
    });
  });

  // ─── TransactionNew ──────────────────────────────────────────────────────
  describe("TransactionNew page", () => {
    it("blocks submission when transaction amount is zero (policy rejects)", async () => {
      vi.mocked(useCategories).mockReturnValue({
        data: [{ id: "cat-1", label: "Test", type: "INCOME" }],
      });
      vi.mocked(useCaisses).mockReturnValue({
        data: [{ id: "c1", name: "Main" }],
      });
      vi.mocked(useEvents).mockReturnValue({ data: [] });

      render(
        <MemoryRouter initialEntries={["/transaction/new"]}>
          <Routes>
            <Route path="/transaction/new" element={<TransactionNew />} />
          </Routes>
        </MemoryRouter>,
      );

      const inputs = document.querySelectorAll("input");
      const amountInput = Array.from(inputs).find((el: any) => el.type === "number") as HTMLInputElement;
      const descInput = Array.from(inputs).find((el: any) => el.type === "text") as HTMLInputElement;

      await act(async () => {
        fireEvent.change(amountInput, { target: { value: "0" } });
        fireEvent.change(descInput, { target: { value: "Test desc" } });
      });

      const submitBtn = screen.getByText(/Enregistrer la transaction/i);
      await act(async () => { fireEvent.click(submitBtn); });

      await waitFor(() => {
        expect(mockTransactionValidateAmount).toHaveBeenCalledWith(0);
      });
      await waitFor(() => {
        expect(screen.getByText(/Le montant doit etre superieur a 0/i)).toBeInTheDocument();
      });
      expect(mockAddTransactionPS).not.toHaveBeenCalled();
    });
  });

  // ─── TransactionEdit ─────────────────────────────────────────────────────
  describe("TransactionEdit page", () => {
    it("blocks update when transaction amount violates policy", async () => {
      vi.mocked(useTransactions).mockReturnValue({
        data: [{
          id: "tx-1", type: "INCOME", amount: 500000,
          description: "Old", date: "2026-01-01", category_id: "cat-1",
          source_caisse_id: "c1", status: "DRAFT",
        }],
      });
      vi.mocked(useCategories).mockReturnValue({
        data: [{ id: "cat-1", label: "Test", type: "INCOME" }],
      });
      vi.mocked(useEvents).mockReturnValue({ data: [] });
      vi.mocked(useOrgUnits).mockReturnValue({ data: [] });
      vi.mocked(useAccounts).mockReturnValue({ data: [] });

      _params = { id: "tx-1" };

      render(
        <MemoryRouter initialEntries={["/transaction/tx-1/edit"]}>
          <Routes>
            <Route path="/transaction/:id/edit" element={<TransactionEdit />} />
          </Routes>
        </MemoryRouter>,
      );

      const amountInput = document.querySelector('input[type="number"]') as HTMLInputElement;
      await act(async () => { fireEvent.change(amountInput, { target: { value: "0" } }); });

      const submitBtn = screen.getByText(/Sauvegarder/i);
      await act(async () => { fireEvent.click(submitBtn); });

      await waitFor(() => {
        expect(mockTransactionValidateAmount).toHaveBeenCalledWith(0);
      });
    });
  });

  // ─── Versement ───────────────────────────────────────────────────────────
  describe("Versement page", () => {
    it("routes the versement balance check through policy.versement.checkBalance", async () => {
      vi.mocked(useTransactions).mockReturnValue({
        data: [
          { source_caisse_id: "c1", type: "INCOME", amount: 500000, status: "APPROVED" },
          { source_caisse_id: "c1", type: "EXPENSE", amount: 0, status: "APPROVED" },
        ],
      });

      render(
        <MemoryRouter initialEntries={["/versement"]}>
          <Routes>
            <Route path="/versement" element={<Versement />} />
          </Routes>
        </MemoryRouter>,
      );

      const select = document.querySelector("select") as HTMLSelectElement;
      await act(async () => { fireEvent.change(select, { target: { value: "c1" } }); });

      // Balance = 500000 cents = 5000 FCFA. Pay 2500 FCFA (within balance).
      const amountInput = document.querySelector('input[type="number"]') as HTMLInputElement;
      await act(async () => { fireEvent.change(amountInput, { target: { value: "2500" } }); });

      const continueBtn = screen.getByText(/Continuer/i);
      await act(async () => { fireEvent.click(continueBtn); });

      const confirmBtn = screen.getByText(/Confirmer le versement/i);
      await act(async () => { fireEvent.click(confirmBtn); });

      // The page routes the balance check through policy.versement.checkBalance
      // with the live balance (500000) and the requested amount (250000 cents).
      await waitFor(() => {
        expect(mockVersementCheckBalance).toHaveBeenCalledWith({
          balanceCents: 500000,
          amountCents: 250000,
        });
      });
      // Policy allows it → versement is created.
      await waitFor(() => {
        expect(mockCreateVersement).toHaveBeenCalled();
      });
    });
  });
});
