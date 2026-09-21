import { column, Table } from "@powersync/web";

// ============================================================
// Socle multi-org (Vague 1) + Modèle agnostique (Vague 2)
//   - org_memberships  : appartenance multi-rôle d'un user à des orgs
//   - grants           : permissions agnostiques (resource/action libres)
//   - tags             : populations dynamiques nommées
//   - tag_assignments  : appartenance user ↔ tag
//
// NOTE : `id` n'est PAS déclaré — PowerSync l'ajoute automatiquement comme
// pkey (les tables PostgreSQL ont toutes une colonne `id` pkey).
// Les colonnes user_id/tag_id/granted_by/assigned_by sont UUID en PG mais
// sont déclarées `column.text` ici (convention du projet, cf. org_admins :
// les UUID pkey/SN sont exposés en texte par le connecteur).
// ============================================================

const org_memberships = new Table(
  {
    user_id: column.text,
    org_id: column.text,
    role: column.text,
    is_primary: column.integer,
    status: column.text,
    joined_at: column.text,
    left_at: column.text,
  },
  {
    indexes: {
      idx_org_memberships_org: ["org_id"],
      idx_org_memberships_user: ["user_id"],
    },
  },
);

const grants = new Table(
  {
    subject_type: column.text,
    subject_id: column.text,
    resource: column.text,
    action: column.text,
    scope_resource: column.text,
    scope_id: column.text,
    granted_by: column.text,
    granted_at: column.text,
    revoked_at: column.text,
  },
  {
    indexes: {
      idx_grants_subject: ["subject_type", "subject_id"],
      idx_grants_scope: ["scope_resource", "scope_id"],
    },
  },
);

const tags = new Table(
  {
    org_id: column.text,
    name: column.text,
    description: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { idx_tags_org: ["org_id"] } },
);

const tag_assignments = new Table(
  {
    tag_id: column.text,
    user_id: column.text,
    org_id: column.text,
    assigned_at: column.text,
    assigned_by: column.text,
  },
  {
    indexes: {
      idx_ta_user: ["user_id"],
      idx_ta_tag: ["tag_id"],
    },
  },
);

export { org_memberships, grants, tags, tag_assignments };
