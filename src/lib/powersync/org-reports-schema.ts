import { column, Table } from "@powersync/web";

// ============================================================
// Rapports inter-organisations (Phase 1 Feature 2)
//   - org_reports : rapports de gestion (finances/événements/membres)
//     qu'une annexe envoie à sa mère (from_org_id → to_org_id = parent).
// ============================================================
// NOTE : `id` n'est PAS déclaré — PowerSync l'ajoute automatiquement comme
// pkey (la table `org_reports` a une PK text `id` côté PostgreSQL, cf.
// invitation-schema.ts / org-admin-schema.ts).
// `content` est un jsonb PG stocké en text ; `document_refs` un text[] PG
// stocké en text (convention du projet, cf. org_admins : les UUID pkey/SN
// et les colonnes composantes sont exposés en texte par le connecteur).

const org_reports = new Table(
  {
    from_org_id: column.text,
    to_org_id: column.text,
    period_start: column.text,
    period_end: column.text,
    format: column.text,
    title: column.text,
    content: column.text,   // jsonb (agrégats calculés)
    pdf_path: column.text,
    document_refs: column.text,  // text[] (ids documents uploadés joints)
    status: column.text,
    read_at: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      idx_org_reports_to: ["to_org_id", "period_start"],
      idx_org_reports_from: ["from_org_id", "period_start"],
    },
  },
);

export { org_reports };
