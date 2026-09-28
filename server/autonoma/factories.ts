/**
 * Autonoma — 37 factories (mirror 1:1 de l'entity audit).
 *
 * Chaque factory appelle le plan d'écriture de `./writes` (SQL de
 * l'app, sans side-effects navigateur) et retourne `{ id, ... }`
 * (la PK, obligatoire — `FACTORY_MISSING_PK` sinon). Le teardown
 * est un scoped-delete par clé ; l'SDK l'exécute en ordre inverse
 * pendant `down`.
 *
 * Convention des offsets temporels : les champs `*DaysOffset` /
 * `*DaysAgo` sont des entiers relatifs au moment de l'`up` (jamais
 * de date absolue commutée) :
 *   - positif  → dans le futur (`+ N jours`)
 *   - négatif  → dans le passé (`N jours avant`)
 *   - 0        → maintenant
 */
import { z } from "zod";
import { defineFactory } from "@autonoma-ai/sdk";
import { createHash } from "node:crypto";
import { pgExecute } from "./pg-db";
import * as w from "./writes";

/** `new Date() + n days` (n négatif = passé, 0 = now). */
function offsetDate(daysOffset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString();
}

/** `YYYY-MM-DD` pour les colonnes DATE (transactions.date). */
function offsetDateOnly(daysOffset: number): string {
  return offsetDate(daysOffset).slice(0, 10);
}

/** Teardown par PK (la référence `refs` stocke ce que `create` a renvoyé). */
function teardownById(table: string, key = "id") {
  return async (record: Record<string, unknown>) => {
    await pgExecute(`DELETE FROM ${table} WHERE ${key} = ?`, [record[key]]);
  };
}

const id = z.string().min(1);
const orgId = z.string().min(1);
const optionalString = z.string().nullable().optional();

/**
 * Les colonnes uuid de la base (profiles.id, org_memberships.user_id,
 * org_admins.admin_profile_id, invitations.id,
 * invitation_claims.{id, invitation_id, resulting_user_id},
 * notifications.id, role_assignments.id, grants.{id, granted_by},
 * tags.id, tag_assignments.{id, tag_id, user_id, assigned_by},
 * audit_entries.user_id, transactions.{created_by_id, approved_by_id})
 * sont de vrais uuid PG. Les slugs du scénario
 * (`user-admin-{{testRunId}}`) n'y rentrent PAS : on les convertit en
 * uuid v5 déterministe (namespace Lumina). La `refs` renvoyée par la
 * factory garde le slug d'origine comme `id` (le scénario y fait
 * référence) — le teardown est fait sur le uuid interne via
 * `refs.internalId`.
 */

const LUMINA_UUID_NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/** Slug de scénario → uuid v5 déterministe (sans dépendance externe). */
export function slugToUuid(slug: string): string {
  const base = `urn:autonoma:lumina:${LUMINA_UUID_NS}:${slug}`;
  const h = createHash("sha1").update(base).digest();
  h[6] = (h[6] & 0x0f) | 0x50; // version 5
  h[8] = (h[8] & 0x3f) | 0x80; // variant
  const hex = h
    .slice(0, 16)
    .toString("hex")
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
  return hex;
}

// Teardown qui opère sur `refs.internalId` (le uuid PG réellement
// inséré) plutôt que sur `refs.id` (le slug du scénario, non uuid).
function teardownByInternal(table: string) {
  return async (record: Record<string, unknown>) => {
    const uuid = record["internalId"] as string | undefined;
    if (!uuid) return;
    await pgExecute(`DELETE FROM ${table} WHERE id = ?`, [uuid]);
  };
}

// ────────────────────────────────────────────────────────────────────
// RACINES — organizations (registre ; PENDING → ACTIVE par le scénario)
// ────────────────────────────────────────────────────────────────────
export const organizations = defineFactory({
  inputSchema: z.object({
    id,
    name: z.string(),
    type: z.enum(["CENTRAL", "CHURCH", "SCHOOL", "ENTERPRISE"]).optional(),
    status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
  }),
  async create(data) {
    await w.writeOrganization({
      id: data.id,
      name: data.name,
      type: data.type,
      status: "PENDING", // registre : toujours PENDING à la création
    });
    if ((data.status ?? "PENDING") === "ACTIVE") {
      await pgExecute(
        `UPDATE organizations SET status = 'ACTIVE', updated_at = NOW()
         WHERE id = ?`,
        [data.id],
      );
    }
    return { id: data.id, name: data.name };
  },
  async teardown(record) {
    const org = (record as { id: string }).id;
    // Cascade complète par org (ordre enfant → parent, cf. audit + FK).
    // NB : event_budgets / budget_lines / group_memberships n'ont PAS de
    // colonne org_id → leur teardown passe par les factories dédiées
    // (SDK `down` inverse l'ordre de création).
    const tables = [
      "transaction_giving",
      "tax_receipts",
      "pledges",
      "giving_campaigns",
      "giving_donors",
      "org_budget_lines",
      "org_budgets",
      "cotisations",
      "versements",
      "transactions",
      "events",
      "custom_field_values",
      "custom_field_definitions",
      "form_submissions",
      "form_definitions",
      "report_definitions",
      "role_assignments",
      "audit_entries",
      "notifications",
      "invitation_claims",
      "invitations",
      "members",
      "caisses",
      "accounts",
      "groups",
      "org_units",
      "org_admins",
      "org_memberships",
      "profiles",
    ];
    for (const t of tables) {
      await pgExecute(`DELETE FROM ${t} WHERE org_id = ?`, [org]);
    }
    // tags / tag_assignments : par org ; grants : supprimés par leur
    // propre factory (scoped-delete par id) — pas de colonne org_id.
    await pgExecute(`DELETE FROM tag_assignments WHERE org_id = ?`, [org]);
    await pgExecute(`DELETE FROM tags WHERE org_id = ?`, [org]);
    await pgExecute(`DELETE FROM organizations WHERE id = ?`, [org]);
  },
});

