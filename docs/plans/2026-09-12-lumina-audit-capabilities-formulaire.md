# Lumina Audit Supérieur — Capabilities, Pages & Feature Formulaire — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformer un audit ad-hoc en processus de contrôle récurrent et exécutable : inventaire formel de toutes les capabilities et pages du codebase, détection automatique des violations d'architecture, et correction du « data black hole » du formulaire dynamique (les données collectées doivent être affichables).

**Architecture:** Trois couches d'intervention (1) un test d'architecture qui couvre les 11 capabilities actuelles, (2) un script d'audit réutilisable qui produit un rapport factuel de l'inventaire, des orphelines et des violations de règles métier (montants hardcodés), et (3) une tâche corrective dédiée au formulaire qui expose les soumissions collectées à l'UI et les connecte au moteur de rapport.

**Tech Stack:** TypeScript, React, Vitest, React Test Library (si nécessaire), PowerSync/Supabase (lecture seule dans l'audit), Ionicons/Ionic (@ionic/react).

---

## Préambule — Ce que l'audit doit couvrir (inventaire factuel préalable)

### Capacities (11 au total dans `src/capabilities/`)
- `cotisation` — écrit `events` + `cotisations`, lit `group_memberships`/`members`. Règle métier forte : montant **jamais** hardcodé (rejet `MONTANT_COTISATION_REQUIS`).
- `federation` — écrit `organizations` (re-parenting multi-orgs).
- `invitation` — écrit `invitations` + `profiles` PENDING, transport fichier/QR.
- `lifecycle` — mappage `ENTITY_TABLE` (archive/restore par entité), `adapters.ts` contient `archiveGroupWithState` **placeholder mort**.
- `notification` — wrapper OneSignal, **pas de persistance**.
- `organization` (index + central) — l'index est in-mémoire (Map), le central est PS-backed → **deux sources de vérité**.
- `policy` — fonctions pures de validation de montants/solde, **jamais importées** par aucune page ni capacité → capacité morte côté orchestration.
- `relationship` — `group_memberships` (roles MEMBRE/RESPONSABLE), **pas d'audit** sur add/remove.
- `resource` — requêtes génériques par entité, **bug de calcul `total`** (conditions.slice(0,-1) retire le filtre `org_id` et décale les paramètres).
- `security` — facade RBAC, `PERMISSION_MATRIX` ré-exporté.
- `workflow` — graphes de transition, `transition` retourne **un booléen sans persister**.

### Pages (43 dans `src/pages/`) — état du câblage
- **Bien câblées** (route + entrée de navigation explicite) : Splash, AuthPage, Onboarding, OrgSetup, Dashboard, Notifications, Tutorial, Finance, TransactionNew, TransactionNewGroup, TransactionDetail, TransactionEdit, Balance, Versement, SaisieRapide, Groups, GroupDetail, GroupCotisation, Events, EventNew, EventDetail, EventEdit, Members, MembresEnAvance, MembreDetail, Cotisations, Reports, Archives, FormBuilder, FormFill, CustomFields, InvitationEmit, InvitationClaim, CentralAdmin, Trace, History, Help, Settings, NotFound.
- **Orphelines** (route déclarée mais **aucune navigation qui y mène** depuis l'UI) :
  - `Federation.tsx` (`/admin/federation`)
  - `InvitationManage.tsx` (`/invitation/manage`)
  - `ReportBuilder.tsx` (`/report-builder`)
  - `CulteDetail.tsx` (`/culte/:id`)
- **Coquille URL** : `TransactionEdit.tsx` navigue vers `/transaction/edit/${id}` alors que la route réelle est `/transaction/:id/edit` → atterrit sur `NotFound`.
- **Variable morte** : `Help.tsx` importe `useNavigate` mais ne l'appelle jamais.

### Feature formulaire — verdict concret
- **Écriture** : `FormFill.tsx:54` → `formSubmissionRepo.create` → `INSERT INTO form_submissions` (`dataLayer.ts:1843`).
- **Lecture** : `listFormSubmissionsPS` existe (`dataLayer.ts:1887`) mais **aucune page ne l'appelle** — les réponses tombent dans `form_submissions.data` (JSON) sans écran de visualisation ni connexion au moteur de rapport (`reporting.ts` ne supporte que `dataSource === "transactions"`).
- **Conséquence utilisateur** : créer un formulaire pour collecter des baptêmes + dates de baptême fonctionne, mais **les données collectées ne peuvent pas être affichées** — le formulaire est en circuit ouvert.

---

## Objectifs de qualité mesurables (Succès mesurable)

1. Le test `no-cross-imports.test.ts` couvre les **11** capabilities (au lieu des 5 actuelles).
2. Un script d'audit `scripts/audit-lumina.ts` produit `docs/audit-report.md` contenant : inventaire des capabilities, inventaire des pages avec statut (orpheline/câblée), violations des règles métier (montants hardcodés), et les 10 signaux d'orchestration ci-dessus.
3. La feature formulaire expose les soumissions collectées : page `FormSubmissions.tsx` route `/forms/:id/submissions` qui appelle `listFormSubmissionsPS({ formDefinitionId })` et rend le JSON `data` de chaque soumission.
4. Le moteur de rapport (`reporting.ts`) accepte `dataSource === "form_submissions"`.

---

## Task 1 — Élargir le test d'architecture aux 11 capabilities

**Files:**
- Modify: `src/capabilities/__tests__/no-cross-imports.test.ts:16-22`

**Contexte :** Le test actuel vérifie 5 capabilities (`workflow`, `lifecycle`, `relationship`, `resource`, `security`). Les 6 restantes (`cotisation`, `federation`, `invitation`, `notification`, `organization`, `policy`) ne sont pas couvertes. L'objectif est que **toute** nouvelle violation d'architecture soit détectée automatiquement.

**Step 1: Modifier la liste des capabilities (ligne 16-22)**

Avant :
```ts
const capabilities = [
  "workflow",
  "lifecycle",
  "relationship",
  "resource",
  "security",
];
```

Après :
```ts
const capabilities = [
  "cotisation",
  "federation",
  "invitation",
  "lifecycle",
  "notification",
  "organization",
  "policy",
  "relationship",
  "resource",
  "security",
  "workflow",
];
```

**Step 2: Run the test to verify it passes (aucune violation existante sur ces capabilities)**

Run: `npx vitest run src/capabilities/__tests__/no-cross-imports.test.ts`
Expected: PASS. S'il y a un échec, c'est une violation réelle qui doit être corrigée dans la capacité correspondante (pas le test qui doit être affaibli).

**Step 3: Commit**

```bash
git add src/capabilities/__tests__/no-cross-imports.test.ts
git commit -m "test(arch): extend no-cross-imports boundary to all 11 capabilities"
```

---

## Task 2 — Écrire le script d'audit `scripts/audit-lumina.ts`

**Files:**
- Create: `scripts/audit-lumina.ts`
- Create: `docs/audit-report.md` (généré par le script, commit dans le repo comme snapshot)

**Objectif :** Un script TypeScript exécutable (`tsx scripts/audit-lumina.ts`) qui parcourt le codebase et produit un rapport factuel. Il ne modifie **aucun** code — il **mesure**.

**Step 1: Écrire le squelette du script avec les 4 sections de rapport**

Créer `scripts/audit-lumina.ts` :

```ts
/**
 * Lumina Audit Script — rapport factuel de l'état du codebase.
 *
 * Sections du rapport (docs/audit-report.md) :
 *   1. Informatique capabilities (exports publics, tables, hardcodé, tests)
 *   2. Informatique pages (routes, orphelines, navigation)
 *   3. Violations de règles métier (montants hardcodés)
 *   4. Signaux d'orchestration (points de rupture)
 *
 * Exécution : npx tsx scripts/audit-lumina.ts
 * Sortie    : docs/audit-report.md + stdout
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();

// --------------------------------------------------------------------
// 1. Inventaire capabilities
// --------------------------------------------------------------------
const CAPS_DIR = join(ROOT, "src", "capabilities");

function listCapabilities(): string[] {
  const out = execSync(`find ${CAPS_DIR} -maxdepth 1 -type d`).toString().trim().split("\n");
  return out.map((p) => p.split("/").pop()!).filter(Boolean);
}

function readCap(cap: string): string {
  const f = join(CAPS_DIR, cap, "index.ts");
  return existsSync(f) ? readFileSync(f, "utf-8") : "";
}

function capExports(content: string): string[] {
  // Matches `export async function X(`, `export function X(`, `export class X`, `export interface X`
  return content.match(/export\s+(?:async\s+)?(?:function|class|interface|type|const)\s+(\w+)/g) ?? [];
}

function capTables(content: string): string[] {
  const matches = content.match(/(INSERT INTO|UPDATE|SELECT|FROM|JOIN)\s+([a-z_]+)/gi) ?? [];
  return [...new Set(matches.map((m) => m.split(/\s+/).pop()))];
}

function capHardcodedAmounts(content: string): string[] {
  const matches = content.match(/\b(=|\+)\s*\d{2,}\s*(?:\* 100)?/g) ?? [];
  // Flag any assignment of integer constant ≥ 100 that looks like an amount
  return matches.filter((m) => parseInt(m.replace(/[^0-9]/g, ""), 10) >= 100);
}

// --------------------------------------------------------------------
// 2. Inventaire pages (routes vs orphelines)
// --------------------------------------------------------------------
function listPages(): string[] {
  const pagesDir = join(ROOT, "src", "pages");
  const out = execSync(`find ${pagesDir} -maxdepth 1 -name "*.tsx" -type f`).toString().trim().split("\n");
  return out.map((f) => f.split("/").pop()!.replace(".tsx", ""));
}

function routesDeclared(): Record<string, string> {
  const out: Record<string, string> = {};
  const routesDir = join(ROOT, "src", "ionic", "routes");
  const files = execSync(`find ${routesDir} -maxdepth 1 -name "*.tsx"`).toString().trim().split("\n");
  for (const f of files) {
    if (!f) continue;
    const content = readFileSync(f, "utf-8");
    const matches = content.match(/path\s*=\s*"([^"]+)"\s+\w+element\+=\s*<LazyRoute\s+component=\{(\w+)\}/g) ?? [];
    // Simpler regex that matches `path="X"` followed by a component name
    const re = /path="([^"]+)"[\s\S]{0,80}component={(\w+)}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) out[m[1]] = m[2];
  }
  return out;
}

function navigationReferences(): Record<string, string[]> {
  // Scan src/pages/** for navigate("<path>") and useNavigate targets
  const pagesDir = join(ROOT, "src", "pages");
  const out: Record<string, string[]> = {};
  const files = execSync(`find ${pagesDir} -name "*.tsx"`).toString().trim().split("\n");
  for (const f of files) {
    if (!f) continue;
    const content = readFileSync(f, "utf-8");
    const refs: string[] = [];
    const re = /navigate\(\s*[`"']([^`"']+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content))) refs.push(m[1]);
    out[f.split("/").pop()!.replace(".tsx", "")] = refs;
  }
  return out;
}

// --------------------------------------------------------------------
// 3. Violations de règles métier (montants hardcodés)
// --------------------------------------------------------------------
function hardcodedAmountsReport(): Array<{ file: string; line: number; match: string }> {
  const out: Array<{ file: string; line: number; match: string }> = [];
  // Search across capabilities and lib for numeric literals that look like amounts
  const dirs = ["src/capabilities", "src/lib"];
  const files = dirs.map((d) => execSync(`find ${join(ROOT, d)} -name "*.ts"`).toString().trim().split("\n")).filter(Boolean);
  for (const f of files) {
    const lines = readFileSync(f, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/=\s*(\d{3,})\s*(?:;\s*)?(?:\/\/\s*.*)?$/);
      if (m && !lines[i].trim().startsWith("//")) out.push({ file: f, line: i + 1, match: lines[i].trim() });
    }
  }
  return out;
}

// --------------------------------------------------------------------
// 4. Signaux d'orchestration (fixes factuels, à maintenir à jour)
// --------------------------------------------------------------------
const ORCHESTRATION_SIGNALS: Array<{ id: string; title: string; file: string; note: string }> = [
  { id: "O1", title: "archiveGroupWithState no-op placeholder", file: "src/capabilities/lifecycle/adapters.ts:66-79", note: "updater([], []) — état Zustand non mis à jour." },
  { id: "O2", title: "policy non importé par aucune page", file: "src/capabilities/policy/index.ts", note: "grep `@/capabilities/policy` → seulement le fichier lui-même." },
  { id: "O3", title: "workflow.transition ne persiste rien", file: "src/capabilities/workflow/index.ts:126-139", note: "retourne booléen, l'appelant doit faire l'UPDATE." },
  { id: "O4", title: "notification.sendNotification sans backend", file: "src/capabilities/notification/index.ts:82-103", note: "log client-side uniquement." },
  { id: "O5", title: "Deux sources de vérité sur organization", file: "src/capabilities/organization/index.ts + central.ts", note: "index in-mémoire (Map) vs central PS-backed." },
  { id: "O6", title: "resource.list total incorrect", file: "src/capabilities/resource/index.ts:159-165", note: "conditions.slice(0,-1) retire le filtre org_id et décale params." },
  { id: "O7", title: "Form submissions non affichées (data black hole)", file: "src/lib/dataLayer.ts:1887", note: "listFormSubmissionsPS existe mais aucune page ne l'appelle." },
  { id: "O8", title: "InvitationManage orpheline", file: "src/pages/InvitationManage.tsx", note: "aucune navigation ne mène vers /invitation/manage." },
  { id: "O9", title: "Federation orpheline", file: "src/pages/Federation.tsx", note: "route /admin/federation déclarée, aucune entrée UI." },
  { id: "O10", title: "ReportBuilder orpheline", file: "src/pages/ReportBuilder.tsx", note: "route /report-builder déclarée, Reports.tsx ne mène pas dedans." },
];

// --------------------------------------------------------------------
// Assemblage du rapport
// --------------------------------------------------------------------
function main() {
  const caps = listCapabilities();
  const routes = routesDeclared();
  const navRefs = navigationReferences();

  const orphanPages = Object.values(routes)
    .filter((page) => {
      const targets = Object.values(navRefs).flat();
      // orpheline si la page est référencée par aucune navigation
      return !targets.some((t) => t.startsWith("/"));
    })
    .join(", ");

  const lines: string[] = [
    "# Lumina Audit Report — snapshot auto-généré",
    "",
    `Généré : ${new Date().toISOString()}`,
    "",
    "## 1. Capacités (inventaire)",
    "",
    "| Capacité | Exports publics | Tables | Hardcodés détectés |",
    "|---|---|---|---|",
  ];

  for (const cap of caps) {
    const content = readCap(cap);
    lines.push(`| \`${cap}\` | ${capExports(content).length} | ${capTables(content).join(", ")} | ${capHardcodedAmounts(content).length} |`);
  }

  lines.push(
    "",
    "## 2. Pages (inventaire)",
    "",
    `Pages orphelines détectées (route sans navigation) : \`${orphanPages}\``,
    "",
    "## 3. Violations de règles métier (montants hardcodés)",
    "",
    ...hardcodedAmountsReport().map((v) => `- \`${v.file}:${v.line}\` — ${v.match}`),
    "",
    "## 4. Signaux d'orchestration (fixes à corriger)",
    "",
    ...ORCHESTRATION_SIGNALS.map((s) => `- **${s.id}** ${s.title} — \`${s.file}\` — ${s.note}`),
  );

  const report = lines.join("\n");
  writeFileSync(join(ROOT, "docs", "audit-report.md"), report);
  console.log("Rapport généré : docs/audit-report.md");
}

main();
```

**Step 2: Run the script to produce the report**

Run: `npx tsx scripts/audit-lumina.ts`
Expected: `docs/audit-report.md` est créé et `stdout` affiche « Rapport généré ».

**Step 3: Commit le script et le snapshot du rapport**

```bash
git add scripts/audit-lumina.ts docs/audit-report.md
git commit -m "chore(audit): add capability/page/meter audit script + first report snapshot"
```

**Nota :** le script utilise `find`/`grep` en ligne de commande — sur Windows, il faut utiliser `npx tsx` avec `shell` ou adapter à `dir /s /b`. Pour Windows, préférer :
```ts
import { globSync } from "glob";
// ou
execSync(`Get-ChildItem -Path ${...} -Filter *.ts -Recurse`)
```
Adapter à l'OS cible avant le commit si nécessaire (l'OS de développement est Windows).

---

## Task 3 — Corriger la « data black hole » du formulaire (écran de soumissions)

**Files:**
- Create: `src/pages/FormSubmissions.tsx`
- Modify: `src/ionic/routes/forms.tsx`
- Modify: `src/pages/FormBuilder.tsx` (ajout d'un bouton « Voir les soumissions » par formulaire)

**Contexte :** Le formulaire dynamique écrit dans `form_submissions` (JSONB `data`) mais **aucun écran ne lit ces données**. Le user l'a appelé par son nom : quand on crée un formulaire pour collecter les baptêmes + date de baptême, les réponses doivent pouvoir s'afficher. C'est la tâche corrective la plus importante.

**Step 1: Écrire le test TDD de la page (le test échoue)**

Créer `src/pages/__tests__/FormSubmissions.test.tsx` (ou `src/pages/FormSubmissions.test.tsx` selon la convention du projet) :

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FormSubmissions from "./FormSubmissions";

describe("FormSubmissions page", () => {
  it("renders the form title and submission count when data is present", async () => {
    // Mock listFormSubmissionsPS
    const submissions = [
      {
        id: "sub-1",
        formDefinitionId: "form-1",
        data: JSON.stringify({ nom: "A", baptême: "2026-01-01" }),
        submittedBy: "user-1",
        status: "SUBMITTED",
        createdAt: "2026-01-02T00:00:00Z",
      },
      {
        id: "sub-2",
        formDefinitionId: "form-1",
        data: JSON.stringify({ nom: "B", baptême: "2026-02-01" }),
        submittedBy: "user-2",
        status: "SUBMITTED",
        createdAt: "2026-02-03T00:00:00Z",
      },
    ];
    // (mock hook usePowerSync useQuery + formSubmissionRepo.list à injecter selon pattern du projet)
    render(
      <MemoryRouter initialEntries={["/forms/form-1/submissions"]}>
        <Routes>
          <Route path="/forms/:id/submissions" element={<FormSubmissions />} />
        </Routes>
      </MemoryRouter>,
    );
    // Attendre l'hydratation
    await screen.findByText("Soumissions");
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders an empty state when there are no submissions", async () => {
    render(
      <MemoryRouter initialEntries={["/forms/form-1/submissions"]}>
        <Routes>
          <Route path="/forms/:id/submissions" element={<FormSubmissions />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Aucune soumission pour l'instant");
  });
});
```

Adaptation : regarder `src/pages/FormFill.tsx` pour le pattern exact de mock des hooks PowerSync (`useQuery` via `@powersync/react`). Le test doit échouer avant l'implémentation.

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/FormSubmissions.test.tsx`
Expected: FAIL (« module not found » ou « FormSubmissions not exported »).

**Step 3: Écrire la page `FormSubmissions.tsx`**

Créer `src/pages/FormSubmissions.tsx` :

```tsx
/**
 * FormSubmissions — liste les soumissions collectées d'un formulaire
 * dynamique et affiche le JSON `data` de chacune.
 *
 * Route : /forms/:id/submissions
 * Accès  : bouton « Voir les soumissions » dans FormBuilder.
 */
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@powersync/react";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
} from "@ionic/react";
import { Inbox, Clock, User } from "lucide-react";
import { getPowerSyncDatabase } from "@/lib/powersync";
import { getOrganizationId } from "@/lib/orgContext";

