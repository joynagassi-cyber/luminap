// Rich demo seed for Playwright audits — port of cypress/support/visualSeed.ts.
// Writes realistic rows into the local PowerSync replica so no screen is empty.

const DEMO_ORG_ID = "default-org";
const DEMO_USER_ID = "local-user";

export const IDS = {
  mainCaisse: "demo-caisse-main",
  youthCaisse: "demo-caisse-jeunesse",
  mainAccount: "demo-account-main",
  youthAccount: "demo-account-jeunesse",
  groupYouth: "demo-group-jeunesse",
  groupChoir: "demo-group-chorale",
  eventCulte: "demo-event-culte",
  eventRetreat: "demo-event-retraite",
  budget: "demo-budget-2026",
  campaign: "demo-campaign-construction",
  donor1: "demo-donor-1",
  form: "demo-form-visite",
  report: "demo-report-mensuel",
};

function iso(daysFromNow, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function day(daysFromNow) {
  return iso(daysFromNow).slice(0, 10);
}

/** Returns [sql, params][] — executed inside the replica write transaction. */
export function buildSeedRows(orgId = DEMO_ORG_ID) {
  const now = new Date().toISOString();
  const rows = [];

  rows.push([
    `INSERT OR REPLACE INTO organizations (id, name, type, status, parent_org_id, created_at, updated_at)
     VALUES (?, ?, 'Église', 'ACTIVE', NULL, ?, ?)`,
    [orgId, "Église MFE-JC Centrale", now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO profiles (id, email, first_name, last_name, role, org_id, created_at, updated_at)
     VALUES (?, ?, 'Jean', 'Nkemba', 'PASTEUR_PRINCIPAL', ?, ?, ?)`,
    [DEMO_USER_ID, "pasteur@lumina.demo", orgId, now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO org_memberships (id, user_id, org_id, role, is_primary, status, joined_at)
     VALUES ('demo-membership', ?, ?, 'PASTEUR_PRINCIPAL', 1, 'ACTIVE', ?)`,
    [DEMO_USER_ID, orgId, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO org_admins (id, admin_profile_id, org_id, status, created_at, updated_at)
     VALUES ('demo-admin-grant', ?, ?, 'ACTIVE', ?, ?)`,
    [DEMO_USER_ID, orgId, now, now],
  ]);

  rows.push([
    `INSERT OR REPLACE INTO caisses (id, name, description, type, color, org_id, created_at, updated_at)
     VALUES (?, 'Caisse principale', 'Fonds généraux de l''église', 'MAIN', '#FF6B00', ?, ?, ?)`,
    [IDS.mainCaisse, orgId, now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO caisses (id, name, description, type, color, org_id, created_at, updated_at)
     VALUES (?, 'Caisse Jeunesse', 'Activités des jeunes', 'GROUP', '#2563EB', ?, ?, ?)`,
    [IDS.youthCaisse, orgId, now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, created_at, updated_at)
     VALUES (?, ?, 'ORGANIZATION', ?, 'Caisse principale', 'XOF', 'ACTIVE', ?, ?)`,
    [IDS.mainAccount, orgId, orgId, now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO accounts (id, org_id, owner_type, owner_id, name, currency, status, created_at, updated_at)
     VALUES (?, ?, 'GROUP', ?, 'Caisse Jeunesse', 'XOF', 'ACTIVE', ?, ?)`,
    [IDS.youthAccount, orgId, IDS.groupYouth, now, now],
  ]);

  const cats = [
    ["cat-dime", "dime", "Dîme", "INCOME"],
    ["cat-offrande", "offrande", "Offrande", "INCOME"],
    ["cat-offrande-mission", "offrande_mission", "Offrande Mission", "INCOME"],
    ["cat-don", "don", "Don", "INCOME"],
    ["cat-salaire-pasteur", "salaire_pasteur", "Salaire Pasteur", "EXPENSE"],
    ["cat-frais-fonc", "frais_fonctionnement", "Frais de Fonctionnement", "EXPENSE"],
    ["cat-mission", "mission", "Mission", "EXPENSE"],
    ["cat-entretien", "entretien", "Entretien", "EXPENSE"],
    ["cat-aumone", "aumone", "Aumône", "EXPENSE"],
  ];
  for (const [id, key, label, type] of cats) {
    rows.push([
      `INSERT OR REPLACE INTO categories (id, key, label_fr, type, org_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, key, label, type, orgId, now],
    ]);
  }

  rows.push([
    `INSERT OR REPLACE INTO groups (id, org_id, name, parent_group_id, responsable_member_id, status, created_at, updated_at)
     VALUES (?, ?, 'Jeunesse', NULL, NULL, 'ACTIVE', ?, ?)`,
    [IDS.groupYouth, orgId, now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO groups (id, org_id, name, parent_group_id, responsable_member_id, status, created_at, updated_at)
     VALUES (?, ?, 'Chorale', ?, NULL, 'ACTIVE', ?, ?)`,
    [IDS.groupChoir, orgId, IDS.groupYouth, now, now],
  ]);

  const members = [
    ["demo-mem-1", "Marie", "Kabila", "ACTIVE", 250000],
    ["demo-mem-2", "Joseph", "Mbala", "ACTIVE", 120000],
    ["demo-mem-3", "Esther", "Nsimba", "ACTIVE", 80000],
    ["demo-mem-4", "Daniel", "Lukusa", "ACTIVE", 300000],
    ["demo-mem-5", "Rachel", "Mwamba", "INACTIVE", 45000],
  ];
  for (const [id, first, last, status, dons] of members) {
    rows.push([
      `INSERT OR REPLACE INTO members (id, org_id, first_name, last_name, phone, email, status, joined_at,
        total_dons, montant_en_avance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, orgId, first, last, "+243 900 000 000", `${first.toLowerCase()}.${last.toLowerCase()}@lumina.demo`, status, iso(-120), dons, now, now],
    ]);
  }
  rows.push([
    `INSERT OR REPLACE INTO group_memberships (id, org_id, member_id, group_id, role, joined_at, created_at)
     VALUES ('demo-gm-1', ?, 'demo-mem-1', ?, 'MEMBRE', ?, ?)`,
    [orgId, IDS.groupYouth, iso(-90), now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO group_memberships (id, org_id, member_id, group_id, role, joined_at, created_at)
     VALUES ('demo-gm-2', ?, 'demo-mem-4', ?, 'RESPONSABLE', ?, ?)`,
    [orgId, IDS.groupChoir, iso(-60), now],
  ]);

  const txs = [
    ["demo-tx-1", "INCOME", 15000000, "Dîme du culte dominical", "cat-dime", "APPROVED", day(-20)],
    ["demo-tx-2", "INCOME", 8500000, "Offrande spéciale", "cat-offrande", "APPROVED", day(-18)],
    ["demo-tx-3", "INCOME", 4200000, "Don d'un membre", "cat-don", "APPROVED", day(-15)],
    ["demo-tx-4", "EXPENSE", 6000000, "Salaire du pasteur", "cat-salaire-pasteur", "APPROVED", day(-12)],
    ["demo-tx-5", "EXPENSE", 1500000, "Frais d'électricité", "cat-frais-fonc", "APPROVED", day(-10)],
    ["demo-tx-6", "EXPENSE", 2000000, "Entretien du temple", "cat-entretien", "APPROVED", day(-8)],
    ["demo-tx-7", "INCOME", 3000000, "Offrande mission", "cat-offrande-mission", "PENDING", day(-5)],
    ["demo-tx-8", "EXPENSE", 750000, "Aumône aux nécessiteux", "cat-aumone", "PENDING", day(-3)],
    ["demo-tx-9", "INCOME", 1200000, "Dîme du culte", "cat-dime", "DRAFT", day(-1)],
    ["demo-tx-10", "EXPENSE", 500000, "Mission locale", "cat-mission", "APPROVED", day(-2)],
  ];
  for (const [id, type, amount, desc, cat, status, date] of txs) {
    rows.push([
      `INSERT OR REPLACE INTO transactions (id, org_id, type, amount, description, date, status, category_id,
        created_by_id, approved_by_id, created_at, updated_at, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, orgId, type, amount, desc, date, status, cat, DEMO_USER_ID, status === "APPROVED" ? DEMO_USER_ID : null, now, now, status === "APPROVED" ? iso(-1) : null],
    ]);
  }

  rows.push([
    `INSERT OR REPLACE INTO events (id, org_id, name, description, start_date, end_date, status, type, budget, created_at, updated_at)
     VALUES (?, ?, 'Retraite spirituelle', 'Week-end de retraite annuel', ?, ?, 'PLANIFIED', 'EVENT', 5000000, ?, ?)`,
    [IDS.eventRetreat, orgId, iso(14), iso(16), now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO events (id, org_id, name, description, start_date, end_date, status, type, budget, created_at, updated_at)
     VALUES (?, ?, 'Culte dominical', 'Culte hebdomadaire', ?, ?, 'ONGOING', 'CULTE', 1000000, ?, ?)`,
    [IDS.eventCulte, orgId, iso(0, 8), iso(0, 12), now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO event_tasks (id, org_id, event_id, title, description, is_sub, due_date, status, created_at, updated_at)
     VALUES ('demo-task-1', ?, ?, 'Réserver le lieu', 'Contacter le centre d''accueil', 0, ?, 'IN_PROGRESS', ?, ?)`,
    [orgId, IDS.eventRetreat, iso(7), now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO event_tasks (id, org_id, event_id, title, description, is_sub, due_date, status, created_at, updated_at)
     VALUES ('demo-task-2', ?, ?, 'Prévoir la restauration', 'Menu et budget repas', 0, ?, 'OPEN', ?, ?)`,
    [orgId, IDS.eventRetreat, iso(10), now, now],
  ]);

  rows.push([
    `INSERT OR REPLACE INTO org_budgets (id, org_id, fiscal_year, period, cost_center_label, name, total_budgeted_cents,
      status, currency, note, created_at, updated_at)
     VALUES (?, ?, 2026, 'ANNUAL', 'Caisse principale', 'Budget annuel 2026', 60000000, 'ACTIVE', 'XOF', 'Budget prévisionnel', ?, ?)`,
    [IDS.budget, orgId, now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO org_budget_lines (id, org_id, budget_id, category_id, planned_amount_cents, note, created_at, updated_at)
     VALUES ('demo-budget-line-1', ?, ?, 'cat-salaire-pasteur', 24000000, 'Salaires', ?, ?)`,
    [orgId, IDS.budget, now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO org_budget_lines (id, org_id, budget_id, category_id, planned_amount_cents, note, created_at, updated_at)
     VALUES ('demo-budget-line-2', ?, ?, 'cat-mission', 12000000, 'Missions', ?, ?)`,
    [orgId, IDS.budget, now, now],
  ]);

  rows.push([
    `INSERT OR REPLACE INTO giving_donors (id, org_id, full_name, email, phone, tax_receipt_enabled, notes, created_at, updated_at)
     VALUES (?, ?, 'Marie Kabila', 'marie@lumina.demo', '+243 900 000 001', 1, NULL, ?, ?)`,
    [IDS.donor1, orgId, now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO giving_campaigns (id, org_id, name, purpose, fund, target_amount_cents, start_date, end_date, status, notes, created_at, updated_at)
     VALUES (?, ?, 'Construction du temple', 'Nouvelle salle de culte', 'construction', 50000000, ?, ?, 'ACTIVE', NULL, ?, ?)`,
    [IDS.campaign, orgId, day(-30), day(180), now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO pledges (id, org_id, campaign_id, donor_id, pledged_amount_cents, schedule, amount_per_period_cents, start_date, end_date, status, created_at, updated_at)
     VALUES ('demo-pledge-1', ?, ?, ?, 10000000, 'MONTHLY', 1000000, ?, ?, 'ACTIVE', ?, ?)`,
    [orgId, IDS.campaign, IDS.donor1, day(-30), day(300), now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO tax_receipts (id, org_id, donor_id, year, receipt_no, total_amount_cents, issued_at, created_at, updated_at)
     VALUES ('demo-receipt-1', ?, ?, 2025, 'REC-2025-001', 2500000, ?, ?, ?)`,
    [orgId, IDS.donor1, iso(-365), now, now],
  ]);

  rows.push([
    `INSERT OR REPLACE INTO form_definitions (id, org_id, key, name, description, version, target_entity_type, fields, status, created_at, updated_at)
     VALUES (?, ?, 'visite', 'Fiche de visite', 'Suivi des visites pastorales', 1, 'member', '[]', 'PUBLISHED', ?, ?)`,
    [IDS.form, orgId, now, now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO form_submissions (id, org_id, form_definition_id, form_version, data, submitted_by, submitted_at, status, created_at)
     VALUES ('demo-sub-1', ?, ?, 1, '{"note":"Première visite"}', ?, ?, 'SUBMITTED', ?)`,
    [orgId, IDS.form, DEMO_USER_ID, iso(-4), now],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO custom_field_definitions (id, org_id, entity_type, field_name, field_label, field_type, options, "order", created_at, updated_at)
     VALUES ('demo-cf-1', ?, 'member', 'quartier', 'Quartier', 'text', NULL, '1', ?, ?)`,
    [orgId, now, now],
  ]);

  rows.push([
    `INSERT OR REPLACE INTO report_definitions (id, org_id, name, data_source, dimensions, metrics, filters, group_by, sort_by, saved_by, is_template, created_at, updated_at)
     VALUES (?, ?, 'Rapport mensuel', 'transactions', '["category"]', '["sum"]', '{}', 'category', 'sum', ?, 0, ?, ?)`,
    [IDS.report, orgId, DEMO_USER_ID, now, now],
  ]);

  rows.push([
    `INSERT OR REPLACE INTO notifications (id, org_id, action_type, title, message, is_read, created_at)
     VALUES ('demo-notif-1', ?, 'TRANSACTION_PENDING', 'Transaction à approuver', 'Une dépense de 750 000 FCFA attend votre approbation.', 0, ?)`,
    [orgId, iso(0, 9)],
  ]);
  rows.push([
    `INSERT OR REPLACE INTO notifications (id, org_id, action_type, title, message, is_read, created_at)
     VALUES ('demo-notif-2', ?, 'EVENT_REMINDER', 'Événement à venir', 'La retraite spirituelle commence dans 14 jours.', 1, ?)`,
    [orgId, iso(-1, 8)],
  ]);

  const audits = [
    ["demo-audit-1", "APPROVE", "transaction", "demo-tx-1"],
    ["demo-audit-2", "CREATE", "transaction", "demo-tx-7"],
    ["demo-audit-3", "UPDATE", "member", "demo-mem-1"],
  ];
  for (const [id, action, entity, entityId] of audits) {
    rows.push([
      `INSERT OR REPLACE INTO audit_entries (id, org_id, user_id, actor_role_at_time, action, entity_type, entity_id, comment, created_at)
       VALUES (?, ?, ?, 'PASTEUR_PRINCIPAL', ?, ?, ?, NULL, ?)`,
      [id, orgId, DEMO_USER_ID, action, entity, entityId, iso(-2)],
    ]);
  }

  rows.push([
    `INSERT OR REPLACE INTO versements (id, org_id, from_account_id, to_account_id, amount_cents, date, status, created_by, comment, created_at)
     VALUES ('demo-versement-1', ?, ?, ?, 500000, ?, 'APPROVED', ?, 'Versement jeunesse → caisse principale', ?)`,
    [orgId, IDS.youthAccount, IDS.mainAccount, day(-6), DEMO_USER_ID, now],
  ]);

  return rows;
}

const SEEDED_TABLES = [
  "organizations", "profiles", "org_memberships", "org_admins", "caisses", "accounts",
  "categories", "groups", "members", "group_memberships", "transactions", "events",
  "event_tasks", "org_budgets", "org_budget_lines", "giving_donors", "giving_campaigns",
  "pledges", "tax_receipts", "form_definitions", "form_submissions",
  "custom_field_definitions", "report_definitions", "notifications", "audit_entries",
  "versements",
];

/** Seeds the replica through the page's DEV __psDb handle. */
export async function seedDemoOrg(page, orgId = DEMO_ORG_ID) {
  const rows = buildSeedRows(orgId);
  await page.waitForFunction(() => !!window.__psDb, { timeout: 60000 });
  await page.evaluate(
    async ({ rows, tables }) => {
      const db = window.__psDb;
      await db.writeTransaction(async (tx) => {
        for (const [sql, params] of rows) await tx.execute(sql, params);
      });
      await db.execute(
        `DELETE FROM ps_crud WHERE ${tables.map(() => "data LIKE ?").join(" OR ")}`,
        tables.map((t) => `%"type":"${t}"%`),
      );
      window.__psMarkReady?.();
      localStorage.setItem("__e2e-ps-ready", "1");
    },
    { rows, tables: SEEDED_TABLES },
  );
}