// ────────────────────────────────────────────────────────────────────
// profiles : la colonne `id` de profiles est `uuid` en PG (et égale à
// l'id Supabase Auth). Le scénario fournit des slugs → conversion
// déterministe en uuid v5, le slug d'origine restant lisible dans la
// ligne profiles (email / role / status).
// ────────────────────────────────────────────────────────────────────
export const profiles = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    email: z.string().email(),
    first_name: optionalString,
    last_name: optionalString,
    role: z.string().optional(),
    status: z.enum(["ACTIVE", "PENDING", "INACTIVE"]).optional(),
  }),
  async create(data) {
    const r = w.writeProfile({
      id: slugToUuid(data.id),
      email: data.email,
      firstName: data.first_name ?? undefined,
      lastName: data.last_name ?? undefined,
      role: data.role ?? undefined,
      orgId: data.org_id,
      status: data.status ?? "ACTIVE",
    });
    return { id: data.id, internalId: r.id, email: data.email };
  },
  teardown: teardownByInternal("profiles"),
});

// ────────────────────────────────────────────────────────────────────
// org_memberships (INSERT inline — pas de fonction réutilisable)
// ────────────────────────────────────────────────────────────────────
export const orgMemberships = defineFactory({
  inputSchema: z.object({
    user_id: orgId,
    org_id: orgId,
    role: z.string().optional(),
    status: z.enum(["ACTIVE", "PENDING"]).optional(),
    is_primary: z.boolean().optional(),
  }),
  async create(data) {
    const r = await w.writeOrgMembership({
      userId: slugToUuid(data.user_id),
      orgId: data.org_id,
      role: data.role,
      status: data.status,
    });
    return { id: r.id, user_id: data.user_id, org_id: data.org_id };
  },
  teardown: teardownById("org_memberships"),
});

// ────────────────────────────────────────────────────────────────────
// org_admins (grantOrgAdminPS — id uuid par la base)
// ────────────────────────────────────────────────────────────────────
export const orgAdmins = defineFactory({
  inputSchema: z.object({
    admin_profile_id: orgId,
    org_id: orgId,
    status: z.enum(["ACTIVE", "REVOKED"]).optional(),
    granted_by: optionalString,
  }),
  async create(data) {
    const r = await w.writeOrgAdmin({
      adminProfileId: slugToUuid(data.admin_profile_id),
      orgId: data.org_id,
      grantedBy: data.granted_by ?? null,
    });
    if (data.status && data.status !== "ACTIVE") {
      await pgExecute(`UPDATE org_admins SET status = ? WHERE id = ?`, [
        data.status,
        r.id,
      ]);
    }
    return { ...r, org_id: data.org_id, admin_profile_id: data.admin_profile_id };
  },
  teardown: teardownById("org_admins"),
});

// ────────────────────────────────────────────────────────────────────
// groups (createGroupPS : 4 lignes partageant le même id)
// NB : `org_units` est créé par sa propre factory (ids partagés).
export const groups = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    name: z.string(),
    unit_type: z.enum(["groupe", "direction", "GROUP"]).optional(),
    description: optionalString,
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
    /** Si vrai, la ligne `org_units` associée n'est PAS créée ici
     *  (elle l'est par la factory `org_units`). Défaut : true. */
    skipOrgUnit: z.boolean().optional(),
  }),
  async create(data) {
    return w.writeGroup({
      id: data.id,
      orgId: data.org_id,
      name: data.name,
      type: data.unit_type ?? "groupe",
      description: data.description ?? undefined,
      groupStatus: data.status ?? "ACTIVE",
      skipOrgUnit: data.skipOrgUnit ?? true,
    });
  },
  async teardown(record) {
    const g = (record as { id: string }).id;
    await pgExecute(`DELETE FROM group_memberships WHERE group_id = ?`, [g]);
    await pgExecute(`DELETE FROM caisses WHERE id = ?`, [g]);
    await pgExecute(`DELETE FROM accounts WHERE id = ?`, [g]);
    await pgExecute(`DELETE FROM groups WHERE id = ?`, [g]);
    // NB : org_units n'est supprimé que par sa propre factory
    // (skipOrgUnit=true par défaut) pour ne pas double-supprimer.
  },
});

