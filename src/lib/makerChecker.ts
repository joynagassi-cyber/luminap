/**
 * Maker-checker (PR8) — règle PURE d'approbation en deux étapes.
 *
 * Objectif : le contrôle financier. La personne qui CRÉE une transaction ne
 * doit pas être celle qui l'APPROUVE. La règle est OPT-IN (réglage par
 * organisation `maker_checker_enabled`, défaut DÉSACTIVÉ) pour ne pas casser
 * les organisations mono-administrateur : sans réglage, le comportement
 * historique est conservé à l'identique.
 *
 * Ce module ne fait AUCUNE lecture (base, réseau, localStorage) : il reçoit la
 * valeur `enabled` et la liste des permissions en entrée. Il est donc
 * déterministe et testable sans PowerSync — la même philosophie que
 * `orgSettings.ts` (socle) et `featureFlags.ts` (fail-open).
 *
 * Règles, dans cet ordre (l'ordre compte : une permission manquante refuse
 * TOUJOURS, même maker-checker désactivé) :
 *   1. `transaction:approve` absent → refus `missing-permission` ;
 *   2. `enabled === true` ET `created_by_id === actorId` → refus `self-approval` ;
 *   3. sinon → autorisé (comportement historique).
 */

import type { Permission } from "@/lib/rbac";

/** Motifs de refus, discriminés pour un message UI précis. */
export type ApproveDenyReason = "self-approval" | "missing-permission";

export interface CanApproveInput {
  /** Transaction visée (seul `createdById` est lu par la règle). */
  transaction: { createdById: string | null | undefined };
  /** Identifiant de l'acteur qui tente l'approbation. */
  actorId: string;
  /** Permissions effectives de l'acteur (union fédération + legacy). */
  actorPermissions: readonly Permission[];
  /** Maker-checker activé pour l'organisation active ? */
  enabled: boolean;
}

export interface CanApproveResult {
  allowed: boolean;
  reason?: ApproveDenyReason;
}

/**
 * Décide si `actorId` peut approuver `transaction`. Fonction PURE.
 *
 * @see le commentaire d'en-tête pour l'ordre des règles.
 */
export function canApprove({
  transaction,
  actorId,
  actorPermissions,
  enabled,
}: CanApproveInput): CanApproveResult {
  if (!actorPermissions.includes("transaction:approve")) {
    return { allowed: false, reason: "missing-permission" };
  }
  if (enabled && transaction.createdById === actorId) {
    return { allowed: false, reason: "self-approval" };
  }
  return { allowed: true };
}

/** Code d'erreur typé : auto-approbation interdite (maker-checker actif). */
export const MAKER_CHECKER_SELF_APPROVAL = "MAKER_CHECKER_SELF_APPROVAL" as const;
/** Code d'erreur typé : permission d'approbation absente. */
export const MAKER_CHECKER_MISSING_PERMISSION =
  "MAKER_CHECKER_MISSING_PERMISSION" as const;

/**
 * Nom du kill-switch global (drapeau de build / surcharge locale). Défini ici
 * (module pur, sans dépendance) pour être partagé par le data layer et le hook
 * sans créer de cycle `dataLayer ↔ hooks`.
 */
export const MAKER_CHECKER_FLAG = "maker-checker";

export type MakerCheckerCode =
  | typeof MAKER_CHECKER_SELF_APPROVAL
  | typeof MAKER_CHECKER_MISSING_PERMISSION;

/** Messages FR — jamais d'anglais technique à l'écran. */
export const MAKER_CHECKER_MESSAGES: Readonly<Record<MakerCheckerCode, string>> = {
  MAKER_CHECKER_SELF_APPROVAL:
    "L'auteur ne peut pas approuver sa propre dépense.",
  MAKER_CHECKER_MISSING_PERMISSION:
    "Vous n'avez pas la permission d'approuver une transaction.",
};

/**
 * Erreur typée levée par le chemin d'écriture (`buildApproveTransaction`,
 * `approveTransactionPS`) quand la règle refuse. `code` permet à l'appelant de
 * distinguer les deux motifs sans analyser le message.
 */
export class MakerCheckerError extends Error {
  readonly code: MakerCheckerCode;

  constructor(code: MakerCheckerCode = MAKER_CHECKER_SELF_APPROVAL) {
    super(MAKER_CHECKER_MESSAGES[code]);
    this.name = "MakerCheckerError";
    this.code = code;
  }
}

/** Traduit un refus de `canApprove` en erreur typée (ou `null` si autorisé). */
export function toMakerCheckerError(
  result: CanApproveResult,
): MakerCheckerError | null {
  if (result.allowed) return null;
  return new MakerCheckerError(
    result.reason === "missing-permission"
      ? MAKER_CHECKER_MISSING_PERMISSION
      : MAKER_CHECKER_SELF_APPROVAL,
  );
}

/**
 * Combine le réglage d'organisation et le kill-switch de build. Fonction PURE.
 * Le drapeau (`maker-checker`) est un interrupteur global d'exploitation :
 * désactivé, il éteint maker-checker même si l'organisation l'a activé.
 */
export function resolveMakerCheckerEnabled(
  orgSettingEnabled: boolean,
  flagEnabled: boolean,
): boolean {
  return orgSettingEnabled === true && flagEnabled === true;
}

/**
 * Garde synchrone du chemin d'écriture : lève une `MakerCheckerError` si la
 * règle refuse, sinon ne fait rien.
 *
 * Quand `actorPermissions` n'est pas fourni, la permission est considérée
 * comme DÉJÀ vérifiée en amont (garde UI `useCanAccessMulti` / RLS). On
 * n'applique alors que la règle maker-checker (auto-approbation) — c'est le
 * seul point que le chemin d'écriture doit garantir lui-même.
 */
export function assertApprovable(
  transaction: { createdById: string | null | undefined },
  actorId: string,
  options: { enabled?: boolean; actorPermissions?: readonly Permission[] } = {},
): void {
  const enabled = options.enabled === true;
  const actorPermissions = options.actorPermissions ?? [
    "transaction:approve",
  ];
  const result = canApprove({
    transaction,
    actorId,
    actorPermissions,
    enabled,
  });
  const error = toMakerCheckerError(result);
  if (error) throw error;
}
