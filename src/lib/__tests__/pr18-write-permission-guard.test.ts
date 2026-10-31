// @vitest-environment node
/**
 * PR18 — garde anti-régression : la décision d'autorisation d'ÉCRITURE n'est
 * jamais réduite à la seule APPARTENANCE (`is_org_member`).
 *
 * Contexte : R137/R141/R141.b/c/d ont migré les politiques INSERT/UPDATE/DELETE
 * de `is_org_member` seul vers `is_org_member AND has_permission(...)`. Sans
 * garde, une migration future pourrait réintroduire une politique d'écriture
 * gardée par la seule appartenance — c.-à-d. un membre quelconque pourrait
 * écrire, contournant la décision RBAC centralisée.
 *
 * Invariant verrouillé : toute politique d'écriture effective qui s'appuie sur
 * `is_org_member(...)` doit AUSSI exiger une permission — `has_permission(...)`
 * ou un gate de permission dédié (`can_manage_invitations`) — sauf exceptions
 * justifiées ci-dessous (auto-insertion de son propre journal d'audit).
 *
 * Les politiques gardées par `is_org_admin(...)` ou `auth.uid() = id` (registre
 * d'organisations, grants, profil de soi) ne sont PAS concernées : ce ne sont
 * pas des écritures « membre », elles ont déjà leur propre gate.
 *
 * Méthode (patron `rbac-escalation-guard` : lecture des migrations, sans base) :
 * rejouer les migrations dans l'ordre, suivre CREATE/ALTER/DROP POLICY, retenir
 * la DERNIÈRE définition de chaque politique d'écriture encore active.
 *
 * NON-VACUITÉ : ajouter `CREATE POLICY x ON public.members FOR INSERT TO
 * authenticated WITH CHECK (is_org_member(initplan_uid(), org_id));` → échec.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const MIGRATIONS_DIR = resolve(__dirname, "../../../supabase/migrations");

/** Politiques d'écriture gardées par la seule appartenance (justifiées). */
const ALLOWED_EXCEPTIONS: Record<string, string> = {
  // R141.d — un membre enregistre SA propre action ; restreindre à un rôle
  // priverait les non-managers de toute traçabilité (append-only par R140).
  audit_entries_insert: "journal d'audit : l'acteur enregistre sa propre action",
};

/** Tables métier dont CHAQUE politique d'écriture doit porter has_permission. */
const DOMAIN_TABLES = [
  "transactions",
  "versements",
  "members",
  "groups",
  "group_memberships",
  "events",
  "event_budgets",
  "event_tasks",
  "cotisations",
  "accounts",
  "caisses",
  "categories",
  "pledges",
  "giving_campaigns",
  "giving_donors",
  "tax_receipts",
  "transaction_giving",
  "budget_lines",
  "org_budgets",
  "org_budget_lines",
  "org_units",
  "report_definitions",
  "custom_field_definitions",
  "custom_field_values",
  "form_definitions",
  "form_submissions",
  "documents",
  "notifications",
];

interface Policy {
  name: string;
  table: string;
  cmd: string;
  body: string;
  file: string;
}

function effectiveWritePolicies(): Map<string, Policy> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const active = new Map<string, Policy>();

  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    const events: {
      idx: number;
      kind: "create" | "drop" | "alter";
      name: string;
      table?: string;
      cmd?: string;
      body?: string;
    }[] = [];

    for (const m of sql.matchAll(
      /CREATE POLICY\s+"?(\w+)"?\s+ON\s+public\.(\w+)\s+FOR\s+(INSERT|UPDATE|DELETE|ALL|SELECT)([\s\S]*?);/gi,
    )) {
      events.push({
        idx: m.index ?? 0,
        kind: "create",
        name: m[1],
        table: m[2],
        cmd: m[3].toUpperCase(),
        body: m[4],
      });
    }
    for (const m of sql.matchAll(
      /ALTER POLICY\s+"?(\w+)"?\s+ON\s+public\.\w+([\s\S]*?);/gi,
    )) {
      events.push({ idx: m.index ?? 0, kind: "alter", name: m[1], body: m[2] });
    }
    for (const m of sql.matchAll(
      /DROP POLICY(?:\s+IF\s+EXISTS)?\s+"?(\w+)"?\s+ON/gi,
    )) {
      events.push({ idx: m.index ?? 0, kind: "drop", name: m[1] });
    }
    events.sort((a, b) => a.idx - b.idx);

    for (const e of events) {
      if (e.kind === "drop") {
        active.delete(e.name);
      } else if (e.kind === "alter") {
        const cur = active.get(e.name);
        if (cur) cur.body += "\n" + (e.body ?? "");
      } else if (e.cmd !== "SELECT") {
        active.set(e.name, {
          name: e.name,
          table: e.table!,
          cmd: e.cmd!,
          body: e.body!,
          file,
        });
      }
    }
  }
  return active;
}

/** Une politique est « membre-only » si is_org_member sans aucun gate de permission. */
function isMembershipOnly(p: Policy): boolean {
  if (!/is_org_member\s*\(/i.test(p.body)) return false;
  if (/has_permission\s*\(/i.test(p.body)) return false;
  if (/can_manage_invitations\s*\(/i.test(p.body)) return false;
  return true;
}

const policies = effectiveWritePolicies();

describe("PR18 — l'écriture n'est jamais gardée par la seule appartenance", () => {
  it("l'analyse couvre bien des politiques d'écriture (non-vacuité)", () => {
    expect(policies.size).toBeGreaterThan(50);
  });

  it("aucune politique d'écriture n'est gardée par is_org_member SEUL", () => {
    const offenders = [...policies.values()].filter(
      (p) => isMembershipOnly(p) && !(p.name in ALLOWED_EXCEPTIONS),
    );
    expect(
      offenders.map((p) => `${p.name} (${p.file})`),
      "Politique d'écriture gardée par la seule appartenance : ajouter has_permission(...) ou justifier dans ALLOWED_EXCEPTIONS",
    ).toEqual([]);
  });

  it("toutes les politiques d'écriture des tables métier portent has_permission", () => {
    const offenders = [...policies.values()].filter(
      (p) =>
        DOMAIN_TABLES.includes(p.table) &&
        !/has_permission\s*\(/i.test(p.body),
    );
    expect(
      offenders.map((p) => `${p.name} → ${p.table} (${p.file})`),
    ).toEqual([]);
  });

  it("les exceptions déclarées existent réellement (pas de code mort)", () => {
    for (const name of Object.keys(ALLOWED_EXCEPTIONS)) {
      expect(policies.has(name), `exception déclarée mais absente : ${name}`).toBe(
        true,
      );
    }
  });
});
