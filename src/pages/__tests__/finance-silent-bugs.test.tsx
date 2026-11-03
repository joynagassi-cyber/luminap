// @vitest-environment jsdom
/**
 * Bugs SILENCIEUX du parcours financier (audit sync → local).
 *
 * A. `TransactionNew` — la notification « dépense en attente d'approbation »
 *    n'était JAMAIS envoyée : le code comparait `status === "PENDING"` sur un
 *    identifiant libre qui se résolvait en réalité sur `window.status`
 *    (toujours ""). Un trésorier n'était donc jamais alerté d'une dépense.
 *    Non-vacuité : retirer la constante `status` locale → `sendNotification`
 *    n'est plus appelé.
 *
 * B. `TransactionNewGroup` — le bouton « Sortie » de GroupDetail ouvrait
 *    toujours « Entrée » : le type transitait par `location.state`, que le
 *    routeur Ionic ne préserve pas entre les vues. Il transite désormais par
 *    `?type=`. Non-vacuité : relire `location.state` seul → le type retombe
 *    sur INCOME et l'enregistrement se fait en INCOME.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  loc: { pathname: "/", search: "", state: null as any },
  categories: [] as any[],
  caisses: [] as any[],
  accounts: [] as any[],
  events: [] as any[],
  navigate: vi.fn(),
  addTransactionPS: vi.fn(async (_payload: any) => "tx-1"),
  sendNotification: vi.fn(async (_data: any) => {}),
  validateAmount: vi.fn((_cents: number) => ({ ok: true })),
}));

vi.mock("lucide-react", () => {
  const makeIcon = (name: string) => {
    const C = ({ className }: { className?: string }) => (
      <svg className={className} data-icon={name} />
    );
    C.displayName = name;
    return C;
  };
  const mod: Record<string, unknown> = {};
  for (const n of ["ArrowLeft", "Wallet", "Calendar", "Camera", "ImagePlus", "X", "Bell", "BellOff"]) {
    mod[n] = makeIcon(n);
  }
  mod.default = { ...mod };
  return mod;
});

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => <div /> }));

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => h.params,
    useNavigate: () => h.navigate,
    useLocation: () => h.loc,
  };
});

vi.mock("@/lib/dataLayer", () => ({
  useTransactions: () => ({ data: [] }),
  useCategories: () => ({ data: h.categories }),
  useCaisses: () => ({ data: h.caisses }),
  useAccounts: () => ({ data: h.accounts }),
  useEvents: () => ({ data: h.events }),
  useOnlineStatus: () => true,
  addTransactionPS: h.addTransactionPS,
}));

vi.mock("@/lib/orgContext", () => ({ getOrganizationId: () => "org-1" }));
vi.mock("@/lib/periodLock", () => ({
  periodLockMessage: (_e: unknown, fallback: string) => fallback,
}));
vi.mock("@/capabilities/policy", () => ({
  policy: { transaction: { validateAmount: h.validateAmount } },
}));
vi.mock("@/capabilities/notification", () => ({
  notification: { sendNotification: h.sendNotification },
}));

import TransactionNew from "@/pages/TransactionNew";
import TransactionNewGroup from "@/pages/TransactionNewGroup";

beforeEach(() => {
  h.params = {};
  h.loc = { pathname: "/", search: "", state: null };
  h.categories = [
    { id: "cat-in", label: "Dîme", type: "INCOME" },
    { id: "cat-out", label: "Loyer", type: "EXPENSE" },
  ];
  h.caisses = [{ id: "c1", name: "Caisse principale" }];
  h.accounts = [{ id: "g1", name: "Groupe A", owner_type: "GROUP", status: "ACTIVE" }];
  h.events = [];
  h.navigate.mockClear();
  h.addTransactionPS.mockClear();
  h.sendNotification.mockClear();
  h.validateAmount.mockClear();
  h.validateAmount.mockReturnValue({ ok: true });
});

function fillAmountAndDescription() {
  const inputs = Array.from(document.querySelectorAll("input"));
  const amountInput = inputs.find((el) => el.getAttribute("inputmode") === "decimal") as HTMLInputElement;
  const descInput =
    inputs.find((el) => el.getAttribute("aria-label") === "Description") ??
    inputs.find(
      (el) =>
        el.getAttribute("type") === "text" &&
        el.getAttribute("inputmode") !== "decimal",
    );
  fireEvent.change(amountInput, { target: { value: "1000" } });
  fireEvent.change(descInput as HTMLInputElement, { target: { value: "Achat matériel" } });
}

describe("A — TransactionNew notifie les trésoriers d'une dépense", () => {
  it("une SORTIE enregistrée déclenche la notification d'approbation", async () => {
    h.loc = { pathname: "/transaction/new", search: "?type=EXPENSE", state: null };
    render(
      <MemoryRouter initialEntries={["/transaction/new?type=EXPENSE"]}>
        <Routes>
          <Route path="/transaction/new" element={<TransactionNew />} />
        </Routes>
      </MemoryRouter>,
    );

    fillAmountAndDescription();
    await act(async () => {
      fireEvent.click(screen.getByText(/Enregistrer la transaction/i));
    });

    await waitFor(() => expect(h.addTransactionPS).toHaveBeenCalledTimes(1));
    expect(h.addTransactionPS.mock.calls[0][0]).toMatchObject({ type: "EXPENSE", status: "PENDING" });
    await waitFor(() => expect(h.sendNotification).toHaveBeenCalledTimes(1));
    expect(h.sendNotification.mock.calls[0][0]).toMatchObject({
      targetRole: "TREASURIER",
      title: "Transaction en attente d'approbation",
    });
  });

  it("une ENTRÉE n'envoie PAS de notification d'approbation", async () => {
    h.loc = { pathname: "/transaction/new", search: "?type=INCOME", state: null };
    render(
      <MemoryRouter initialEntries={["/transaction/new?type=INCOME"]}>
        <Routes>
          <Route path="/transaction/new" element={<TransactionNew />} />
        </Routes>
      </MemoryRouter>,
    );

    fillAmountAndDescription();
    await act(async () => {
      fireEvent.click(screen.getByText(/Enregistrer la transaction/i));
    });

    await waitFor(() => expect(h.addTransactionPS).toHaveBeenCalledTimes(1));
    // Une entrée est constatée immédiatement (APPROVED) : en DRAFT, elle
    // était invisible du dashboard/des bilans sans chemin d'approbation
    // (bug P0-1).
    expect(h.addTransactionPS.mock.calls[0][0]).toMatchObject({ type: "INCOME", status: "APPROVED" });
    expect(h.sendNotification).not.toHaveBeenCalled();
  });
});

describe("C — TransactionNew réinitialise la catégorie au changement de type", () => {
  it("passer Entrée → Sortie reprend la 1re catégorie du nouveau type", async () => {
    h.loc = { pathname: "/transaction/new", search: "", state: null };
    render(
      <MemoryRouter initialEntries={["/transaction/new"]}>
        <Routes>
          <Route path="/transaction/new" element={<TransactionNew />} />
        </Routes>
      </MemoryRouter>,
    );

    const select = () => document.querySelector("select") as HTMLSelectElement;
    await waitFor(() => expect(select().value).toBe("cat-in"));

    await act(async () => {
      fireEvent.click(screen.getByText("Sortie"));
    });

    await waitFor(() => expect(select().value).toBe("cat-out"));
  });
});

describe("B — TransactionNewGroup respecte le type passé en query param", () => {
  it("?type=EXPENSE enregistre bien une SORTIE", async () => {
    h.params = { id: "g1" };
    h.loc = { pathname: "/groups/g1/transaction/new", search: "?type=EXPENSE", state: null };
    render(
      <MemoryRouter initialEntries={["/groups/g1/transaction/new?type=EXPENSE"]}>
        <Routes>
          <Route path="/groups/:id/transaction/new" element={<TransactionNewGroup />} />
        </Routes>
      </MemoryRouter>,
    );

    fillAmountAndDescription();
    await act(async () => {
      fireEvent.click(screen.getByText(/Enregistrer la transaction/i));
    });

    await waitFor(() => expect(h.addTransactionPS).toHaveBeenCalledTimes(1));
    expect(h.addTransactionPS.mock.calls[0][0]).toMatchObject({ type: "EXPENSE" });
  });
});
