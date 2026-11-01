// @vitest-environment jsdom
/**
 * TransferOwnership — parcours guidé (PR14, route `/admin/transfer-ownership`).
 *
 * On verrouille le COMPORTEMENT de l'écran, pas son apparence :
 *   - gate : un non-admin voit « Accès réservé aux administrateurs » et aucune
 *     liste de membres ne fuite ;
 *   - état vide : aucun membre éligible → message « Aucun membre éligible »
 *     (affiché seulement APRÈS lecture — drapeau posé dans un `finally`) ;
 *   - parcours : choisir une cible → revue des conséquences → type-to-confirm
 *     (le bouton reste désactivé tant que le nom saisi ne correspond pas) →
 *     application → écran de résultat.
 *
 * NON-VACUITÉ (preuve mesurée) : les mocks ci-dessous sont RÉELS (la décision
 * vient de `src/lib/ownershipTransfer.ts`, non mocké). Retirer la garde
 * `canConfirm` de la page fait échouer le test « le bouton reste désactivé » ;
 * retirer le `setStep("result")` fait échouer le test « écran de résultat ».
 * Vérifié par retrait temporaire puis restauration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const hoisted = vi.hoisted(() => ({
  isAdmin: true,
  candidates: [] as unknown[],
  loadCandidates: vi.fn(async () => [] as unknown[]),
  loadOwner: vi.fn(async () => null as string | null),
  apply: vi.fn(async () => ({ ok: true, appliedSteps: ["SET_OWNER"] })),
  defaultPorts: vi.fn(() => ({
    grantAdmin: vi.fn(),
    setOwner: vi.fn(),
    demoteAdmin: vi.fn(),
  })),
  writeAudit: vi.fn(async () => undefined),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  ready: true,
}));

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: () => ({
    id: "user-owner",
    email: "owner@example.com",
    firstName: "Olive",
    lastName: "Owner",
    role: "ADMIN",
    org: { id: "org-1", name: "Lumina", type: "Église", accentColor: "#fff" },
  }),
  isPowerSyncReadyNow: () => hoisted.ready,
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
}));

vi.mock("@/hooks/useCanAccessMulti", () => ({
  useCanAccessMulti: () => ({
    allowed: hoisted.isAdmin,
    loading: false,
    source: "both",
  }),
}));

// La lecture des candidats et l'application sont mockées ; la DÉCISION
// (`planOwnershipTransfer`) et la garde anti-orphelin restent réelles.
vi.mock("@/lib/ownershipTransfer", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ownershipTransfer")>(
    "@/lib/ownershipTransfer",
  );
  return {
    ...actual,
    loadOwnershipCandidates: () => hoisted.loadCandidates(),
    loadOwnerOfRecord: () => hoisted.loadOwner(),
    defaultTransferPorts: () => hoisted.defaultPorts(),
    applyOwnershipTransfer: (...args: unknown[]) => hoisted.apply(...(args as [])),
  };
});

vi.mock("@/lib/audit", () => ({ writeAudit: hoisted.writeAudit }));
vi.mock("@/lib/clientErrors", () => ({ captureClientError: vi.fn() }));
vi.mock("@/utils/toast", () => ({
  showSuccess: hoisted.showSuccess,
  showError: hoisted.showError,
}));
vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));

import TransferOwnership from "@/pages/TransferOwnership";

function candidate(over: Record<string, unknown> = {}) {
  return {
    id: "user-target",
    name: "Alice Durand",
    role: "ADMIN",
    status: "ACTIVE",
    isAdmin: true,
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/admin/transfer-ownership"]}>
      <TransferOwnership />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hoisted.isAdmin = true;
  hoisted.ready = true;
  hoisted.loadCandidates = vi.fn(async () => [candidate()]);
  hoisted.loadOwner = vi.fn(async () => null);
  hoisted.apply = vi.fn(async () => ({
    ok: true,
    appliedSteps: ["SET_OWNER"],
  }));
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe("TransferOwnership — gate administrateur", () => {
  it("affiche « Accès réservé aux administrateurs » pour un non-admin", async () => {
    hoisted.isAdmin = false;
    renderPage();
    expect(
      await screen.findByText(/Accès réservé aux administrateurs/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Alice Durand")).toBeNull();
  });
});

describe("TransferOwnership — état vide (après lecture)", () => {
  it("aucun candidat éligible → « Aucun membre éligible »", async () => {
    hoisted.loadCandidates = vi.fn(async () => []);
    renderPage();
    expect(await screen.findByText(/Aucun membre éligible/)).toBeInTheDocument();
  });

  it("l'état vide n'est PAS annoncé avant la lecture (squelette d'abord)", () => {
    hoisted.ready = false;
    hoisted.loadCandidates = vi.fn(() => new Promise(() => {})); // jamais résolu
    renderPage();
    expect(screen.queryByText(/Aucun membre éligible/)).toBeNull();
  });
});

describe("TransferOwnership — propriétaire de référence", () => {
  it("affiche le propriétaire de référence actuel quand il diffère de l'utilisateur", async () => {
    hoisted.loadCandidates = vi.fn(async () => [
      candidate({ id: "user-prev", name: "Olive Owner" }),
      candidate(),
    ]);
    hoisted.loadOwner = vi.fn(async () => "user-prev");
    renderPage();
    const current = await screen.findByTestId("transfer.current-owner");
    expect(current).toHaveTextContent("Olive Owner");
  });

  it("n'affiche rien quand aucun propriétaire de référence n'est défini", async () => {
    hoisted.loadOwner = vi.fn(async () => null);
    renderPage();
    await screen.findByLabelText("Alice Durand");
    expect(screen.queryByTestId("transfer.current-owner")).toBeNull();
  });
});

describe("TransferOwnership — parcours guidé", () => {
  it("choisir → revue → confirmation → résultat", async () => {
    renderPage();
    // 1. choisir la cible
    const radio = await screen.findByLabelText("Alice Durand");
    fireEvent.click(radio);
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    // 2. revue des conséquences : étapes affichées
    expect(await screen.findByText("Ce qui va se passer")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continuer vers la confirmation" }),
    );
    // 3. type-to-confirm : bouton désactivé tant que le nom ne correspond pas
    const confirmBtn = screen.getByRole("button", {
      name: "Transférer la propriété",
    });
    expect(confirmBtn).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Saisir le nom pour confirmer"), {
      target: { value: "Alice Durand" },
    });
    expect(confirmBtn).not.toBeDisabled();
    // 4. appliquer
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(hoisted.apply).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Transfert réussi/)).toBeInTheDocument();
    expect(hoisted.showSuccess).toHaveBeenCalled();
  });

  it("le nom saisi doit correspondre exactement (sinon bouton inerte)", async () => {
    renderPage();
    fireEvent.click(await screen.findByLabelText("Alice Durand"));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Continuer vers la confirmation" }),
    );
    const confirmBtn = screen.getByRole("button", {
      name: "Transférer la propriété",
    });
    fireEvent.change(screen.getByLabelText("Saisir le nom pour confirmer"), {
      target: { value: "Alice" },
    });
    expect(confirmBtn).toBeDisabled();
  });

  it("un échec d'application affiche l'étape fautive et rassure (pas d'orphelin)", async () => {
    hoisted.apply = vi.fn(async () => ({
      ok: false,
      failedStep: "SET_OWNER",
      appliedSteps: [],
      message: "Échec à l'étape « Désigner Alice Durand » : réseau",
    }));
    renderPage();
    fireEvent.click(await screen.findByLabelText("Alice Durand"));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Continuer vers la confirmation" }),
    );
    fireEvent.change(screen.getByLabelText("Saisir le nom pour confirmer"), {
      target: { value: "Alice Durand" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Transférer la propriété" }),
    );
    expect(await screen.findByText(/Transfert interrompu/)).toBeInTheDocument();
    expect(screen.getByText(/réseau/)).toBeInTheDocument();
    expect(
      screen.getByText(/conserve toujours au moins un administrateur/),
    ).toBeInTheDocument();
    expect(hoisted.showError).toHaveBeenCalled();
  });
});
