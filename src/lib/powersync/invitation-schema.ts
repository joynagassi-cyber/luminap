import { column, Table } from "@powersync/web";

// ============================================================
// Invitation Tables
// ============================================================

// NOTE : `id` n'est PAS déclaré — PowerSync l'ajoute automatiquement comme
// pkey (les 4 tables (invitations, invitation_claims, organizations,
// org_admins) ont toutes une colonne `id` pkey côté PostgreSQL).
const invitations = new Table(
  {
    org_id: column.text,
    code: column.text,
    target_role: column.text,
    target_scope_type: column.text,
    target_group_id: column.text,
    target_member_id: column.text,
    issued_by: column.text,
    issued_at: column.text,
    expires_at: column.text,
    max_uses: column.integer,
    used_count: column.integer,
    status: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_inv_org: ["org_id"],
      idx_inv_code: ["code"],
      idx_inv_status: ["status"],
    },
  },
);

const invitation_claims = new Table(
  {
    invitation_id: column.text,
    claimed_by_device_id: column.text,
    claimed_at: column.text,
    resulting_user_id: column.text,
    status: column.text,
    reject_reason: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_claims_inv: ["invitation_id"],
      idx_claims_status: ["status"],
    },
  },
);

export { invitations, invitation_claims };
