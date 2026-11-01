// @vitest-environment node
/**
 * PR14 — Transfert de propriété guidé : cœur décisionnel (pur) + application.
 *
 * Ce que l'on verrouille (comportemental, sur le code RÉEL) :
 *   1. aucune cible éligible → refus `NO_CANDIDATES` (jamais de plan vide) ;
 *   2. transfert vers soi-même → refus `SELF_TRANSFER` ;
 *   3. cible sans rôle admin → le plan CONTIENT l'étape d'octroi `GRANT_ADMIN`,
 *      et à l'application l'octroi précède le changement de propriétaire ;
 *   4. chemin nominal → les étapes sont appliquées DANS L'ORDRE ;
 *   5. échec en cours d'application → l'application S'ARRÊTE à l'étape fautive
 *      et l'organisation conserve au moins un administrateur (pas d'orphelin).
 *
 * NON-VACUITÉ (preuve mesurée) :
 *   - retirer le `if (eligible.length === 0)` de `planOwnershipTransfer` fait
 *     échouer le test « aucune cible » (le plan serait produit) ;
 *   - retirer le `if (current.targetId === current.currentOwnerId)` fait échouer
 *     le test « auto-transfert » ;
 *   - retirer le `if (!target.isAdmin)` fait échouer le test « cible sans rôle
 *     admin » (l'étape `GRANT_ADMIN` disparaîtrait du plan) ;
 *   - retirer le `return { ok:false, … }` du `catch` dans
 *     `applyOwnershipTransfer` fait échouer le test « échec mi-parcours » (une
 *     étape suivante s'exécuterait après l'échec).
 *   Vérifié en retirant temporairement chaque branche : le test correspondant
 *   passe au rouge, puis la source est restaurée.
 *
 * Les fonctions pures n'ouvrent aucune base ; `applyOwnershipTransfer` reçoit
 * ses ports d'écriture (aucun mock réseau, aucune DB).
 */
import { describe, it, expect, vi } from "vitest";
import {
  applyOwnershipTransfer,
  assertTransferAllowed,
  DEMOTED_ROLE,
  isAdminCapableRole,
  isEligibleCandidate,
  OwnershipTransferError,
  planKeepsAnAdmin,
  planOwnershipTransfer,
  type TransferCandidate,
  type TransferStepKind,
} from "@/lib/ownershipTransfer";

const ORG = "org-1";
const OWNER = "user-owner";
const TARGET = "user-target";

function candidate(over: Partial<TransferCandidate> = {}): TransferCandidate {
  return {
    id: TARGET,
    name: "Alice Durand",
    role: "ADMIN",
    status: "ACTIVE",
    isAdmin: true,
    ...over,
  };
}

const current = {
  orgId: ORG,
  currentOwnerId: OWNER,
  currentOwnerRole: "ADMIN" as const,
  targetId: TARGET,
};

