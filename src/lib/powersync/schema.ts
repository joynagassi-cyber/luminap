import { column, Schema, Table } from "@powersync/web";
import { invitations, invitation_claims } from "./invitation-schema";
import { organizations, org_admins } from "./org-admin-schema";

// ============================================================
// Core Tables (déjà existants)
// ============================================================

const profiles = new Table(
  {
    email: column.text,
    first_name: column.text,
    last_name: column.text,
    role: column.text,
    org_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const members = new Table(
  {
    org_id: column.text,
    first_name: column.text,
    last_name: column.text,
    phone: column.text,
    email: column.text,
    status: column.text,
    joined_at: column.text,
    archived_at: column.text,
    archived_by: column.text,
    archive_reason: column.text,
    total_dons: column.integer,
    montant_en_avance: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const transactions = new Table(
  {
    org_id: column.text,
    type: column.text,
    amount: column.integer,
    description: column.text,
    date: column.text,
    status: column.text,
    category_id: column.text,
    org_unit_id: column.text,
    compensates_for: column.text,
    comment: column.text,
    version: column.integer,
    created_by_id: column.text,
    approved_by_id: column.text,
    created_at: column.text,
    updated_at: column.text,
    approved_at: column.text,
    event_id: column.text,
    source: column.text,
    person_name: column.text,
    source_caisse_id: column.text,
    versement_id: column.text,
    reversal_of_id: column.text,
    cotisation_id: column.text,
  },
  { indexes: {} },
);

const events = new Table(
  {
    org_id: column.text,
    name: column.text,
    description: column.text,
    start_date: column.text,
    end_date: column.text,
    status: column.text,
    type: column.text,
    budget: column.integer,
    created_at: column.text,
    updated_at: column.text,
    budget_items: column.text,
  },
  { indexes: {} },
);

const notifications = new Table(
  {
    org_id: column.text,
    action_type: column.text,
    title: column.text,
    message: column.text,
    is_read: column.integer,
    source_transaction_id: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

// ============================================================
// Finance Tables
// ============================================================

const categories = new Table(
  {
    key: column.text,
    label_fr: column.text,
    type: column.text,
    org_id: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const caisses = new Table(
  {
    name: column.text,
    description: column.text,
    type: column.text,
    color: column.text,
    org_id: column.text,
    created_at: column.text,
    updated_at: column.text,
    archived_at: column.text,
    archived_by: column.text,
    archive_reason: column.text,
    status: column.text,
  },
  { indexes: {} },
);

const accounts = new Table(
  {
    org_id: column.text,
    owner_type: column.text,
    owner_id: column.text,
    name: column.text,
    currency: column.text,
    status: column.text,
    archived_at: column.text,
    archived_by: column.text,
    archive_reason: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const versements = new Table(
  {
    org_id: column.text,
    from_account_id: column.text,
    to_account_id: column.text,
    amount_cents: column.integer,
    date: column.text,
    status: column.text,
    created_by: column.text,
    approved_by: column.text,
    approved_at: column.text,
    comment: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

// ============================================================
// Organization Tables
// ============================================================

const org_units = new Table(
  {
    name: column.text,
    type: column.text,
    org_id: column.text,
    description: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const groups = new Table(
  {
    org_id: column.text,
    name: column.text,
    parent_group_id: column.text,
    responsable_member_id: column.text,
    status: column.text,
    archived_at: column.text,
    archived_by: column.text,
    archive_reason: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const group_memberships = new Table(
  {
    member_id: column.text,
    group_id: column.text,
    role: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

// ============================================================
// Event Budget Tables
// ============================================================

const event_budgets = new Table(
  {
    event_id: column.text,
    currency: column.text,
    revised_at: column.text,
    revised_by: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const budget_lines = new Table(
  {
    event_budget_id: column.text,
    category_id: column.text,
    planned_amount_cents: column.integer,
    actual_amount_cents: column.integer,
    description: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

// ============================================================
// Audit & Config Tables
// ============================================================

const audit_entries = new Table(
  {
    org_id: column.text,
    transaction_id: column.text,
    user_id: column.text,
    actor_role_at_time: column.text,
    action: column.text,
    entity_type: column.text,
    entity_id: column.text,
    before_state: column.text,
    after_state: column.text,
    comment: column.text,
    created_at: column.text,
  },
  { indexes: {} },
);

const config = new Table(
  {
    key: column.text,
    value: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

// ============================================================
// Form & Custom Field Tables
// ============================================================

const form_definitions = new Table(
  {
    id: column.text,
    org_id: column.text,
    key: column.text,
    name: column.text,
    description: column.text,
    version: column.integer,
    target_entity_type: column.text,
    fields: column.text,
    status: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { idx_form_defs_key: ["key"], idx_form_defs_org: ["org_id"] } },
);

const form_submissions = new Table(
  {
    id: column.text,
    org_id: column.text,
    form_definition_id: column.text,
    form_version: column.integer,
    entity_type: column.text,
    entity_id: column.text,
    data: column.text,
    submitted_by: column.text,
    submitted_at: column.text,
    status: column.text,
    created_at: column.text,
  },
  {
    indexes: {
      idx_form_subs_def: ["form_definition_id"],
      idx_form_subs_org: ["org_id"],
    },
  },
);

const custom_field_definitions = new Table(
  {
    org_id: column.text,
    entity_type: column.text,
    field_name: column.text,
    field_label: column.text,
    field_type: column.text,
    // Free-form options (choices, defaults) and sort order. These are
    // stored as JSON text on the Postgres side and read back verbatim by
    // the data layer (dataLayer.ts) — omitting them from the schema made
    // the local SQLite table lack the columns and `SELECT ... options`
    // throw "no such column".
    options: column.text,
    order: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const custom_field_values = new Table(
  {
    entity_type: column.text,
    entity_id: column.text,
    field_name: column.text,
    value: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

const cotisations = new Table(
  {
    org_id: column.text,
    culte_id: column.text,
    membre_id: column.text,
    statut: column.text,
    montantObligatoire: column.integer,
    montantPaye: column.integer,
    datePaiement: column.text,
    notes: column.text,
    createdAt: column.text,
    updatedAt: column.text,
  },
  {
    indexes: {
      org_id: ["org_id"],
      culte_id: ["culte_id"],
      membre_id: ["membre_id"],
      statut: ["statut"],
    },
  },
);

const report_definitions = new Table(
  {
    org_id: column.text,
    name: column.text,
    type: column.text,
    config: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: {} },
);

export const AppSchema = new Schema({
  profiles,
  members,
  transactions,
  events,
  notifications,
  categories,
  caisses,
  accounts,
  versements,
  org_units,
  groups,
  group_memberships,
  event_budgets,
  budget_lines,
  audit_entries,
  config,
  form_definitions,
  form_submissions,
  custom_field_definitions,
  custom_field_values,
  report_definitions,
  cotisations,
  invitations,
  invitation_claims,
  organizations,
  org_admins,
});

export type Database = (typeof AppSchema)["types"];
