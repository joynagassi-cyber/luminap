// @vitest-environment jsdom
/**
 * Préremplissage de `/versement` — bug de classe « location.state perdu par le
 * routeur Ionic ». « Verser » depuis un groupe ouvrait la page sans caisse ni
 * montant (bouton « Confirmer » désactivé, sans explication). Les valeurs
 * voyagent désormais par query param.
 *
 * Non-vacuity : relire `location.state` seul → le formulaire n'est plus
 * prérempli.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const h = vi.hoisted(() => ({
  loc: { pathname: "/versement", search: "", state: null as any },
  navigate: vi.fn(),
  accounts: [] as any[],
}));

vi.mock("lucide-react", () => {
  const makeIcon = (name: string) => {
    const C = ({ className }: { className?: string }) => <svg className={className} data-icon={name} />;
    C.displayName = name;
    return C;
  };
  const mod: Record<string, unknown> = {};
  for (const n of ["ArrowLeft", "Check", "AlertCircle", "Wallet", "RefreshCw"]) mod[n] = makeIcon(n);
  mod.default = { ...mod };
  return mod;
});

vi.mock("@/components/TopHeader", () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));
vi.mock("@/components/BottomNav", () => ({ default: () => <div /> }));
vi.mock("@/components/PageSkeletons", () => ({ VersementSkeleton: () => <div data-testid="skeleton" /> }));

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => h.navigate, useLocation: () => h.loc };
});

vi.mock("@/lib/dataLayer", () => ({
  useCaisses: () => ({ data: [] }),
  useAccounts: () => ({ data: h.accounts, isLoading: false }),
  useTransactions: () => ({ data: [] }),
  createVersement: vi.fn(async () => ({})),
  isPowerSyncReadyNow: () => true,
}));

vi.mock("@/capabilities/policy", () => ({
  policy: { versement: { checkBalance: () => ({ ok: true }), validateAtomic: () => ({ ok: true }) } },
}));
vi.mock("@/capabilities/notification", () => ({ notification: { sendNotification: vi.fn(async () => {}) } }));

import Versement from "@/pages/Versement";

beforeEach(() => {
  h.navigate.mockClear();
  h.accounts = [
    { id: "g1", name: "Groupe A", owner_type: "GROUP", status: "ACTIVE" },
    { id: "g2", name: "Groupe B", owner_type: "GROUP", status: "ACTIVE" },
  ];
});

function renderVersement(search: string) {
  h.loc = { pathname: "/versement", search, state: null };
  return render(
    <MemoryRouter initialEntries={[`/versement${search}`]}>
      <Routes>
        <Route path="/versement" element={<Versement />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Versement — préremplissage par query param", () => {
  it("?caisseId=g2 présélectionne la caisse", () => {
    const { container } = renderVersement("?caisseId=g2");
    const select = container.querySelector("select") as HTMLSelectElement;
    expect(select.value).toBe("g2");
  });

  it("?defaultAmount=500000 (centimes) préremplit 5 000 FCFA", () => {
    const { container } = renderVersement("?caisseId=g1&defaultAmount=500000");
    const inputs = Array.from(container.querySelectorAll("input"));
    const amountInput = inputs.find((el) => el.getAttribute("type") === "number") as HTMLInputElement;
    expect(amountInput.value).toBe("5000");
  });

  it("sans query param, aucun préremplissage (état vide honnête)", () => {
    const { container } = renderVersement("");
    const select = container.querySelector("select") as HTMLSelectElement;
    const inputs = Array.from(container.querySelectorAll("input"));
    const amountInput = inputs.find((el) => el.getAttribute("type") === "number") as HTMLInputElement;
    expect(select.value).toBe("");
    expect(amountInput.value).toBe("");
  });
});
