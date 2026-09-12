/**
 * Lumina Audit Script — rapport factuel de l'état du codebase.
 *
 * Sections du rapport (docs/audit-report.md) :
 *   1. Capacités (exports publics, tables, détecteurs de hardcodé)
 *   2. Pages (câblage, orphelines)
 *   3. Violations de règles métier (montants hardcodés)
 *   4. Signaux d'orchestration (points de rupture connus)
 *
 * Exécution : npm run audit (ou node --experimental-strip-types scripts/audit-lumina.ts)
 * Sortie    : docs/audit-report.md + stdout
 *
 * Cross-platform (Windows + POSIX) : utilise `glob` (node_modules/glob).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "glob";

const ROOT = process.cwd();

// ---------------------------------------------------------------------
// 1. Inventaire capabilities
// ---------------------------------------------------------------------
function listCapabilities(): string[] {
  const capsDir = join(ROOT, "src", "capabilities");
  if (!existsSync(capsDir)) return [];
  return readdirSync(capsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_") && e.name !== "__tests__")
    .map((e) => e.name)
    .sort();
}

function readCapFile(cap: string): string {
  const f = join(ROOT, "src", "capabilities", cap, "index.ts");
  return existsSync(f) ? readFileSync(f, "utf-8") : "";
}

function capExports(content: string): string[] {
  // `export async function X`, `export class X`, `export interface X`,
  // `export type X`, `export const X`.
  const m =
    content.match(
      /export\s+(?:async\s+)?(?:function|class|interface|type|const|enum)\s+(\w+)/g,
    ) ?? [];
  // "export async function X" -> "X"
  return m.map((s) =>
    s.replace(/^export\s+/, "").replace(/^async\s+/, "").split(/\s+/).pop()!,
  );
}

function capTables(content: string): string[] {
  // Match identifiers that follow FROM/JOIN/INTO/UPDATE, and filter the
  // false positives (column aliases, SQL literals like `now`).
  const m = content.match(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-z_][a-z0-9_]*)/gi) ?? [];
  const seen = new Set<string>();
  for (const s of m) seen.add(s.split(/\s+/).pop()!);
  const junk = new Set(["now", "the", "a", "an", "as", "is", "in"]);
  return [...seen].filter((t) => !junk.has(t)).sort();
}

function capHardcodedAmounts(content: string): number {
  // Any assignment of a numeric literal >= 100 that mentions montant/amount
  const m = content.match(
    /\b(?:DEFAULT_[A-Z_]*AMOUNT[A-Z_]*|AMOUNT_DEFAULT|montant[A-Z]\w*|amount\w*|montant)\w*\s*[:=]\s*(\d+(?:\.\d+)?)/g,
  );
  return (m ?? []).filter((s) => {
    const num = Number(s.split(/[:=]/).pop()?.trim());
    return num > 0;
  }).length;
}

function capTests(cap: string): string[] {
  const files = globSync(
    [
      `src/capabilities/__tests__/${cap}*.test.ts`,
      `src/lib/__tests__/*${cap}*.test.ts`,
    ],
    { cwd: ROOT, absolute: false },
  );
  return files;
}

// ---------------------------------------------------------------------
// 2. Inventaire pages (routes vs orphelines)
// ---------------------------------------------------------------------
function listPages(): string[] {
  const files = globSync("src/pages/*.tsx", { cwd: ROOT });
  return files.map((f) => f.replace("src/pages/", "").replace(".tsx", ""));
}

function routeTable(): Array<{ page: string; path: string; section: string }> {
  // Scan every ionic/routes/*.tsx for Route declarations that lazy-import a page.
  const files = globSync("src/ionic/routes/*.tsx", { cwd: ROOT });
  const out: Array<{ page: string; path: string; section: string }> = [];
  const re = /const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(["']@\/pages\/(\w+)["']\)[\s\S]*?path=["']([^"']+)["']/g;
  for (const f of files) {
    const section = f.split("/").pop()!;
    const content = readFileSync(join(ROOT, f), "utf-8");
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) out.push({ page: m[2], path: m[3], section });
  }
  return out;
}

function navigationReferences(): Record<string, string[]> {
  // Scan every page for `navigate("<target>")` and `to="<target>"` — the
  // two ways a page reaches a route. A page P is "câblée" si une autre
  // page navigue vers le path de P.
  const pages = globSync("src/pages/*.tsx", { cwd: ROOT });
  const refs: Record<string, string[]> = {};
  for (const p of pages) {
    const name = p.split("/").pop()!.replace(".tsx", "");
    const content = readFileSync(join(ROOT, p), "utf-8");
    const out: string[] = [];
    let m: RegExpExecArray | null;
    const navRe = /navigate\(\s*["'`]([^"'`]+)/g;
    while ((m = navRe.exec(content))) out.push(m[1]);
    const toRe = /\bto=["'`]([^"'`]+)["'`]/g;
    while ((m = toRe.exec(content))) out.push(m[1]);
    refs[name] = out;
  }
  return refs;
}

// ---------------------------------------------------------------------
// 3. Violations de règles métier (montants hardcodés)
// ---------------------------------------------------------------------
function hardcodedAmountsReport(): Array<{ file: string; line: number; match: string }> {
  const out: Array<{ file: string; line: number; match: string }> = [];
  const files = [
    ...globSync("src/capabilities/**/*.ts", { cwd: ROOT, ignore: ["**/__tests__/**"] }),
    ...globSync("src/lib/*.ts", { cwd: ROOT, ignore: ["**/__tests__/**"] }),
  ].filter(Boolean);
  for (const f of files) {
    const lines = readFileSync(join(ROOT, f), "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(
        /\b(?:DEFAULT_[A-Z_]*AMOUNT[A-Z_]*|AMOUNT_DEFAULT|montant[A-Z]\w*|amount\w*|montant)\w*\s*[:=]\s*(\d+(?:\.\d+)?)/,
      );
      if (m && Number(m[1]) > 0) {
        out.push({ file: f, line: i + 1, match: lines[i].trim() });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------
// 4. Signaux d'orchestration (fixes factuels, à maintenir à jour)
// ---------------------------------------------------------------------
const ORCHESTRATION_SIGNALS: Array<{
  id: string;
  title: string;
  file: string;
  note: string;
  status?: string;
}> = [
  {
    id: "O1",
    title: "archiveGroupWithState no-op placeholder",
    file: "src/capabilities/lifecycle/adapters.ts",
    note: "updater([], []) — état Zustand non mis à jour.",
  },
  {
    id: "O2",
    title: "policy non importé par aucune page ni cap",
    file: "src/capabilities/policy/index.ts",
    note: "le module de validation de montants n'est jamais appelé dans l'UI.",
  },
  {
    id: "O3",
    title: "workflow.transition ne persiste rien",
    file: "src/capabilities/workflow/index.ts",
    note: "retourne booléen, l'appelant doit faire l'UPDATE.",
  },
  {
    id: "O4",
    title: "notification.sendNotification sans backend",
    file: "src/capabilities/notification/index.ts",
    note: "log client-side uniquement.",
  },
  {
    id: "O5",
    title: "Deux sources de vérité sur organization",
    file: "src/capabilities/organization/index.ts + central.ts",
    note: "index in-mémoire (Map) vs central PS-backed.",
  },
  {
    id: "O6",
    title: "resource.list total incorrect",
    file: "src/capabilities/resource/index.ts",
    note: "conditions.slice(0,-1) retire le filtre org_id et décale params.",
  },
  {
    id: "O7",
    title: "Form submissions non affichées (data black hole)",
    file: "src/lib/dataLayer.ts",
    note: "listFormSubmissionsPS existe mais aucune page ne l'appelle.",
    status: "corrigeable — FormSubmissions.tsx ajoutée (task 3 du plan)",
  },
  {
    id: "O8",
    title: "InvitationManage orpheline",
    file: "src/pages/InvitationManage.tsx",
    note: "route /invitation/manage déclarée, aucune entrée UI.",
  },
  {
    id: "O9",
    title: "Federation orpheline",
    file: "src/pages/Federation.tsx",
    note: "route /admin/federation déclarée, aucune entrée UI.",
  },
  {
    id: "O10",
    title: "ReportBuilder orpheline",
    file: "src/pages/ReportBuilder.tsx",
    note: "route /report-builder déclarée, Reports.tsx ne mène pas dedans.",
  },
  {
    id: "O11",
    title: "CulteDetail orpheline (en pratique)",
    file: "src/pages/CulteDetail.tsx",
    note: "route /culte/:id déclarée, aucune navigation qui y mène.",
  },
  {
    id: "O12",
    title: "TransactionEdit URL coquille",
    file: "src/pages/TransactionEdit.tsx",
    note: "navigue vers /transaction/edit/${id} alors que la route est /transaction/:id/edit → NotFound.",
  },
];

// ---------------------------------------------------------------------
// Assemblage du rapport
// ---------------------------------------------------------------------
function main() {
  const caps = listCapabilities();
  const pages = listPages();
  const routes = routeTable();
  const refs = navigationReferences();

  // 1. Collect all navigation targets from the entire app.
  const allTargets: string[] = [];
  for (const c of [
    ...globSync("src/components/*.tsx", { cwd: ROOT }),
    ...globSync("src/pages/*.tsx", { cwd: ROOT }),
  ]) {
    const content = readFileSync(join(ROOT, c), "utf-8");
    let m: RegExpExecArray | null;
    const navRe = /navigate\(\s*["'`]([^"'`]+)/g;
    while ((m = navRe.exec(content))) allTargets.push(m[1]);
    const toRe = /\bto=["'`]([^"'`]+)["'`]/g;
    while ((m = toRe.exec(content))) allTargets.push(m[1]);
    // Also catch `defaultHref="/..."` and `href="/..."`
    const hrefRe = /\b(?:defaultHref|href)=["'`]([^"'`]+)["'`]/g;
    while ((m = hrefRe.exec(content))) allTargets.push(m[1]);
  }

  const isPageReferenced = (page: string): boolean => {
    // A page is referenced if any navigation in the app targets one of
    // its declared route paths.
    const paths = routes.filter((r) => r.page === page).map((r) => r.path);
    for (const path of paths) {
      const prefix = path
        .replace(/\/:[^/]+/g, "")
        .replace(/:[^/]+/g, "");
      if (
        allTargets.some(
          (t) =>
            t === path ||
            t === prefix ||
            (prefix.length > 1 && t.startsWith(prefix + "/")),
        )
      )
        return true;
    }
    // Self-references (navigate inside the page itself) also count.
    if ((refs[page] ?? []).length > 0) return true;
    return false;
  };

  const orphans = pages.filter((p) => !isPageReferenced(p)).sort();

  const lines: string[] = [
    "# Lumina Audit Report — snapshot auto-généré",
    "",
    `Généré : ${new Date().toISOString()}`,
    "",
    "## 1. Capacités (inventaire)",
    "",
    "| Capacité | Exports publics | Tables | Hardcodés | Tests dédiés |",
    "|---|---|---|---|---|",
  ];

  for (const cap of caps) {
    const content = readCapFile(cap);
    const tests = capTests(cap);
    lines.push(
      `| \`${cap}\` | ${capExports(content).length} | ${capTables(content).join(", ")} | ${capHardcodedAmounts(content)} | ${tests.length ? tests.map((t) => `\`${t}\``).join(" ") : "—"} |`,
    );
  }

  lines.push(
    "",
    "## 2. Pages (inventaire)",
    "",
    `Pages déclarées : ${pages.length}`,
    `Pages orphelines détectées (route sans navigation) : ${orphans.length}`,
    "",
    ...orphans.map((p) => `  - \`${p.split("\\").pop()}\``),
    "",
    "## 3. Violations de règles métier (montants hardcodés)",
    "",
  );
  const hc = hardcodedAmountsReport();
  if (hc.length === 0) lines.push("_Aucune violation détectée._");
  else lines.push(...hc.map((v) => `- \`${v.file}:${v.line}\` — ${v.match}`));

  lines.push(
    "",
    "## 4. Signaux d'orchestration (fixes à corriger)",
    "",
    ...ORCHESTRATION_SIGNALS.map((s) => {
      const suffix = s.status ? ` _(statut : ${s.status})_` : "";
      return `- **${s.id}** ${s.title} — \`${s.file}\`${suffix} — ${s.note}`;
    }),
  );

  const report = lines.join("\n");
  const outPath = join(ROOT, "docs", "audit-report.md");
  writeFileSync(outPath, report);
  console.log(`Rapport généré : ${outPath.replace(ROOT + "/", "").replace(/\\/g, "/")}`);
}

main();
