/**
 * PR14 — Transfert de propriété guidé (« ownership transfer »).
 *
 * PROBLÈME VISÉ (anti-orphelin) : rien ne permettait de passer l'organisation
 * à un autre administrateur de façon sûre. Le départ d'un propriétaire laissait
 * l'organisation sans personne pour la réadministrer (même classe de défaut que
 * PM5, mais du côté « humain » plutôt que « données »).
 *
 * DÉCISIONS D'INTÉGRATION (réutilisation, pas de monde parallèle) :
 *   - le « propriétaire de référence » est un RÉGLAGE PAR ORGANISATION stocké
 *     dans la table existante `org_settings` (clé `owner_profile_id`). Aucune
 *     table/colonne nouvelle : le socle `org_settings` (PR8/PR13) a précisément
 *     été créé pour ce type de réglage propre à l'organisation, et il est déjà
 *     synchronisé (stream `org_settings`) et protégé par la permission canon
 *     `admin:settings`.
 *   - l'attribution du rôle `ADMIN` et la rétrogradation passent par le helper
 *     d'écriture existant `assignMemberRole` (`src/lib/orgAdmin.ts`) — jamais de
 *     SQL brut depuis l'UI.
 *   - l'éligibilité d'une cible réutilise la décision canonique : une cible est
 *     « admin-capable » si son rôle canonique détient `admin:roles`
 *     (`PERMISSION_MATRIX`, source de vérité RBAC).
 *
 * Le cœur décisionnel (`planOwnershipTransfer`, `assertTransferAllowed`,
 * `planKeepsAnAdmin`) est PUR et déterministe → testable sans base. L'application
 * (`applyOwnershipTransfer`) reçoit ses ports d'écriture : l'ordre des étapes et
 * l'abandon sur échec sont testables sans base, tout en réutilisant les helpers
 * réels par défaut.
 */

import { ROLE_LABELS, hasPermission, parseRole } from "@/lib/rbac";
import type { Role } from "@/types";
import { assignMemberRole } from "@/lib/orgAdmin";
import { ORG_SETTING_KEYS, getOrgSetting, setOrgSetting } from "@/lib/orgSettings";
import { getPowerSyncDatabase } from "@/lib/powersync";

/** Rôle canonique retenu pour l'ancien propriétaire rétrogradé. */
export const DEMOTED_ROLE: Role = "PASTEUR_PRINCIPAL";

/** Permission qui rend un rôle « admin-capable » (peut gérer les accès). */
const ADMIN_CAPABLE_PERMISSION = "admin:roles" as const;

export interface TransferCandidate {
  /** Identifiant du profil / utilisateur (`org_memberships.user_id`). */
  id: string;
  /** Nom affichable (repli sur l'identifiant si vide). */
  name: string;
  /** Rôle canonique dans l'organisation (hors canon → inéligible). */
  role: Role | string | null;
  /** Statut d'appartenance (`ACTIVE` requis pour être éligible). */
  status: string;
  /** Détient déjà le rôle canonique `ADMIN`. */
  isAdmin: boolean;
}

export interface OwnershipTransferCurrent {
  orgId: string;
  /** Propriétaire de référence actuel (celui qui transfère). */
  currentOwnerId: string;
  /** Rôle canonique actuel du propriétaire (décide la rétrogradation). */
  currentOwnerRole: Role | string | null;
  /** Cible souhaitée. */
  targetId: string;
}

export type TransferRefusal =
  | "NO_CANDIDATES"
  | "SELF_TRANSFER"
  | "TARGET_NOT_ELIGIBLE";

export type TransferStepKind = "GRANT_ADMIN" | "SET_OWNER" | "DEMOTE_PREVIOUS";

export interface TransferStep {
  kind: TransferStepKind;
  /** Utilisateur visé par l'étape. */
  userId: string;
  /** Libellé FR prêt à afficher (revue des conséquences). */
  label: string;
}

export interface TransferPlan {
  orgId: string;
  targetId: string;
  previousOwnerId: string;
  steps: TransferStep[];
}

export type TransferValidation =
  | { ok: true; plan: TransferPlan }
  | { ok: false; reason: TransferRefusal; message: string };

/** Erreur typée (FR) levée par `assertTransferAllowed`. */
export class OwnershipTransferError extends Error {
  readonly code: TransferRefusal;
  constructor(code: TransferRefusal, message: string) {
    super(message);
    this.name = "OwnershipTransferError";
    this.code = code;
  }
}

/** Un rôle canonique qui détient `admin:roles` peut devenir propriétaire. */
export function isAdminCapableRole(role: Role | string | null): boolean {
  if (!role) return false;
  return hasPermission(role as Role, ADMIN_CAPABLE_PERMISSION);
}

/** Une cible est éligible si elle est ACTIVE et porte un rôle admin-capable. */
export function isEligibleCandidate(candidate: TransferCandidate): boolean {
  if (candidate.status !== "ACTIVE") return false;
  return isAdminCapableRole(candidate.role);
}

