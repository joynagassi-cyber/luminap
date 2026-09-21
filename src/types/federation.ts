/**
 * Federation shared types — modèle agnostique (Vague 2)
 *
 * Types partagés importés par les capabilities `federation`, `security` et
 * `resource`. Ils définissent le contrat minimal du socle multi-org :
 *
 * - `AccessScope`    : libellé libre { resource, id } — aucune enum, aucun CHECK.
 * - `Grant`          : permission agnostique (resource/action libres).
 * - `Tag`            : population dynamique nommée dans une org.
 * - `TagAssignment`  : appartenance d'un user à un tag.
 * - `Invitation`     : invitation granulaire (Vague 3, cf. plan §3.1).
 *
 * Garde-fous (invariants du plan) :
 *  - Invariant 8 : `scope_resource`/`scope_id` n'ont PAS de CHECK/enum —
 *    toute ressource, tout ID. L'ajout d'une nouvelle feature = 0 migration.
 *  - Invariant 9 : `resource`/`action` sont des chaînes libres — le
 *    vocabulaire n'est jamais épuisé.
 *  - Invariant 10 : `subject_type = 'tag'` est un sujet de première classe.
 *
 * Ne JAMAIS ré-écrire ces types dans les capabilities ; importer depuis ici.
 */

// ── AccessScope LIBRE — toute ressource, tout ID ────────────────────────
export interface AccessScope {
  /** "org", "group", "event", "transaction", "report", … (LIBRE) */
  resource: string;
  /** L'ID de la ressource (UUID ou texte). */
  id: string;
}

// ── Grant agnostique ─────────────────────────────────────────────────────
export interface Grant {
  /** Auto-généré côté serveur si omis. */
  id?: string;
  /** Les 5 sources de résolution du modèle agnostique. */
  subjectType:
    | "user"
    | "org_member"
    | "group_member"
    | "role"
    | "tag";
  /** user_id / membership_id / group_membership_id / rôle / tag_id. */
  subjectId: string;
  /** "ai", "report", "transaction", … (LIBRE — pas de CHECK). */
  resource: string;
  /** "read", "write", "approve", … (LIBRE — pas de CHECK). */
  action: string;
  /** Optionnelle : si absente, le grant est global dans l'org. */
  scope?: AccessScope;
  grantedBy: string;
  grantedAt: string;
  revokedAt: string | null;
}

// ── Tag — population dynamique ───────────────────────────────────────────
export interface Tag {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ── TagAssignment — appartenance user ↔ tag ─────────────────────────────
export interface TagAssignment {
  tagId: string;
  userId: string;
  orgId: string;
  assignedAt: string;
  assignedBy: string;
}

// ── Invitation granulaire (Vague 3, §3.1) ───────────────────────────────
export interface Invitation {
  id: string;
  code: string;
  orgId: string;
  role: import("@/types").Role;
  /** LIBRE : { resource, id } (pas limité à ORG/GROUP/EVENT). */
  scope?: AccessScope;
  /** Grants agnostiques accordés au claim. */
  grants?: Grant[];
  /** tag_ids à assigner au claim (peuplent la population). */
  tags?: string[];
  /** LIBRE (pas seulement ORG|GROUP). */
  targetScopeResource?: string;
  targetScopeId?: string;
  maxUses: number;
  usedCount: number;
  /** PENDING RETIRÉ (correction §8) : c'est un état de claim, pas d'invitation. */
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "EXHAUSTED";
  issuedBy: string;
  expiresAt?: string;
}