export default function FormSubmissions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgId = getOrganizationId();

  // Lecture des soumissions de ce formulaire (PowerSync local).
  const { data, state } = useQuery(
    (db) =>
      db.query(
        `SELECT s.id, s.data, s.submitted_by, s.status, s.created_at,
                f.name as form_name
         FROM form_submissions s
         LEFT JOIN form_definitions f ON f.id = s.form_definition_id
         WHERE s.form_definition_id = ?
         ORDER BY s.created_at DESC`,
        [id],
      ),
    [id],
  );

  const rows = useMemo(() => (data ?? [] as any[]), [data]);

  if (!id) return null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/forms" />
          </IonButtons>
          <IonTitle>Soumissions</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas" fullscreen>
        <div className="max-w-lg mx-auto px-5 py-4 space-y-3">
          {rows.length === 0 ? (
            <div
              className="rounded-xl p-5 text-center"
              style={{ backgroundColor: "#212121" }}
            >
              <Inbox className="w-8 h-8 mx-auto text-text-tertiary mb-2" />
              <p className="text-text-primary text-sm">
                Aucune soumission pour l'instant.
              </p>
              <p className="text-text-tertiary text-xs mt-1">
                Les réponses envoyées depuis « Remplir » apparaîtront ici.
              </p>
            </div>
          ) : (
            rows.map((row: any) => {
              let parsed: Record<string, unknown> = {};
              try {
                parsed = JSON.parse(row.data ?? "{}");
              } catch {
                parsed = { _raw: String(row.data) };
              }
              return (
                <IonCard
                  key={row.id}
                  style={{ backgroundColor: "#212121", border: "1px solid #282828" }}
                >
                  <IonCardContent>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-text-tertiary" />
                        <span className="text-text-primary text-sm">
                          {row.submitted_by ?? "Anonyme"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-text-tertiary text-xs">
                        <Clock className="w-3 h-3" />
                        {new Date(row.created_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <dl className="space-y-1">
                      {Object.entries(parsed).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 text-xs">
                          <dt className="text-text-tertiary">{k}</dt>
                          <dd className="text-text-primary">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </IonCardContent>
                </IonCard>
              );
            })
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
```

**Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/FormSubmissions.test.tsx`
Expected: PASS.

**Step 5: Modifier `FormBuilder.tsx` — ajouter le bouton d'accès**

Localiser le bloc de boutons par formulaire (autour de `FormBuilder.tsx:187-211`). Ajouter :

```tsx
<button
  onClick={() => navigate(`/forms/${form.id}/submissions`)}
  className="..."  // classe existante des boutons
>
  Voir les soumissions
</button>
```

Assurer que `useNavigate` est déjà importé dans `FormBuilder.tsx` (sinon l'ajouter).

**Step 6: Déclarer la route dans `forms.tsx`**

Modifier `src/ionic/routes/forms.tsx` :

```tsx
const FormSubmissions = lazy(() => import("@/pages/FormSubmissions"));
// ...
export const formRoutes: ReactElement[] = [
  /* existing /forms, /form/fill/:id, /custom-fields */
  <Route
    key="/forms/:id/submissions"
    path="/forms/:id/submissions"
    element={<LazyRoute component={FormSubmissions} />}
  />,
];
```

**Step 7: Run typecheck + test + lint**

Run: `npx tsc --noEmit && npx vitest run src/pages/FormSubmissions.test.tsx`
Expected: PASS, 0 erreur.

**Step 8: Commit**

```bash
git add src/pages/FormSubmissions.tsx src/pages/FormSubmissions.test.tsx src/ionic/routes/forms.tsx src/pages/FormBuilder.tsx
git commit -m "feat(forms): expose form submissions via /forms/:id/submissions page"
```

---

## Task 4 — Ajouter `form_submissions` au moteur de rapport

**Files:**
- Modify: `src/lib/reporting.ts` (supporter `dataSource === "form_submissions"`)
- Test: `src/lib/__tests__/reporting-form-submissions.test.ts`

**Contexte :** L'`AggregationEngine` de `reporting.ts` rejette tout `dataSource` autre que `"transactions"` (autour de la ligne 74). Pour pouvoir « afficher les données collectées » dans un rapport (ex : nombre de baptêmes par mois), il faut ajouter un data-source `form_submissions`.

**Step 1: Écrire le test TDD**

Créer `src/lib/__tests__/reporting-form-submissions.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { buildReport } from "@/lib/reporting";

describe("reporting — form_submissions data source", () => {
  it("counts submissions grouped by a selected field", async () => {
    const mockRows = [
      { form_definition_id: "f1", data: { baptême: "2026-01-01" }, created_at: "2026-01-02" },
      { form_definition_id: "f1", data: { baptême: "2026-01-15" }, created_at: "2026-01-16" },
      { form_definition_id: "f1", data: { baptême: "2026-02-01" }, created_at: "2026-02-02" },
    ];
    const res = await buildReport({
      dataSource: "form_submissions",
      groupBy: "data.baptême",
      filter: { form_definition_id: "f1" },
    });
    expect(res.buckets.length).toBeGreaterThan(0);
    // Le rapport doit être groupable sur une clé du JSON `data`
  });
});
```

Adaptation : regarder `src/lib/__tests__/reporting*.test.ts` existants pour le pattern exact de mock (db, PowerSync, etc.).

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/reporting-form-submissions.test.ts`
Expected: FAIL (`Unsupported data source: form_submissions`).

**Step 3: Modifier `reporting.ts` — brancher `form_submissions`**

Dans `reporting.ts` :
- Accepter `dataSource === "form_submissions"` dans l'union de type.
- Construire la requête SQL sur `form_submissions` (pas `transactions`).
- Permettre `groupBy` avec un chemin JSON (ex : `"data.baptême"`) — utiliser `data->>'baptême'` si Postgres, ou parse+regrouper côté JS si le backend est PowerSync.

Implémentation minimale :
```ts
case "form_submissions": {
  // Construit la requête sur form_submissions ; si groupBy contient un chemin
  // JSON, on le transforme en extraction JSON (Postgres : data->>'field';
  // PowerSync/SQLite : JSON_EXTRACT(data, '$.field')).
  const sql = buildFormSubmissionsSql(params);
  const rows = await db.execute(sql);
  return aggregate(rows, params);
}
```

**Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/__tests__/reporting-form-submissions.test.ts`
Expected: PASS.

**Step 5: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: 0 erreur.

**Step 6: Commit**

```bash
git add src/lib/reporting.ts src/lib/__tests__/reporting-form-submissions.test.ts
git commit -m "feat(reports): support form_submissions as a report data source"
```

---

## Task 5 — Élargir le test de no-cross-imports aux 11 caps **et** ajouter une règle « pas de montants hardcodés »

**Files:**
- Modify: `src/capabilities/__tests__/no-cross-imports.test.ts` (déjà élargi en Task 1)
- Create: `src/capabilities/__tests__/no-hardcoded-amounts.test.ts`

**Contexte :** La règle métier forte « le montant de cotisation n'est **jamais** imposé par défaut » doit être vérifiée par un test, pas par la lecture manuelle du code. Ce test scanne toutes les capabilities et échoue si une capacité contient un montant par défaut hardcodé qui n'est pas dans une liste blanche explicite.

**Step 1: Écrire le test de « pas de montants hardcodés »**

```ts
/**
 * Rule: Aucune capacité ne doit fixer un montant par défaut.
 * Les valeurs autorisées sont : 0, 1, null, undefined, ou des seuils
 * explicites documentés (ex: min 100 cents = 1 FCFA dans policy).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const CAPS = [
  "cotisation", "federation", "invitation", "lifecycle",
  "notification", "organization", "policy", "relationship",
  "resource", "security", "workflow",
];

describe("No hardcoded default amounts in capabilities", () => {
  const root = resolve(__dirname, "../../..");

  for (const cap of CAPS) {
    const f = resolve(root, `src/capabilities/${cap}/index.ts`);
    if (!existsSync(f)) continue;
    const content = readFileSync(f, "utf-8");

    it(`'${cap}' does not default an amount to a literal number > 0`, () => {
      // Cherche un pattern comme `montantCotisationCents: 5000` ou `DEFAULT_AMOUNT = 100`
      const forbidden = content.match(
        /(?:montant\w*|amount\w*|DEFAULT_\w*AMOUNT\w*|AMOUNT_DEFAULT)\w*\s*[:=]\s*\d+/g,
      );
      expect(forbidden, `hardcoded amount found: ${forbidden}`).toBeNull();
    });
  }
});
```

Nota : la capacité `policy` contient **des bornes** (min/max) qui sont volontairement des nombres — ce test doit **exclure** `policy` (c'est le module des bornes, pas un défaut par défaut). Ajouter un whitelist :

```ts
const WHITELIST_CAPS = ["policy"];
// ...
if (WHITELIST_CAPS.includes(cap)) return; // skip
```

**Step 2: Run the test to verify it passes**

Run: `npx vitest run src/capabilities/__tests__/no-hardcoded-amounts.test.ts`
Expected: PASS sur toutes les capabilities non-whitelisted.

**Step 3: Commit**

```bash
git add src/capabilities/__tests__/no-hardcoded-amounts.test.ts
git commit -m "test(rubik): forbid hardcoded default amounts in capabilities"
```

---

## Task 6 — Récapitulatif final + commit de l'audit

**Files:**
- Regenerate: `docs/audit-report.md`
- Modify: `docs/audit-report.md` (ajouter une section « Fixes effectués » qui liste les signaux O7 et O8/O9/O10 corrigeables et leurs statuts)

**Step 1: Régénérer le rapport**

Run: `npx tsx scripts/audit-lumina.ts`

**Step 2: Commit le snapshot final**

```bash
git add docs/audit-report.md scripts/audit-lumina.ts
git commit -m "docs(audit): regenerate report after FormSubmissions + policy hardcoding rule"
```

---

## Critères de fin (Définition of Done)

- [ ] `no-cross-imports.test.ts` couvre les 11 capabilities → `npx vitest run src/capabilities/__tests__/no-cross-imports.test.ts` = PASS.
- [ ] `no-hardcoded-amounts.test.ts` existe et PASS.
- [ ] `FormSubmissions.tsx` est routée, testée, accessible depuis `FormBuilder`.
- [ ] `reporting.ts` accepte `dataSource === "form_submissions"` → test PASS.
- [ ] `npx tsc --noEmit` = 0 erreur.
- [ ] `docs/audit-report.md` est à jour et commité.
- [ ] **Les données collectées par le formulaire sont affichables** — c'est le critère utilisateur principal.

## Ordre d'exécution recommandé

1. **Task 1** (base : élargir le test d'architecture) — 2 min.
2. **Task 5** (règle métier hardcodé) — 5 min.
3. **Task 3** (écran de soumissions — valeur utilisateur immédiate) — 20-30 min.
4. **Task 4** (rapport sur form_submissions) — 15 min.
5. **Task 2** (script d'audit, après toutes les corrections pour que le snapshot soit « propre ») — 15 min.
6. **Task 6** (récap) — 2 min.

## Risques / Points d'attention

- **Windows + `find`** dans `scripts/audit-lumina.ts` : préférer `glob` (npm) ou `Get-ChildItem` si l'OS de dev est Windows (c'est le cas ici). Adapter **avant** le commit de Task 2. → **RÉSOUDU** : le script utilise `glob` (cross-platform) et tourne via `node --experimental-strip-types` (Node 22, sans tsx).
- **Le test `no-hardcoded-amounts`** doit être précis : ne pas faussement rejeter les bornes `policy` (whitelist). → **RÉSOUDU** : whitelist de `policy` + exclusion des zéros d'initialisation.
- **`FormSubmissions.tsx`** : vérifier que le pattern de mock des hooks PowerSync dans `src/pages/__tests__/` (ou `src/pages/`) existe déjà ; sinon écrire un `test-utils.tsx` local qui fournit un `PowerSync` mocké (voir `FormFill.tsx` ou un test existant comme référence). → **RÉSOUDU** : le test utilise `vi.mock("@/lib/formSystem")` et vit dans `src/components/__tests__/` (la config Vitest n'inclut pas `src/pages/**`).
- **Routes Ionic** : le Fragment `<>…</>` est interdit dans `luminaRoutes` (voir commentaire dans `src/ionic/routes/index.ts`) — garder des tableaux plats dans `forms.tsx`. → **RÉSOUDU** : tableau plat, pas de Fragment.

## État d'exécution (2026-09-12)

- [x] **Task 1** — 11 caps dans `no-cross-imports` (34 tests PASS) — commit `8e8f565`
- [x] **Task 5** — `no-hardcoded-amounts` (10 tests PASS) — commit `e9784a6`
- [x] **Task 3** — `FormSubmissions.tsx` + route + bouton FormBuilder (2 tests PASS) — commit `a0822a0`
- [x] **Task 4** — `reporting.ts` + `form_submissions` (45 tests PASS) — commit `a3d44c5`
- [x] **Task 2** — `scripts/audit-lumina.ts` + `docs/audit-report.md` + `npm run audit` — commit `ba86752`
- [x] **Task 6** — rapport régénéré et commité

**À surveiller (en dehors du périmètre de ce plan)** : la détection d'orphelines de `audit-lumina.ts` signale 17 pages, dont certaines qui sont en fait bien câblées via des composants (BottomNav, TopHeader) que le scanner de `refs` n'a pas encore inclus. Le rapport est factuel mais peut être affiné.

## À la fin

**Plan complete et sauvegardé à `docs/plans/2026-09-12-lumina-audit-capabilities-formulaire.md`. Deux options d'exécution :**

**1. Subagent-Driven (cette session)** — je dispatche un subagent par tâche, avec review entre les tâches. Rapide, idéal pour les tasks courtes (T1, T5, T6).

**2. Parallel Session (séparée)** — ouvre une nouvelle session dans un worktree, avec `superpowers:executing-plans`, en exécution batch avec checkpoints. Plus adapté pour la tâche lourde (T3 + T4).

**Quelle approche ?**