/** Nom affichable d'une cible (repli sur l'identifiant). */
export function candidateLabel(candidate: TransferCandidate): string {
  const name = (candidate.name ?? "").trim();
  return name || candidate.id;
}

/** Nom FR d'un rôle, repli sur la valeur brute (rôle hors canon). */
function roleLabel(role: Role | string | null): string {
  if (!role) return "aucun";
  const parsed = parseRole(role);
  return parsed ? ROLE_LABELS[parsed] : String(role);
}

/**
 * Planifie un transfert de propriété. PUR.
 *
 * Refus (validation AVANT toute mutation) :
 *   - aucune cible éligible dans l'organisation → `NO_CANDIDATES` ;
 *   - cible = propriétaire actuel → `SELF_TRANSFER` ;
 *   - cible non éligible (absente, inactive, ou rôle non admin-capable)
 *     → `TARGET_NOT_ELIGIBLE`.
 *
 * Sinon produit les étapes ORDONNÉES : accorder `ADMIN` à la cible si elle ne
 * l'a pas déjà, puis écrire le propriétaire de référence, puis — seulement si
 * l'ancien propriétaire porte le rôle `ADMIN` — le rétrograder. L'ordre garantit
 * que l'organisation ne reste jamais sans administrateur : la cible est
 * administrateur AVANT que l'ancien ne soit rétrogradé.
 */
export function planOwnershipTransfer(
  current: OwnershipTransferCurrent,
  candidates: readonly TransferCandidate[],
): TransferValidation {
  const eligible = candidates.filter(isEligibleCandidate);

  if (eligible.length === 0) {
    return {
      ok: false,
      reason: "NO_CANDIDATES",
      message:
        "Aucun membre éligible : le transfert exige une personne active dont le rôle permet de gérer les accès (Administrateur ou Pasteur Principal).",
    };
  }

  if (current.targetId === current.currentOwnerId) {
    return {
      ok: false,
      reason: "SELF_TRANSFER",
      message:
        "Vous êtes déjà propriétaire de cette organisation : le transfert doit viser une autre personne.",
    };
  }

  const target = eligible.find((c) => c.id === current.targetId);
  if (!target) {
    return {
      ok: false,
      reason: "TARGET_NOT_ELIGIBLE",
      message:
        "La personne choisie n'est pas éligible : elle doit être membre actif avec un rôle permettant de gérer les accès.",
    };
  }

  const targetName = candidateLabel(target);
  const steps: TransferStep[] = [];

  if (!target.isAdmin) {
    steps.push({
      kind: "GRANT_ADMIN",
      userId: target.id,
      label: `Accorder le rôle « ${ROLE_LABELS.ADMIN} » à ${targetName}`,
    });
  }

  steps.push({
    kind: "SET_OWNER",
    userId: target.id,
    label: `Désigner ${targetName} comme propriétaire de l'organisation`,
  });

  // Rétrogradation de l'ancien propriétaire uniquement s'il porte le rôle
  // ADMIN (sinon il conserve son rôle : « demote/keep »).
  const previousIsAdmin = parseRole(current.currentOwnerRole ?? "") === "ADMIN";
  if (previousIsAdmin && current.currentOwnerId !== target.id) {
    steps.push({
      kind: "DEMOTE_PREVIOUS",
      userId: current.currentOwnerId,
      label: `Rétrograder l'ancien propriétaire (${roleLabel(
        current.currentOwnerRole,
      )} → ${ROLE_LABELS[DEMOTED_ROLE]})`,
    });
  }

  return {
    ok: true,
    plan: {
      orgId: current.orgId,
      targetId: target.id,
      previousOwnerId: current.currentOwnerId,
      steps,
    },
  };
}

/**
 * Variante lançante de `planOwnershipTransfer` : renvoie le plan ou lève une
 * `OwnershipTransferError` typée portant le motif et un message FR.
 */
export function assertTransferAllowed(
  current: OwnershipTransferCurrent,
  candidates: readonly TransferCandidate[],
): TransferPlan {
  const result = planOwnershipTransfer(current, candidates);
  if (!("plan" in result)) {
    throw new OwnershipTransferError(result.reason, result.message);
  }
  return result.plan;
}

/**
 * Invariant anti-orphelin, vérifiable AVANT toute écriture. PUR.
 *
 * Le plan doit établir la cible comme administrateur (étape `GRANT_ADMIN`) OU
 * la cible est déjà administrateur, ET toute rétrogradation doit viser quelqu'un
 * d'autre que la cible. Sans cela, appliquer le plan pourrait vider
 * l'organisation de ses administrateurs.
 */