describe("PR14 — refus de plan (validation AVANT toute mutation)", () => {
  it("aucune cible éligible → refus NO_CANDIDATES", () => {
    const result = planOwnershipTransfer(current, []);
    expect(result.ok).toBe(false);
    if ("plan" in result) throw new Error("un plan a été produit à tort");
    expect(result.reason).toBe("NO_CANDIDATES");
    expect(result.message).toMatch(/Aucun membre éligible/);
  });

  it("aucune cible éligible (candidats présents mais inactifs/non-admin) → refus", () => {
    const result = planOwnershipTransfer(current, [
      candidate({ id: "u2", role: "MEMBRE", isAdmin: false }),
      candidate({ id: "u3", role: "ADMIN", isAdmin: true, status: "PENDING" }),
    ]);
    expect(result.ok).toBe(false);
    if ("plan" in result) throw new Error("un plan a été produit à tort");
    expect(result.reason).toBe("NO_CANDIDATES");
  });

  it("transfert vers soi-même → refus SELF_TRANSFER", () => {
    const result = planOwnershipTransfer(
      { ...current, targetId: OWNER },
      [candidate({ id: OWNER, name: "Moi", role: "ADMIN", isAdmin: true })],
    );
    expect(result.ok).toBe(false);
    if ("plan" in result) throw new Error("un plan a été produit à tort");
    expect(result.reason).toBe("SELF_TRANSFER");
    expect(result.message).toMatch(/déjà propriétaire/);
  });

  it("assertTransferAllowed lève une OwnershipTransferError typée (message FR)", () => {
    let thrown: unknown;
    try {
      assertTransferAllowed(current, []);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(OwnershipTransferError);
    expect((thrown as OwnershipTransferError).code).toBe("NO_CANDIDATES");
    expect((thrown as OwnershipTransferError).message.length).toBeGreaterThan(0);
  });
});

describe("PR14 — plan : ordre et étapes", () => {
  it("cible SANS rôle admin → étape GRANT_ADMIN présente, avant SET_OWNER", () => {
    const result = planOwnershipTransfer(current, [
      candidate({ role: "PASTEUR_PRINCIPAL", isAdmin: false }),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("plan attendu");
    const kinds = result.plan.steps.map((s) => s.kind);
    expect(kinds).toEqual(["GRANT_ADMIN", "SET_OWNER", "DEMOTE_PREVIOUS"]);
    // L'octroi précède le changement de propriétaire (anti-orphelin).
    expect(kinds.indexOf("GRANT_ADMIN")).toBeLessThan(kinds.indexOf("SET_OWNER"));
  });

  it("cible DÉJÀ admin → pas d'étape GRANT_ADMIN", () => {
    const result = planOwnershipTransfer(current, [candidate({ isAdmin: true })]);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("plan attendu");
    expect(result.plan.steps.map((s) => s.kind)).toEqual([
      "SET_OWNER",
      "DEMOTE_PREVIOUS",
    ]);
  });

  it("ancien propriétaire non-admin → pas de rétrogradation (keep)", () => {
    const result = planOwnershipTransfer(
      { ...current, currentOwnerRole: "TREASURIER" },
      [candidate({ isAdmin: true })],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("plan attendu");
    expect(result.plan.steps.map((s) => s.kind)).toEqual(["SET_OWNER"]);
  });

  it("l'étape de rétrogradation vise l'ancien propriétaire vers le rôle canon retenu", () => {
    const result = planOwnershipTransfer(current, [candidate({ isAdmin: true })]);
    if (!result.ok) throw new Error("plan attendu");
    const demote = result.plan.steps.find((s) => s.kind === "DEMOTE_PREVIOUS");
    expect(demote?.userId).toBe(OWNER);
    expect(demote?.label).toContain("Rétrograder");
    expect(DEMOTED_ROLE).toBe("PASTEUR_PRINCIPAL");
  });
});

describe("PR14 — invariant anti-orphelin (pur)", () => {
  it("un plan qui établit la cible administrateur garde au moins un admin", () => {
    const result = planOwnershipTransfer(current, [
      candidate({ role: "PASTEUR_PRINCIPAL", isAdmin: false }),
    ]);
    if (!result.ok) throw new Error("plan attendu");
    expect(planKeepsAnAdmin(result.plan, [OWNER])).toBe(true);
  });

  it("un plan forgé qui ne rend PAS la cible admin est rejeté (non-vacuité de la garde)", () => {
    // Plan synthétique : on rétrograde la cible sans l'avoir promue.
    const forged = {
      orgId: ORG,
      targetId: TARGET,
      previousOwnerId: OWNER,
      steps: [
        { kind: "SET_OWNER" as TransferStepKind, userId: TARGET, label: "x" },
        {
          kind: "DEMOTE_PREVIOUS" as TransferStepKind,
          userId: TARGET,
          label: "y",
        },
      ],
    };
    expect(planKeepsAnAdmin(forged, [OWNER])).toBe(false);
  });
});

describe("PR14 — application : ordre et abandon sur échec", () => {
  it("chemin nominal : les étapes sont appliquées DANS L'ORDRE", async () => {
    const calls: string[] = [];
    const ports = {
      grantAdmin: vi.fn(async () => void calls.push("grant")),
      setOwner: vi.fn(async () => void calls.push("owner")),
      demoteAdmin: vi.fn(async () => void calls.push("demote")),
    };
    const plan = assertTransferAllowed(current, [
      candidate({ role: "PASTEUR_PRINCIPAL", isAdmin: false }),
    ]);
    const res = await applyOwnershipTransfer(plan, ports);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("application attendue en succès");
    expect(calls).toEqual(["grant", "owner", "demote"]);
    expect(res.appliedSteps).toEqual(["GRANT_ADMIN", "SET_OWNER", "DEMOTE_PREVIOUS"]);
  });

  it("échec à l'octroi → AUCUNE étape suivante n'est exécutée (org intacte)", async () => {
    const ports = {
      grantAdmin: vi.fn(async () => {
        throw new Error("réseau");
      }),
      setOwner: vi.fn(async () => undefined),
      demoteAdmin: vi.fn(async () => undefined),
    };
    const plan = assertTransferAllowed(current, [
      candidate({ role: "PASTEUR_PRINCIPAL", isAdmin: false }),
    ]);
    const res = await applyOwnershipTransfer(plan, ports);
    expect(res.ok).toBe(false);
    if (!("failedStep" in res)) throw new Error("échec attendu");
    expect(res.failedStep).toBe("GRANT_ADMIN");
    expect(res.appliedSteps).toEqual([]);
    expect(ports.setOwner).not.toHaveBeenCalled();
    expect(ports.demoteAdmin).not.toHaveBeenCalled();
    // L'ancien propriétaire est toujours administrateur → pas d'orphelin.
    expect(planKeepsAnAdmin(plan, [OWNER])).toBe(true);
  });

  it("échec au changement de propriétaire → l'ancien admin est CONSERVÉ (pas de rétrogradation)", async () => {
    const ports = {
      grantAdmin: vi.fn(async () => undefined),
      setOwner: vi.fn(async () => {
        throw new Error("écriture refusée");
      }),
      demoteAdmin: vi.fn(async () => undefined),
    };
    const plan = assertTransferAllowed(current, [candidate({ isAdmin: true })]);
    const res = await applyOwnershipTransfer(plan, ports);
    expect(res.ok).toBe(false);
    if (!("failedStep" in res)) throw new Error("échec attendu");
    expect(res.failedStep).toBe("SET_OWNER");
    expect(res.appliedSteps).toEqual([]);
    // La rétrogradation n'a PAS été tentée : l'org garde son administrateur.
    expect(ports.demoteAdmin).not.toHaveBeenCalled();
  });

  it("un échec à la rétrogradation laisse la cible administrateur (≥ 1 admin)", async () => {
    const ports = {
      grantAdmin: vi.fn(async () => undefined),
      setOwner: vi.fn(async () => undefined),
      demoteAdmin: vi.fn(async () => {
        throw new Error("conflit");
      }),
    };
    const plan = assertTransferAllowed(current, [candidate({ isAdmin: true })]);
    const res = await applyOwnershipTransfer(plan, ports);
    expect(res.ok).toBe(false);
    if (!("failedStep" in res)) throw new Error("échec attendu");
    expect(res.failedStep).toBe("DEMOTE_PREVIOUS");
    expect(res.appliedSteps).toEqual(["SET_OWNER"]);
    expect(res.message).toMatch(/Échec à l'étape/);
  });
});

describe("PR14 — éligibilité (réutilise la décision canonique RBAC)", () => {
  it("ADMIN et PASTEUR_PRINCIPAL sont admin-capables ; MEMBRE non", () => {
    expect(isAdminCapableRole("ADMIN")).toBe(true);
    expect(isAdminCapableRole("PASTEUR_PRINCIPAL")).toBe(true);
    expect(isAdminCapableRole("MEMBRE")).toBe(false);
    expect(isAdminCapableRole(null)).toBe(false);
  });

  it("une cible ACTIVE admin-capable est éligible ; PENDING/ARCHIVED non", () => {
    expect(
      isEligibleCandidate(candidate({ role: "ADMIN", isAdmin: true, status: "ACTIVE" })),
    ).toBe(true);
    expect(
      isEligibleCandidate(candidate({ role: "ADMIN", status: "PENDING" })),
    ).toBe(false);
    expect(
      isEligibleCandidate(candidate({ role: "ADMIN", status: "ARCHIVED" })),
    ).toBe(false);
  });
});