// org_units standalone (unité simple sans le quadruplet du group).
export const orgUnits = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    name: z.string(),
    type: z.string().optional(),
    description: optionalString,
  }),
  async create(data) {
    const now = new Date().toISOString();
    await pgExecute(
      `INSERT INTO org_units
         (id, name, type, org_id, description, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        data.id,
        data.name,
        data.type ?? "groupe",
        data.org_id,
        data.description ?? "",
        now,
        now,
      ],
    );
    return { id: data.id };
  },
  teardown: teardownById("org_units"),
});

// ────────────────────────────────────────────────────────────────────
// members (addMemberPS)
// ────────────────────────────────────────────────────────────────────
export const members = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    first_name: z.string(),
    last_name: z.string(),
    email: optionalString,
    phone: optionalString,
    status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
    /** jours avant le seeding (ex. 365 = 1 an avant). */
    joinedDaysAgo: z.number().int().optional(),
  }),
  async create(data) {
    return w.writeMember({
      id: data.id,
      orgId: data.org_id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      status: data.status ?? "ACTIVE",
      joinedAt: offsetDate(-(data.joinedDaysAgo ?? 0)),
    });
  },
  teardown: teardownById("members"),
});

// ────────────────────────────────────────────────────────────────────
// group_memberships (addGroupMembershipPS)
// ────────────────────────────────────────────────────────────────────
export const groupMemberships = defineFactory({
  inputSchema: z.object({
    id,
    member_id: orgId,
    group_id: orgId,
    role: z.string().optional(),
    joinedDaysAgo: z.number().int().optional(),
  }),
  async create(data) {
    return w.writeGroupMembership({
      id: data.id,
      memberId: data.member_id,
      groupId: data.group_id,
      role: data.role,
      joinedAt: offsetDate(-(data.joinedDaysAgo ?? 0)),
    });
  },
  teardown: teardownById("group_memberships"),
});

// ────────────────────────────────────────────────────────────────────
// accounts / caisses standalone (hors group)
// ────────────────────────────────────────────────────────────────────
export const accounts = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    owner_type: z.string().optional(),
    owner_id: orgId,
    name: z.string(),
    currency: z.string().optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  }),
  async create(data) {
    return w.writeAccount({
      id: data.id,
      orgId: data.org_id,
      ownerType: data.owner_type ?? "ORGANIZATION",
      ownerId: data.owner_id,
      name: data.name,
      currency: data.currency ?? "XOF",
    });
  },
  teardown: teardownById("accounts"),
});

export const caisses = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    name: z.string(),
    type: z.string().optional(),
    description: optionalString,
  }),
  async create(data) {
    return w.writeCaisse({
      id: data.id,
      orgId: data.org_id,
      name: data.name,
      type: data.type,
      description: data.description ?? undefined,
    });
  },
  teardown: teardownById("caisses"),
});

// ────────────────────────────────────────────────────────────────────
// categories (INSERT inline : key + label_fr + type)
// ────────────────────────────────────────────────────────────────────
export const categories = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    key: z.string(),
    label_fr: z.string(),
    type: z.enum(["income", "expense"]).optional(),
  }),
  async create(data) {
    return w.writeCategory({
      id: data.id,
      orgId: data.org_id,
      key: data.key,
      labelFr: data.label_fr,
      type: data.type ?? "income",
    });
  },
  teardown: teardownById("categories"),
});

// ────────────────────────────────────────────────────────────────────
// transactions (addTransactionPS)
// ────────────────────────────────────────────────────────────────────
export const transactions = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    type: z.enum(["income", "expense"]).optional(),
    amount: z.number().int(),
    description: z.string(),
    /** `YYYY-MM-DD` ou offset : négatif = passé, 0 = now. */
    dateDaysOffset: z.number().int().optional(),
    status: z
      .enum(["approved", "pending", "rejected", "APPROVED", "PENDING", "REJECTED"])
      .optional(),
    category_id: optionalString,
    source_caisse_id: optionalString,
    versement_id: optionalString,
    event_id: optionalString,
    person_name: optionalString,
    source: optionalString,
    created_by_id: optionalString,
    approved_by_id: optionalString,
  }),
  async create(data) {
    return w.writeTransaction({
      id: data.id,
      orgId: data.org_id,
      type: (data.type ?? "income").toUpperCase(),
      amount: data.amount,
      description: data.description,
      date: offsetDateOnly(data.dateDaysOffset ?? 0),
      status: (data.status ?? "approved").toUpperCase(),
      categoryId: data.category_id ?? "cat-dime",
      sourceCaisseId: data.source_caisse_id ?? null,
      versementId: data.versement_id ?? null,
      eventId: data.event_id ?? null,
      source: data.source ?? null,
      personName: data.person_name ?? null,
      createdBy: slugToUuid(data.created_by_id ?? "seed-user"),
      approvedBy: data.approved_by_id ? slugToUuid(data.approved_by_id) : null,
    });
  },
  teardown: teardownById("transactions"),
});

// ────────────────────────────────────────────────────────────────────
// versements (createVersement + 2 transactions appairées)
// ────────────────────────────────────────────────────────────────────
export const versements = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    from_account_id: orgId,
    to_account_id: z.string().optional(),
    amount_cents: z.number().int(),
    /** 0 = maintenant, négatif = passé, positif = futur. */
    dateDaysOffset: z.number().int().optional(),
    status: z.enum(["APPROVED", "SUBMITTED"]).optional(),
    source_tx_id: z.string().optional(),
    target_tx_id: z.string().optional(),
  }),
  async create(data) {
    // La colonne `created_by` de versements est `text` (jamais uuid)
    // mais les transactions appairées qui la référencent (`created_by_id`
    // et `approved_by_id` de `transactions`) sont `uuid` : on utilise
    // donc l'uuid de seed commun (déterministe) pour les deux.
    const seedUserUuid = slugToUuid("seed-user");
    const createdBy = "seed-user";
    const date = offsetDateOnly(data.dateDaysOffset ?? 0);
    const comment = `Versement ${Math.round(data.amount_cents / 100)} FCFA -> Caisse principale`;
    await pgExecute(
      `INSERT INTO versements
         (id, org_id, from_account_id, to_account_id, amount_cents, date,
          status, created_by, approved_by, approved_at, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())`,
      [
        data.id,
        data.org_id,
        data.from_account_id,
        data.to_account_id ?? "main",
        data.amount_cents,
        date,
        data.status ?? "APPROVED",
        createdBy,
        createdBy,
        comment,
      ],
    );
    // Transactions appairées (EXPENSE source / INCOME target) — même
    // plan que createVersement, ids contrôlés, created_by uuid de seed.
    const sourceTxId = data.source_tx_id ?? `tx-src-${data.id}`;
    const targetTxId = data.target_tx_id ?? `tx-tgt-${data.id}`;
    const nowIso = new Date().toISOString();
    await w.writeTransaction({
      id: sourceTxId,
      orgId: data.org_id,
      type: "EXPENSE",
      amount: data.amount_cents,
      description: "Versement vers caisse principale",
      date,
      status: "APPROVED",
      categoryId: "cat-dime",
      source: "CAISSE",
      comment,
      createdBy: seedUserUuid,
      approvedBy: seedUserUuid,
      approvedAt: nowIso,
      sourceCaisseId: data.from_account_id,
      versementId: data.id,
    });
    await w.writeTransaction({
      id: targetTxId,
      orgId: data.org_id,
      type: "INCOME",
      amount: data.amount_cents,
      description: "Versement de groupe",
      date,
      status: "APPROVED",
      categoryId: "cat-dime",
      source: "CAISSE",
      comment,
      createdBy: seedUserUuid,
      approvedBy: seedUserUuid,
      approvedAt: nowIso,
      sourceCaisseId: data.to_account_id ?? "main",
      versementId: data.id,
    });
    return { id: data.id, sourceTxId, targetTxId };
  },
  async teardown(record) {
    const r = record as { id: string; sourceTxId?: string; targetTxId?: string };
    if (r.sourceTxId)
      await pgExecute(`DELETE FROM transactions WHERE id = ?`, [r.sourceTxId]);
    if (r.targetTxId)
      await pgExecute(`DELETE FROM transactions WHERE id = ?`, [r.targetTxId]);
    await pgExecute(`DELETE FROM versements WHERE id = ?`, [r.id]);
  },
});

// ────────────────────────────────────────────────────────────────────
// events (addEventPS)
// ────────────────────────────────────────────────────────────────────
export const events = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    name: z.string(),
    type: z.string().optional(),
    status: z.enum(["COMPLETED", "ONGOING", "PLANIFIED"]).optional(),
    /** jours relatifs au seeding (négatif = passé). */
    startDaysOffset: z.number().int().optional(),
    endDaysOffset: z.number().int().optional(),
    budget: z.number().int().optional(),
    budget_items: z.string().optional(),
  }),
  async create(data) {
    return w.writeEvent({
      id: data.id,
      orgId: data.org_id,
      name: data.name,
      type: data.type ?? "EVENT",
      status: data.status ?? "PLANIFIED",
      startDate: offsetDate(data.startDaysOffset ?? 0).slice(0, 10),
      endDate:
        data.endDaysOffset !== undefined
          ? offsetDate(data.endDaysOffset).slice(0, 10)
          : null,
      budget: data.budget ?? 0,
      budgetItems: data.budget_items ?? "[]",
    });
  },
  teardown: teardownById("events"),
});

// ────────────────────────────────────────────────────────────────────
// event_budgets / budget_lines
// ────────────────────────────────────────────────────────────────────
export const eventBudgets = defineFactory({
  inputSchema: z.object({
    id,
    event_id: orgId,
    currency: z.string().optional(),
    /** jours relatifs au seeding (null = jamais révisé). */
    revisedDaysOffset: z.number().int().nullable().optional(),
  }),
  async create(data) {
    const r = await w.writeEventBudget({
      id: data.id,
      eventId: data.event_id,
      currency: data.currency ?? "XOF",
    });
    if (data.revisedDaysOffset !== null && data.revisedDaysOffset !== undefined) {
      await pgExecute(
        `UPDATE event_budgets SET revised_at = ?, revised_by = 'autonoma'
         WHERE id = ?`,
        [offsetDate(data.revisedDaysOffset), data.id],
      );
    }
    return r;
  },
  teardown: async (record) => {
    const r = record as { id: string };
    await pgExecute(`DELETE FROM budget_lines WHERE event_budget_id = ?`, [
      r.id,
    ]);
    await pgExecute(`DELETE FROM event_budgets WHERE id = ?`, [r.id]);
  },
});

export const budgetLines = defineFactory({
  inputSchema: z.object({
    id,
    event_budget_id: orgId,
    category_id: orgId,
    planned_amount_cents: z.number().int(),
    actual_amount_cents: z.number().int().optional(),
  }),
  async create(data) {
    return w.writeBudgetLine({
      id: data.id,
      eventBudgetId: data.event_budget_id,
      categoryId: data.category_id,
      plannedAmountCents: data.planned_amount_cents,
      description: null,
    });
  },
  teardown: teardownById("budget_lines"),
});

// ────────────────────────────────────────────────────────────────────
// cotisations (addCotisationPS — mapping culte_id/membre_id)
// ────────────────────────────────────────────────────────────────────
export const cotisations = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    culte_id: orgId,
    membre_id: orgId,
    statut: z.enum(["PAID", "ABSENT", "NON_PAYE"]).optional(),
    montantobligatoire: z.number().int().optional(),
    montantpaye: z.number().int().optional(),
    paidDaysOffset: z.number().int().nullable().optional(),
  }),
  async create(data) {
    return w.writeCotisation({
      id: data.id,
      orgId: data.org_id,
      culteId: data.culte_id,
      membreId: data.membre_id,
      statut: data.statut ?? "NON_PAYE",
      montantObligatoire: data.montantobligatoire ?? 5000,
      montantPaye: data.montantpaye ?? 0,
      datePaiement:
        data.paidDaysOffset === null || data.paidDaysOffset === undefined
          ? null
          : offsetDate(data.paidDaysOffset),
    });
  },
  teardown: teardownById("cotisations"),
});

// ────────────────────────────────────────────────────────────────────
// org_budgets / org_budget_lines (budgets capability)
// ────────────────────────────────────────────────────────────────────
export const orgBudgets = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    fiscal_year: z.number().int(),
    name: z.string(),
    period: z.enum(["ANNUAL", "Q1", "Q2", "Q3", "Q4"]).optional(),
    total_budgeted_cents: z.number().int().optional(),
    status: z.enum(["ACTIVE", "ARCHIVED", "DRAFT", "CLOSED"]).optional(),
    currency: z.string().optional(),
  }),
  async create(data) {
    return w.writeOrgBudget({
      id: data.id,
      orgId: data.org_id,
      fiscalYear: data.fiscal_year,
      name: data.name,
      period: data.period ?? "ANNUAL",
      totalBudgetedCents: data.total_budgeted_cents ?? 0,
      status: data.status ?? "ACTIVE",
      currency: data.currency ?? "XOF",
    });
  },
  teardown: async (record) => {
    const r = record as { id: string };
    await pgExecute(`DELETE FROM org_budget_lines WHERE budget_id = ?`, [r.id]);
    await pgExecute(`DELETE FROM org_budgets WHERE id = ?`, [r.id]);
  },
});

export const orgBudgetLines = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    budget_id: orgId,
    category_id: optionalString,
    planned_amount_cents: z.number().int(),
    note: optionalString,
  }),
  async create(data) {
    return w.writeOrgBudgetLine({
      id: data.id,
      orgId: data.org_id,
      budgetId: data.budget_id,
      categoryId: data.category_id ?? null,
      plannedAmountCents: data.planned_amount_cents,
      note: data.note ?? null,
    });
  },
  teardown: teardownById("org_budget_lines"),
});

// ────────────────────────────────────────────────────────────────────
// giving (donors / campaigns / pledges / receipts / links)
// ────────────────────────────────────────────────────────────────────
export const givingDonors = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    full_name: z.string(),
    email: optionalString,
    phone: optionalString,
    member_id: optionalString,
    tax_receipt_enabled: z.boolean().optional(),
  }),
  async create(data) {
    return w.writeGivingDonor({
      id: data.id,
      orgId: data.org_id,
      fullName: data.full_name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      memberId: data.member_id ?? null,
      taxReceiptEnabled: data.tax_receipt_enabled ?? false,
    });
  },
  teardown: teardownById("giving_donors"),
});

export const givingCampaigns = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    name: z.string(),
    purpose: optionalString,
    fund: optionalString,
    target_amount_cents: z.number().int().optional(),
    /** offsets relatifs au seeding (jours). */
    startDaysOffset: z.number().int().optional(),
    endDaysOffset: z.number().int().optional(),
    status: z.enum(["ACTIVE", "CLOSED", "DRAFT"]).optional(),
  }),
  async create(data) {
    return w.writeGivingCampaign({
      id: data.id,
      orgId: data.org_id,
      name: data.name,
      purpose: data.purpose ?? null,
      fund: data.fund ?? null,
      targetAmountCents: data.target_amount_cents ?? 0,
      startDate: offsetDate(data.startDaysOffset ?? 0),
      endDate: offsetDate(data.endDaysOffset ?? 0),
      status: data.status ?? "ACTIVE",
    });
  },
  teardown: teardownById("giving_campaigns"),
});

export const pledges = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    campaign_id: orgId,
    donor_id: orgId,
    pledged_amount_cents: z.number().int(),
    schedule: z.enum(["ONCE", "MONTHLY", "WEEKLY", "ANNUAL"]).optional(),
    amount_per_period_cents: z.number().int().optional(),
    status: z.enum(["ACTIVE", "PAID", "CANCELLED"]).optional(),
  }),
  async create(data) {
    return w.writePledge({
      id: data.id,
      orgId: data.org_id,
      campaignId: data.campaign_id,
      donorId: data.donor_id,
      pledgedAmountCents: data.pledged_amount_cents,
      schedule: data.schedule ?? "ONCE",
      amountPerPeriodCents: data.amount_per_period_cents ?? 0,
      status: data.status ?? "ACTIVE",
    });
  },
  teardown: teardownById("pledges"),
});

export const taxReceipts = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    donor_id: orgId,
    year: z.number().int(),
    receipt_no: z.string(),
    total_amount_cents: z.number().int().optional(),
    issuedDaysOffset: z.number().int().optional(),
  }),
  async create(data) {
    return w.writeTaxReceipt({
      id: data.id,
      orgId: data.org_id,
      donorId: data.donor_id,
      year: data.year,
      receiptNo: data.receipt_no,
      totalAmountCents: data.total_amount_cents ?? 0,
      issuedAt: offsetDate(data.issuedDaysOffset ?? 0),
    });
  },
  teardown: teardownById("tax_receipts"),
});

export const transactionGiving = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    transaction_id: orgId,
    donor_id: orgId,
    campaign_id: optionalString,
  }),
  async create(data) {
    return w.writeTransactionGiving({
      id: data.id,
      orgId: data.org_id,
      transactionId: data.transaction_id,
      donorId: data.donor_id,
      campaignId: data.campaign_id ?? null,
    });
  },
  teardown: teardownById("transaction_giving"),
});

// ────────────────────────────────────────────────────────────────────
// invitations / claims
// ────────────────────────────────────────────────────────────────────
export const invitations = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    code: z.string(),
    target_role: z.string(),
    target_scope_type: z.enum(["ORG", "GROUP", "RESOURCE"]).optional(),
    target_group_id: optionalString,
    issued_by: z.string().optional(),
    /** jours relatifs au seeding (7 = dans 7 jours). */
    expiresDaysOffset: z.number().int().optional(),
    max_uses: z.number().int().optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "REVOKED"]).optional(),
  }),
  async create(data) {
    const r = await w.writeInvitation({
      id: slugToUuid(data.id),
      orgId: data.org_id,
      code: data.code,
      targetRole: data.target_role,
      targetScopeType: data.target_scope_type ?? "ORG",
      targetGroupId: data.target_group_id ? slugToUuid(data.target_group_id) : null,
      issuedBy: data.issued_by ?? "autonoma",
      expiresAt: offsetDate(data.expiresDaysOffset ?? 30),
      maxUses: data.max_uses ?? 1,
    });
    if (data.status && data.status !== "ACTIVE") {
      await pgExecute(`UPDATE invitations SET status = ? WHERE id = ?`, [
        data.status,
        r.id,
      ]);
    }
    return { ...r, id: data.id, internalId: r.id };
  },
  teardown: teardownByInternal("invitations"),
});

export const invitationClaims = defineFactory({
  inputSchema: z.object({
    id,
    invitation_id: orgId,
    status: z.enum(["PENDING_SYNC", "CONFIRMED", "REJECTED"]).optional(),
    /** jours relatifs au seeding (négatif = passé). */
    claimedDaysOffset: z.number().int().optional(),
    claimed_by_device_id: optionalString,
    resulting_user_id: optionalString,
  }),
  async create(data) {
    const r = await w.writeInvitationClaim({
      id: slugToUuid(data.id),
      invitationId: slugToUuid(data.invitation_id),
      claimedByDeviceId: data.claimed_by_device_id ?? null,
      resultingUserId: data.resulting_user_id
        ? slugToUuid(data.resulting_user_id)
        : null,
      status: data.status ?? "PENDING_SYNC",
    });
    if (data.claimedDaysOffset !== undefined) {
      await pgExecute(
        `UPDATE invitation_claims SET claimed_at = ? WHERE id = ?`,
        [offsetDate(data.claimedDaysOffset), r.id],
      );
    }
    return { ...r, id: data.id, internalId: r.id };
  },
  teardown: teardownByInternal("invitation_claims"),
});

// ────────────────────────────────────────────────────────────────────
// notifications (createNotification est pure en app : INSERT inline)
// ────────────────────────────────────────────────────────────────────
export const notifications = defineFactory({
  inputSchema: z.object({
    org_id: orgId,
    action_type: z.string(),
    title: z.string(),
    message: z.string(),
    is_read: z.boolean().optional(),
    source_transaction_id: optionalString,
  }),
  async create(data) {
    const r = await w.writeNotification({
      orgId: data.org_id,
      actionType: data.action_type,
      title: data.title,
      message: data.message,
      sourceTransactionId: data.source_transaction_id ?? null,
      isRead: data.is_read ?? false,
    });
    return { ...r, org_id: data.org_id };
  },
  teardown: teardownById("notifications"),
});

// ────────────────────────────────────────────────────────────────────
// audit_entries (writeAudit)
// ────────────────────────────────────────────────────────────────────
export const auditEntries = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    action: z.string(),
    entity_type: z.string(),
    entity_id: z.string(),
    actor_role_at_time: optionalString,
    transaction_id: optionalString,
    comment: optionalString,
  }),
  async create(data) {
    return w.writeAuditEntry({
      id: data.id,
      orgId: data.org_id,
      transactionId: data.transaction_id ?? null,
      userId: slugToUuid("seed-user"),
      actorRoleAtTime: data.actor_role_at_time ?? null,
      action: data.action,
      entityType: data.entity_type,
      entityId: data.entity_id,
      beforeState: null,
      afterState: null,
      comment: data.comment ?? null,
    });
  },
  teardown: teardownById("audit_entries"),
});

// ────────────────────────────────────────────────────────────────────
// role_assignments (INSERT inline ; UNIQUE(session_id))
// ────────────────────────────────────────────────────────────────────
export const roleAssignments = defineFactory({
  inputSchema: z.object({
    session_id: z.string(),
    role: z.string(),
    org_id: orgId,
  }),
  async create(data) {
    const r = await w.writeRoleAssignment({
      orgId: data.org_id,
      role: data.role,
      sessionId: data.session_id,
    });
    return { ...r, org_id: data.org_id };
  },
  teardown: teardownById("role_assignments"),
});

// ────────────────────────────────────────────────────────────────────
// report_definitions (reportDefinitionRepo.create)
// ────────────────────────────────────────────────────────────────────
export const reportDefinitions = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    name: z.string(),
    data_source: z.string(),
    is_template: z.boolean().optional(),
    dimensions: z.array(z.string()).optional(),
    metrics: z.array(z.string()).optional(),
    group_by: z.array(z.string()).optional(),
  }),
  async create(data) {
    return w.writeReportDefinition({
      id: data.id,
      orgId: data.org_id,
      name: data.name,
      dataSource: data.data_source,
      dimensions: data.dimensions ?? [],
      metrics: data.metrics ?? [],
      groupBy: data.group_by ?? [],
      isTemplate: data.is_template ?? false,
    });
  },
  teardown: teardownById("report_definitions"),
});

// ────────────────────────────────────────────────────────────────────
// form_definitions / form_submissions
// ────────────────────────────────────────────────────────────────────
export const formDefinitions = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    key: z.string(),
    name: z.string(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    fields: z.array(z.unknown()).optional(),
  }),
  async create(data) {
    return w.writeFormDefinition({
      id: data.id,
      orgId: data.org_id,
      key: data.key,
      name: data.name,
      status: data.status ?? "DRAFT",
      fields: (data.fields ?? []) as Record<string, unknown>[],
    });
  },
  teardown: teardownById("form_definitions"),
});

export const formSubmissions = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    form_definition_id: orgId,
    submitted_by: z.string(),
    status: z.enum(["SUBMITTED", "PROCESSED", "REJECTED"]).optional(),
    form_version: z.number().int().optional(),
    data: z.record(z.unknown()).optional(),
  }),
  async create(data) {
    return w.writeFormSubmission({
      id: data.id,
      orgId: data.org_id,
      formDefinitionId: data.form_definition_id,
      formVersion: data.form_version ?? 1,
      submittedBy: data.submitted_by,
      data: (data.data ?? {}) as Record<string, unknown>,
      status: data.status ?? "SUBMITTED",
    });
  },
  teardown: teardownById("form_submissions"),
});

// ────────────────────────────────────────────────────────────────────
// custom_field_definitions / values
// ────────────────────────────────────────────────────────────────────
export const customFieldDefinitions = defineFactory({
  inputSchema: z.object({
    id,
    org_id: orgId,
    entity_type: z.string(),
    key: z.string(),
    label: z.string(),
    type: z.string(),
    options: z.array(z.string()).optional(),
  }),
  async create(data) {
    return w.writeCustomFieldDefinition({
      id: data.id,
      orgId: data.org_id,
      entityType: data.entity_type,
      key: data.key,
      label: data.label,
      type: data.type,
      options: data.options ?? null,
    });
  },
  teardown: teardownById("custom_field_definitions"),
});

export const customFieldValues = defineFactory({
  inputSchema: z.object({
    id,
    entity_type: z.string(),
    entity_id: z.string(),
    custom_field_definition_id: z.string(),
    value: z.unknown(),
  }),
  async create(data) {
    return w.writeCustomFieldValue({
      id: data.id,
      entityType: data.entity_type,
      entityId: data.entity_id,
      definitionId: data.custom_field_definition_id,
      value: data.value,
    });
  },
  teardown: teardownById("custom_field_values"),
});

// ────────────────────────────────────────────────────────────────────
// tags / tag_assignments (createTagPS / assignTagPS)
// ────────────────────────────────────────────────────────────────────
export const tags = defineFactory({
  inputSchema: z.object({
    org_id: orgId,
    name: z.string(),
    description: optionalString,
  }),
  async create(data) {
    const r = await w.writeTag({
      orgId: data.org_id,
      name: data.name,
      description: data.description ?? null,
    });
    return { ...r, org_id: data.org_id };
  },
  teardown: teardownById("tags"),
});

export const tagAssignments = defineFactory({
  inputSchema: z.object({
    tag_id: orgId,
    user_id: orgId,
    org_id: orgId,
    assigned_by: optionalString,
  }),
  async create(data) {
    const r = await w.writeTagAssignment({
      tagId: slugToUuid(data.tag_id),
      userId: slugToUuid(data.user_id),
      orgId: data.org_id,
      assignedBy: data.assigned_by
        ? slugToUuid(data.assigned_by)
        : slugToUuid("seed-user"),
    });
    return { ...r, tag_id: data.tag_id, user_id: data.user_id, org_id: data.org_id };
  },
  teardown: teardownById("tag_assignments"),
});

// ────────────────────────────────────────────────────────────────────
// grants (createGrantPS — schéma agnostique)
// ────────────────────────────────────────────────────────────────────
export const grants = defineFactory({
  inputSchema: z.object({
    subject_type: z.enum([
      "role",
      "user",
      "org_member",
      "group_member",
      "tag",
    ]),
    subject_id: z.string(),
    resource: z.string(),
    action: z.string(),
    scope_resource: optionalString,
    scope_id: optionalString,
    granted_by: optionalString,
  }),
  async create(data) {
    const r = await w.writeGrant({
      subjectType: data.subject_type,
      subjectId: data.subject_id,
      resource: data.resource,
      action: data.action,
      scopeResource: data.scope_resource ?? null,
      scopeId: data.scope_id ?? null,
      grantedBy: data.granted_by ? slugToUuid(data.granted_by) : null,
    });
    return { ...r, subject_type: data.subject_type, subject_id: data.subject_id };
  },
  teardown: teardownById("grants"),
});

// ────────────────────────────────────────────────────────────────────
// REGISTRY
// ────────────────────────────────────────────────────────────────────
export const factories = {
  organizations,
  profiles,
  org_memberships: orgMemberships,
  org_admins: orgAdmins,
  org_units: orgUnits,
  groups,
  group_memberships: groupMemberships,
  members,
  accounts,
  caisses,
  categories,
  transactions,
  versements,
  events,
  event_budgets: eventBudgets,
  budget_lines: budgetLines,
  cotisations,
  org_budgets: orgBudgets,
  org_budget_lines: orgBudgetLines,
  giving_donors: givingDonors,
  giving_campaigns: givingCampaigns,
  pledges,
  tax_receipts: taxReceipts,
  transaction_giving: transactionGiving,
  invitations,
  invitation_claims: invitationClaims,
  notifications,
  audit_entries: auditEntries,
  role_assignments: roleAssignments,
  report_definitions: reportDefinitions,
  form_definitions: formDefinitions,
  form_submissions: formSubmissions,
  custom_field_definitions: customFieldDefinitions,
  custom_field_values: customFieldValues,
  tags,
  tag_assignments: tagAssignments,
  grants,
} as const;
