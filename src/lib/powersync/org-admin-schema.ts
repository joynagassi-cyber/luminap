import { column, Table } from "@powersync/web";

// ============================================================
// Multi-org administration tables
//   - organizations : registre du cycle de vie des organisations
//   - org_admins    : grants « admin central → organisation »
// ============================================================

const organizations = new Table(
  {
    id: column.text,
    name: column.text,
    type: column.text,
    status: column.text,
    parent_org_id: column.text,
    suspended_at: column.text,
    suspended_by: column.text,
    archived_at: column.text,
    archived_by: column.text,
    archive_reason: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_org_status: ["status"],
      idx_org_type: ["type"],
      idx_organizations_parent: ["parent_org_id"],
    },
  },
);

const org_admins = new Table(
  {
    id: column.text,
    admin_profile_id: column.text,
    org_id: column.text,
    status: column.text,
    granted_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_org_admins_admin: ["admin_profile_id"],
      idx_org_admins_org: ["org_id"],
    },
  },
);

export { organizations, org_admins };