export function planKeepsAnAdmin(
  plan: TransferPlan,
  currentAdminIds: readonly string[] = [],
): boolean {
  const establishesTarget =
    currentAdminIds.includes(plan.targetId) ||
    plan.steps.some((s) => s.kind === "GRANT_ADMIN" && s.userId === plan.targetId);

  if (!establishesTarget) return false;

  const demoted = plan.steps.filter((s) => s.kind === "DEMOTE_PREVIOUS");
  // On ne rétrograde jamais la cible qui vient d'être établie.
  return demoted.every((s) => s.userId !== plan.targetId);
}

// ─── Application (orchestration) ────────────────────────────────────────────

/** Ports d'écriture — injectables pour tester l'ordre et l'abandon. */
export interface OwnershipTransferPorts {
  /** Accorde (ou confirme) le rôle `ADMIN` canonique à l'utilisateur. */
  grantAdmin(userId: string): Promise<void>;
  /** Écrit le propriétaire de référence de l'organisation. */
  setOwner(userId: string): Promise<void>;
  /** Rétrograde l'ancien propriétaire. */
  demoteAdmin(userId: string): Promise<void>;
}

export type TransferApplyResult =
  | { ok: true; appliedSteps: TransferStepKind[] }
  | {
      ok: false;
      failedStep: TransferStepKind;
      appliedSteps: TransferStepKind[];
      message: string;
    };

/**
 * Applique le plan étape par étape. ATOMIQUE EN INTENTION : au premier échec,
 * l'application s'ARRÊTE (les étapes suivantes ne sont pas exécutées) et
 * rapporte l'étape fautive. Comme la cible est administrateur avant toute
 * rétrogradation, l'organisation n'est jamais laissée sans administrateur.
 */
export async function applyOwnershipTransfer(
  plan: TransferPlan,
  ports: OwnershipTransferPorts,
): Promise<TransferApplyResult> {
  const appliedSteps: TransferStepKind[] = [];
  for (const step of plan.steps) {
    try {
      switch (step.kind) {
        case "GRANT_ADMIN":
          await ports.grantAdmin(step.userId);
          break;
        case "SET_OWNER":
          await ports.setOwner(step.userId);
          break;
        case "DEMOTE_PREVIOUS":
          await ports.demoteAdmin(step.userId);
          break;
      }
      appliedSteps.push(step.kind);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        failedStep: step.kind,
        appliedSteps,
        message: `Échec à l'étape « ${step.label} » : ${detail}`,
      };
    }
  }
  return { ok: true, appliedSteps };
}

/**
 * Ports réels : réutilisent la couche d'écriture existante. `setOwner` échoue
 * (lève) si l'écriture du réglage n'aboutit pas, afin que l'application
 * n'annonce jamais un transfert réussi à tort.
 */
export function defaultTransferPorts(orgId: string): OwnershipTransferPorts {
  return {
    grantAdmin: (userId) => assignMemberRole(userId, orgId, "ADMIN"),
    setOwner: async (userId) => {
      const ok = await setOrgSetting(ORG_SETTING_KEYS.ownerProfileId, userId, orgId);
      if (!ok) {
        throw new Error(
          "L'écriture du propriétaire de référence a échoué (réglage d'organisation indisponible).",
        );
      }
    },
    demoteAdmin: (userId) => assignMemberRole(userId, orgId, DEMOTED_ROLE),
  };
}

// ─── Lecture (candidats, propriétaire) ──────────────────────────────────────

/**
 * Liste les membres ACTIFS de l'organisation avec leur rôle canonique et leur
 * nom, pour alimenter l'étape « choisir la cible ». Lit `org_memberships`
 * (appartenance multi-org) jointe à `profiles` (nom affichable).
 */
export async function loadOwnershipCandidates(
  orgId: string,
): Promise<TransferCandidate[]> {
  const db = getPowerSyncDatabase();
  const res = await db.execute(
    `SELECT m.user_id AS user_id, m.role AS role, m.status AS status,
            p.first_name AS first_name, p.last_name AS last_name
       FROM org_memberships m
       LEFT JOIN profiles p ON p.id = m.user_id
      WHERE m.org_id = ? AND m.status = 'ACTIVE'
      ORDER BY p.last_name, p.first_name`,
    [orgId],
  );
  const rows = (res?.array ?? []) as Array<Record<string, unknown>>;
  return rows.map((r) => {
    const role = r.role == null ? null : String(r.role);
    const first = String(r.first_name ?? "");
    const last = String(r.last_name ?? "");
    return {
      id: String(r.user_id),
      name: `${first} ${last}`.trim(),
      role,
      status: String(r.status ?? ""),
      isAdmin: parseRole(role ?? "") === "ADMIN",
    };
  });
}

/** Lit le propriétaire de référence de l'organisation (null si aucun). */
export async function loadOwnerOfRecord(
  orgId: string,
): Promise<string | null> {
  return getOrgSetting<string | null>(
    ORG_SETTING_KEYS.ownerProfileId,
    null,
    orgId,
  );
}
