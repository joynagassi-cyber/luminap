/**
 * Lumina — Badge catalog (source de vérité des badges).
 *
 * Un « badge » est une pastille `rounded-full` : icône optionnelle + libellé,
 * portée par un TON sémantique. Le ton résout vers un **token CSS** Lumina
 * (`--data-*`, `--accent-*`, `--text-*`) — JAMAIS une couleur brute.
 *
 * Pourquoi un catalogue central : les badges étaient dupliqués à la main dans
 * une dizaine de pages (OrgReportsReceived, InvitationManage, Events,
 * CentralAdmin, Federation…) avec chacun sa `colorMap`/`labelMap` locale et sa
 * propre recette de teinte. Une retouche de palette ou l'ajout d'un statut
 * laissait des badges divergents (même famille de défaut que M22). Ici, tout
 * badge se construit à partir d'un TON + d'un LIBELLÉ, donc :
 *   - il suit automatiquement le mode clair/sombre (`--data-*` et `--text-*`
 *     basculent via `[data-theme]`, `--accent-*` suit le thème d'organisation) ;
 *   - la teinte de fond est dérivée par `tint()` (color-mix), plus de `+ "20"`.
 *
 * Les libellés sont FR, explicites (DESIGN.md §4 : « label texte explicite »),
 * et ne portent jamais seuls l'information (l'icône + le texte la portent).
 */

/** Ton sémantique d'un badge → token CSS Lumina (jamais de hex brut). */
export type BadgeTone =
  | "neutral"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

/** token CSS résolu pour chaque ton (référence App.css `:root`). */
export const BADGE_TONE_TOKEN: Record<BadgeTone, string> = {
  neutral: "var(--text-secondary)",
  accent: "var(--accent-primary)",
  info: "var(--data-planified)",
  success: "var(--data-income)",
  warning: "var(--data-pending)",
  danger: "var(--data-expense)",
  muted: "var(--text-tertiary)",
};

/** Nom d'icône lucide (résolu par le composant Badge — pas d'import ici). */
export type BadgeIconName =
  | "circle"
  | "dot"
  | "check"
  | "checkCircle"
  | "x"
  | "xCircle"
  | "minus"
  | "alert"
  | "info"
  | "clock"
  | "pause"
  | "play"
  | "ban"
  | "archive"
  | "refresh"
  | "file"
  | "send"
  | "inbox"
  | "eye"
  | "userPlus"
  | "userCheck"
  | "userX"
  | "shield"
  | "shieldCheck"
  | "sparkles"
  | "award"
  | "rocket"
  | "flag"
  | "lock"
  | "star"
  | "zap"
  | "target"
  | "coins"
  | "receipt"
  | "wallet"
  | "trendUp"
  | "trendDown"
  | "hourglass"
  | "calendar";

export interface BadgeSpec {
  label: string;
  tone: BadgeTone;
  icon?: BadgeIconName;
}

/**
 * Résout un badge par clé dans une table, avec repli sur un badge neutre.
 * Le repli affiche la clé BRUTE (jamais un libellé inventé) : un statut
 * inconnu reste lisible et traçable plutôt que masqué.
 */
export function resolveBadge(
  table: Record<string, BadgeSpec>,
  key: string | null | undefined,
): BadgeSpec {
  if (key && table[key]) return table[key];
  return { label: key ?? "—", tone: "neutral", icon: "circle" };
}

// ── Tables par domaine (source de vérité unique, cf. DESIGN.md §4) ───────────

/** Statuts de transaction (aligné sur `getStatusColor`/`getStatusLabel`). */
export const TRANSACTION_BADGES: Record<string, BadgeSpec> = {
  DRAFT: { label: "Brouillon", tone: "muted", icon: "file" },
  PENDING: { label: "En attente", tone: "warning", icon: "clock" },
  APPROVED: { label: "Approuvé", tone: "success", icon: "checkCircle" },
  REJECTED: { label: "Rejeté", tone: "danger", icon: "xCircle" },
};

/** Statuts de versement (bordereau de collecte). */
export const VERSEMENT_BADGES: Record<string, BadgeSpec> = {
  DRAFT: { label: "Brouillon", tone: "muted", icon: "file" },
  SUBMITTED: { label: "Soumis", tone: "info", icon: "send" },
  APPROVED: { label: "Approuvé", tone: "success", icon: "checkCircle" },
  REJECTED: { label: "Rejeté", tone: "danger", icon: "xCircle" },
};

/** Statuts d'événement (aligné sur `EVENT_STATUS_*`). */
export const EVENT_BADGES: Record<string, BadgeSpec> = {
  PLANIFIED: { label: "Planifié", tone: "info", icon: "calendar" },
  ONGOING: { label: "En cours", tone: "success", icon: "play" },
  COMPLETED: { label: "Terminé", tone: "muted", icon: "check" },
  CANCELLED: { label: "Annulé", tone: "danger", icon: "ban" },
};

/** Statuts de tâche d'événement. */
export const TASK_BADGES: Record<string, BadgeSpec> = {
  OPEN: { label: "À faire", tone: "info", icon: "circle" },
  IN_PROGRESS: { label: "En cours", tone: "warning", icon: "play" },
  DONE: { label: "Terminé", tone: "success", icon: "checkCircle" },
  BLOCKED: { label: "Bloqué", tone: "danger", icon: "ban" },
};

/** Statuts de membre / groupe / compte. */
export const MEMBER_BADGES: Record<string, BadgeSpec> = {
  ACTIVE: { label: "Actif", tone: "success", icon: "checkCircle" },
  INACTIVE: { label: "Inactif", tone: "muted", icon: "circle" },
  ARCHIVED: { label: "Archivé", tone: "muted", icon: "archive" },
};

export const GROUP_BADGES: Record<string, BadgeSpec> = {
  ACTIVE: { label: "Actif", tone: "success", icon: "checkCircle" },
  ARCHIVED: { label: "Archivé", tone: "muted", icon: "archive" },
};

/** Statuts de profil utilisateur. */
export const USER_BADGES: Record<string, BadgeSpec> = {
  ACTIVE: { label: "Actif", tone: "success", icon: "checkCircle" },
  PENDING: { label: "En attente", tone: "warning", icon: "hourglass" },
  INVITED: { label: "Invité", tone: "info", icon: "send" },
  DISABLED: { label: "Désactivé", tone: "muted", icon: "ban" },
};

/** Statuts d'organisation (aligné sur `FEDERATION_STATUS_*`). */
export const ORG_BADGES: Record<string, BadgeSpec> = {
  PENDING: { label: "En attente", tone: "warning", icon: "hourglass" },
  ACTIVE: { label: "Active", tone: "success", icon: "checkCircle" },
  SUSPENDED: { label: "Suspendue", tone: "danger", icon: "ban" },
  ARCHIVED: { label: "Archivée", tone: "muted", icon: "archive" },
};

/** Statuts de rapport d'organisation (OrgReportsReceived). */
export const REPORT_BADGES: Record<string, BadgeSpec> = {
  PENDING: { label: "En attente", tone: "warning", icon: "clock" },
  SENT: { label: "Envoyé", tone: "info", icon: "send" },
  READ: { label: "Lu", tone: "success", icon: "eye" },
  FAILED: { label: "Échec", tone: "danger", icon: "alert" },
};

/** Statuts d'invitation (InvitationManage — liste des invitations). */
export const INVITATION_BADGES: Record<string, BadgeSpec> = {
  ACTIVE: { label: "Actif", tone: "success", icon: "checkCircle" },
  EXPIRED: { label: "Expiré", tone: "muted", icon: "clock" },
  REVOKED: { label: "Révoqué", tone: "danger", icon: "ban" },
  EXHAUSTED: { label: "Épuisé", tone: "muted", icon: "userX" },
};

/**
 * Statuts de demande d'invitation (InvitationManage). Les rejets partagent le
 * ton danger mais gardent un libellé précis (cause du rejet).
 */
export const CLAIM_BADGES: Record<string, BadgeSpec> = {
  PENDING_SYNC: { label: "En attente", tone: "warning", icon: "refresh" },
  CONFIRMED: { label: "Confirmée", tone: "success", icon: "checkCircle" },
  REJECTED_DUPLICATE: { label: "Rejetée (doublon)", tone: "danger", icon: "xCircle" },
  REJECTED_EXPIRED: { label: "Rejetée (expirée)", tone: "danger", icon: "hourglass" },
  REJECTED_EXHAUSTED: { label: "Rejetée (épuisée)", tone: "danger", icon: "xCircle" },
  REJECTED_REVOKED: { label: "Rejetée", tone: "danger", icon: "ban" },
  REJECTED_ROLE_ESCALATION: { label: "Rejetée (escalade)", tone: "danger", icon: "shieldCheck" },
};

/** Statuts de soumission de formulaire. */
export const SUBMISSION_BADGES: Record<string, BadgeSpec> = {
  DRAFT: { label: "Brouillon", tone: "muted", icon: "file" },
  SUBMITTED: { label: "Soumis", tone: "info", icon: "send" },
  PROCESSED: { label: "Traité", tone: "success", icon: "checkCircle" },
  REJECTED: { label: "Rejeté", tone: "danger", icon: "xCircle" },
  PUBLISHED: { label: "Publié", tone: "success", icon: "eye" },
  ARCHIVED: { label: "Archivé", tone: "muted", icon: "archive" },
};

/** Statuts de commande (bons de commande / achats). */
export const ORDER_BADGES: Record<string, BadgeSpec> = {
  PENDING: { label: "En attente", tone: "warning", icon: "clock" },
  ORDERED: { label: "Commandé", tone: "info", icon: "receipt" },
  RECEIVED: { label: "Reçu", tone: "success", icon: "checkCircle" },
  CANCELLED: { label: "Annulé", tone: "danger", icon: "ban" },
};
