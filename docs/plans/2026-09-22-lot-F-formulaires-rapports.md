# Lot F — Formulaires dynamiques & Rapports d'état : Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rendre 100 % fonctionnels les features rapports (rapport d'état de TOUTE feature / de TOUTE modification) et formulaires (création de formulaires dynamiques simples et puissants, collecte des réponses, écriture vers une entité, affichage structuré et export CSV), puis consolider : test, stabilisation, validation, commit et push GitHub.

**Architecture:** Deux lots indépendants et parallélisables.
- **Lot Rapports (F.2)** : `ReportDefinition.kind` (`FINANCE | FEATURE | AUDIT`) en amont (type + migration + repo + schema PowerSync), puis deux nouvelles sources dans `AggregationEngine` (`features` = état de chaque feature via `useAuditEntries`/`features.ts`, `audit` = journal d'audit), un index composite sur `audit_entries(entity_type, created_at)`, et l'UI qui regroupe par kind.
- **Lot Formulaires (F.1 + F.3)** : rendu des champs avancés (reference, file, visibilité conditionnelle, validation regex/custom) dans `FormFill.tsx`, dispatcher d'écriture vers l'entité cible via `mapFormFields` (aujourd'hui code mort), affichage structuré + export CSV dans `FormSubmissions.tsx`, et `FormBuilder.tsx` comme entrée d'administration complète (publication, suivi des soumissions, export).

**Tech Stack:** Ionic + React (TypeScript), Vite, Vitest (pas Jest), PowerSync (`getPowerSyncDatabase().execute()`), Supabase/PostgreSQL (migrations dans `supabase/migrations/`), zustand fallback `useLocalStore`.

**Contraintes du repo (à respecter à chaque tâche) :**
- Alias `@/` = `src/`.
- Après toute modification de fichiers de code : `graphify update .` (règle CLAUDE.md, AST-only, gratuit).
- Qualité >30 lignes par tâche : les tâches ci-dessous sont atomiques ; au final, `/ccg:verify-change` et `/ccg:verify-quality <chemin>` (portes de qualité CCG, non-bloquantes).
- TDD : écrire le test d'abord, le voir échouer, implémenter le minimum, le voir passer, committer.
- Commandes : `npx tsc --noEmit` (typecheck), `npx vitest run <fichier>` (tests ciblés), `npx vitest run` (suite complète).

---

## 0. État des lieux

### 0.1 Fait (à retenir, déjà commité sur `main`)

Le sprint de fermeture des lacunes multi-org (B.1–B.8) est terminé et commité :
- `B.1` `canAccess` multi-org branché dans l'UI (`79b90e4`)
- `B.3` émissions d'invitations scopées (grants+tags+scope) actives (`0b7d807`)
- `B.4` claim d'invitation possible hors-ligne + QR payload v2 (`3a99986`, `ed6ef8d`)
- `B.7` notifications app + fix revue qualité (`ed6ef8d`)
- `B.8` route `OrgUnits` + garde-fous locaux sur mutations org (`e45d89f`)

Le fichier de plan précédent `docs/plans/2026-09-22-gaps-multi-org-closure.md` (non commité) documente ce lot.

### 0.2 Il reste à faire (ce plan)

7 tâches ordonnées par dépendances, en deux branches indépendantes :

| # | Tâche | Dépend de | Branch |
|---|-------|-----------|--------|
| 1 | **F.2a** — `kind` sur `ReportDefinition` (type + migration + repo + PS schema) | — | Rapports |
| 2 | **F.2b** — `aggregateFeatures` + `aggregateAudit` dans `AggregationEngine` + index composite audit | F.2a | Rapports |
| 3 | **F.2c** — `Reports.tsx` regroupe par kind | F.2a + F.2b | Rapports |
| 4 | **F.1a** — `FormFill` : rendu reference/file + conditionnel + validation regex/custom | — | Formulaires |
| 5 | **F.1b** — écriture vers entité cible via `mapFormFields` (dispatcher) | F.1a | Formulaires |
| 6 | **F.1c** — `FormSubmissions` : export CSV + affichage structuré (labels) | F.1a / F.1b | Formulaires |
| 7 | **F.3** — `FormBuilder` comme entrée d'admin (champ reference/file + config + publication + suivi + CSV) | F.1a + F.1c | Formulaires |

Branches `Rapports` et `Formulaires` sont indépendantes → exécutables en parallèle. `F.3` agrège le lot `F.1`.

### 0.3 Anomalies connues corrigées au passage

- `mapFormFields` dans `FormFill` est du **code mort** (résultat non utilisé) → activé par F.1b.
- L'index Postgres `idx_audit_entries_actor` est **cassé** (référence une colonne `actor_id` inexistante ; la vraie colonne est `user_id`) → on crée l'index composite correct dans la migration F.2b, sans toucher à l'orphan.
- Le schéma PowerSync `report_definitions` est **périodique/faux** (déclare `type`, `config` au lieu de `data_source`/`dimensions`/`metrics`/`filters`/`group_by`) → corrigé + `kind` dans F.2a.

---

## 1. Tâches TDD

### Task 1 — F.2a : `kind` sur `ReportDefinition`

**Files:**
- Modify: `src/types/index.ts` (`ReportDefinition` ligne ~379–396)
- Create: `supabase/migrations/20260922000001_report_definitions_kind.sql`
- Modify: `src/lib/reporting.ts` (`reportDefinitionRepo.create` INSERT ligne ~359–377 ; `.list()` SELECT ligne ~396–413 ; mapping camelCase)
- Modify: `src/lib/powersync/schema.ts` (Table `report_definitions` ligne ~379–389, corrigée + `kind`)
- Test: `src/lib/__tests__/form-report-audit.test.ts` (describe `reportDefinitionRepo` ligne ~833)

**Step 1: Écrire le test qui échoue**

Ajouter à `src/lib/__tests__/form-report-audit.test.ts` (dans le describe `reportDefinitionRepo`) :

```ts
it("create() persiste la colonne kind (défaut FINANCE si absent)", async () => {
  await reportDefinitionRepo.create({
    id: "rd-kind",
    orgId: ORG,
    name: "Rapport feature",
    kind: "FEATURE",
    dataSource: "features",
    dimensions: [],
    metrics: [],
    filters: [],
    groupBy: [],
    isTemplate: false,
  } as any);
  const lastSql = psStore.calls.at(-1)!.sql;
  expect(lastSql).toContain("INSERT INTO report_definitions");
  expect(lastSql).toMatch(/kind/);
  expect(psStore.calls.at(-1)!.params).toContain("FEATURE");
});

it("list() retourne kind", async () => {
  const rows = await reportDefinitionRepo.list();
  expect(rows[0]).toHaveProperty("kind");
});
```

**Step 2: Voir échouer**

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts -t "kind"
```
Attendu : FAIL (colonne `kind` absente de l'INSERT / du type).

**Step 3: Implémenter le minimum**

`src/types/index.ts` — dans `ReportDefinition`, ajouter :

```ts
/** Famille du rapport : financier classique, état de feature, ou journal d'audit. */
kind?: "FINANCE" | "FEATURE" | "AUDIT";
```

Migration `supabase/migrations/20260922000001_report_definitions_kind.sql` :

```sql
-- Lot F.2 : famille de rapport (FINANCE / FEATURE / AUDIT).
-- Défaut FINANCE pour rester rétro-compatible avec les rapports existants.
ALTER TABLE public.report_definitions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'FINANCE';
COMMENT ON COLUMN public.report_definitions.kind IS 'FINANCE | FEATURE | AUDIT';
```

`src/lib/reporting.ts` :
- INSERT `create` : ajouter `kind` dans la liste de colonnes et `?` (param `entry.kind ?? "FINANCE"`).
- `.list()` : ajouter `kind` dans le SELECT et mapper `kind: r.kind`.

`src/lib/powersync/schema.ts` : remplacer la table `report_definitions` (actuelle, fausse) par :

```ts
report_definitions: new Table({
  columns: {
    id: { type: "text", isPrimaryKey: true },
    org_id: "text",
    name: "text",
    kind: "text",
    data_source: "text",
    dimensions: "text",
    metrics: "text",
    filters: "text",
    group_by: "text",
    sort_by: "text",
    saved_by: "text",
    is_template: "integer",
    created_at: "text",
    updated_at: "text",
  },
  foreignKeys: [{ column: "org_id", references: "organizations(id)" }],
}),
```

**Step 4: Voir passer**

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts
npx tsc --noEmit
```
Attendu : PASS + typecheck clean.

**Step 5: Commit**

```bash
git add src/types/index.ts supabase/migrations/20260922000001_report_definitions_kind.sql src/lib/reporting.ts src/lib/powersync/schema.ts src/lib/__tests__/form-report-audit.test.ts
git commit -m "feat: F.2a — famille kind (FINANCE|FEATURE|AUDIT) sur ReportDefinition (type + migration + repo + PS schema)"
```

---

### Task 2 — F.2b : `aggregateFeatures` + `aggregateAudit` + index composite

**Files:**
- Modify: `src/lib/reporting.ts` (`AggregationEngine.execute` ligne ~82–88 ; ajouter `aggregateFeatures` ~103–220 après le pattern `aggregateFormSubmissions`)
- Create: `supabase/migrations/20260922000002_audit_entries_composite_index.sql`
- Test: `src/lib/__tests__/form-report-audit.test.ts` (describe `AggregationEngine.execute` ligne ~654)

**Step 1: Écrire le test qui échoue**

```ts
it("execute({dataSource:'audit'}) compte les entrées d'audit par action", async () => {
  const res = await AggregationEngine.execute({
    dataSource: "audit",
    metrics: ["count"],
    groupBy: ["action"],
  } as any);
  expect(res.rows.length).toBeGreaterThan(0);
  expect(res.columns).toContain("action");
});

it("execute({dataSource:'features'}) renvoie l'état de chaque feature", async () => {
  const res = await AggregationEngine.execute({
    dataSource: "features",
    metrics: ["count"],
  } as any);
  expect(res.rows.length).toBeGreaterThan(0); // au moins les 20 features de features.ts
});
```

> ⚠️ Dans le mock PowerSync du fichier de test, ajouter une route :
> `FROM audit_entries` → renvoie `auditFixtures` (2–3 lignes avec `action`, `entity_type`, `user_id`, `created_at`, `org_id`).

**Step 2: Voir échouer**

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts -t "execute"
```
Attendu : FAIL ("Unsupported data source").

**Step 3: Implémenter le minimum**

`src/lib/reporting.ts` — étendre `execute` :

```ts
async execute(query: ReportQuery): Promise<ReportResult> {
  if (query.dataSource === "transactions") return this.aggregateTransactions(query);
  if (query.dataSource === "form_submissions") return this.aggregateFormSubmissions(query);
  if (query.dataSource === "audit") return this.aggregateAudit(query);
  if (query.dataSource === "features") return this.aggregateFeatures(query);
  throw new Error(`Unsupported data source: ${query.dataSource}`);
}
```

`aggregateAudit(query)` — suivre le pattern `aggregateFormSubmissions` :
- SELECT borné `WHERE org_id = ?` (+ `DATE(created_at)` dans `filters` si fourni), `GROUP BY` sur `action` (ou la dimension demandée), métriques `count`/`sum`/`avg`/`min`/`max`.
- Mapper snake_case → camelCase.
- Cache via `get/set` avec préfixe `audit:`.

`aggregateFeatures(query)` — pas de SQL : construire les lignes côté client :
- `const featureKeys = Object.keys(FEATURES)` (importer depuis `@/lib/features` — le registre `FEATURES` expose ~20 ids).
- Pour chaque feature, compter les entrées d'audit récentes (`entity_type`/`action` mappés) via une requête `audit_entries` bornée → état `{featureKey, label, count, lastActivity}`.
- Retourner `{ rows, columns: ["feature", "count", "lastActivity"], meta }`.

Migration `supabase/migrations/20260922000002_audit_entries_composite_index.sql` :

```sql
-- Lot F.2b : index composite pour les rapports d'audit (groupBy + tri temporel).
-- Remplace en pratique l'orphan idx_audit_entries_actor (cassé, cf. état des lieux).
CREATE INDEX IF NOT EXISTS idx_audit_entries_entity_created
  ON public.audit_entries (entity_type, created_at DESC);
```

> Ne **pas** toucher à l'index orphan `idx_audit_entries_actor` dans cette migration (orphan = colonne absente ; on le signale, le cleanup est isolé ci-dessous en stabilisation).

**Step 4: Voir passer**

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts
npx tsc --noEmit
```
Attendu : PASS + typecheck clean.

**Step 5: Commit**

```bash
git add src/lib/reporting.ts supabase/migrations/20260922000002_audit_entries_composite_index.sql src/lib/__tests__/form-report-audit.test.ts
git commit -m "feat: F.2b — sources 'features' + 'audit' dans AggregationEngine + index composite audit_entries"
```

---

### Task 3 — F.2c : `Reports.tsx` regroupe par kind

**Files:**
- Modify: `src/pages/Reports.tsx` (section « Mes rapports » ligne ~445–491)
- Modify: `src/pages/ReportBuilder.tsx` (`emptyDraft` ligne ~135–144 ; `METRIC_FNS`/`GROUP_DIMS` ; `dataSource` par kind)

**Step 1: Écrire le test qui échoue**

Ajouter un test de composant (ou étendre le test `ReportBuilder` existant si présent) : le `emptyDraft` produit `dataSource: "features"` quand `kind === "FEATURE"` et `"audit"` quand `kind === "AUDIT"`, sinon `"transactions"`.

```ts
it("emptyDraft adapte dataSource à kind", () => {
  const d = (kind: any) => emptyDraft(kind);
  expect(d("FEATURE").dataSource).toBe("features");
  expect(d("AUDIT").dataSource).toBe("audit");
  expect(d("FINANCE").dataSource).toBe("transactions");
});
```
> `emptyDraft` doit être exporté depuis `ReportBuilder.tsx` pour être testable.

**Step 2: Voir échouer**

```bash
npx vitest run src/pages/__tests__/ReportBuilder.test.tsx  # ou le fichier de test adapté
```
Attendu : FAIL.

**Step 3: Implémenter le minimum**

`ReportBuilder.tsx` :
- `emptyDraft(kind = "FINANCE")` : brancher `dataSource` + proposer les `GROUP_DIMS` correspondant (FEATURE : `feature`/`lastActivity` ; AUDIT : `action`/`entityType`/`actor` ; FINANCE : inchangé).
- `METRIC_FNS` : ajouter `count` (déjà présent) — suffisant pour features/audit.
- Exporter `emptyDraft`.

`Reports.tsx` — section « Mes rapports » : regrouper `savedReports` par `kind` (`FINANCE` → « Rapports financiers », `FEATURE` → « État des features », `AUDIT` → « Journal / modifications »), chaque bloc avec bouton « Nouveau » menant à `/report-builder?kind=FEATURE` / `?kind=AUDIT`.

**Step 4: Voir passer**

```bash
npx vitest run
npx tsc --noEmit
```
Attendu : PASS.

**Step 5: Commit**

```bash
git add src/pages/Reports.tsx src/pages/ReportBuilder.tsx
git commit -m "feat: F.2c — Reports.tsx regroupe par kind + ReportBuilder adapte la source par kind"
```

---

### Task 4 — F.1a : `FormFill` rendu reference/file + conditionnel + validation

**Files:**
- Modify: `src/pages/FormFill.tsx` (rendu des champs ligne ~143–212 ; `handleSubmit` ligne ~46–64 ; brancher `validateFormSubmission`)
- Modify: `src/lib/formSystem.ts` (`validateFormSubmission` ligne ~140–184, ajouter regex/custom)
- Test: `src/lib/__tests__/form-report-audit.test.ts` (describe `validateFormSubmission` ligne ~365)

**Step 1: Écrire le test qui échoue**

```ts
it("rejette une valeur qui ne passe pas la regex de validation", () => {
  const res = validateFormSubmission(formDefWithRegex, { email: "pas-un-email" });
  expect(res.valid).toBe(false);
});
it("accepte une valeur qui passe la regex", () => {
  const res = validateFormSubmission(formDefWithRegex, { email: "a@b.cd" });
  expect(res.valid).toBe(true);
});
```
> `formDefWithRegex` : fixture avec un champ `email` `{ validation: { regex: "^.+@.+$" } }`.

**Step 2: Voir échouer**

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts -t "regex"
```
Attendu : FAIL (regex ignorée).

**Step 3: Implémenter le minimum**

`formSystem.ts` — dans `validateFormSubmission`, après le bloc min/max :

```ts
const val = data[field.key];
if (val !== undefined && val !== null && val !== "") {
  if (field.validation?.regex) {
    try {
      if (!new RegExp(field.validation.regex).test(String(val))) {
        errors.push(`Field ${field.label} format invalide`);
      }
    } catch {
      /* regex invalide — on ne bloque pas la soumission */
    }
  }
  if (typeof field.validation?.custom === "function") {
    const err = field.validation.custom(val, data);
    if (err) errors.push(err);
  }
}
```

`FormFill.tsx` :
- Appeler `validateFormSubmission(form, data)` dans `handleSubmit` et afficher `errors` si non vide (ne pas `create`).
- Brancher la **visibilité conditionnelle** AVANT le `form.fields.map` (ligne ~135) : filtrer les champs où `field.conditional && String(data[field.conditional.showIfField]) !== String(field.conditional.showIfValue)`.
- Insérer, entre la fin de la branche `textarea` (~191) et l'`input` fallback (~192), les deux nouveaux cas :
  - `reference` : `<select>` alimenté par `useMembers`/`useGroups`/`useEvents`/`useAccounts` selon `field.referenceEntityType` (fallback liste de membres si absent).
  - `file` : `<input type="file">` (stocker le nom du fichier dans `data[field.key]` — pas l'upload, hors périmètre Lot F).

**Step 4: Voir passer**

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts
npx tsc --noEmit
```
Attendu : PASS.

**Step 5: Commit**

```bash
git add src/pages/FormFill.tsx src/lib/formSystem.ts src/lib/__tests__/form-report-audit.test.ts
git commit -m "feat: F.1a — FormFill rend reference/file + conditionnel + validation regex/custom"
```

---

### Task 5 — F.1b : écriture vers l'entité cible (dispatcher)

**Files:**
- Modify: `src/pages/FormFill.tsx` (`handleSubmit` — activer `mapFormFields`, ligne ~53)
- Test: `src/lib/__tests__/form-report-audit.test.ts` (describe `mapFormFields` ligne ~416)

**Step 1: Écrire le test qui échoue**

```ts
it("mapFormFields ne retient que les champs mappés", () => {
  const out = mapFormFields(formDefWithMappings, { name: "A", code: "B" });
  expect(out).toEqual({ firstName: "A" }); // name → mapsToEntityField: firstName
});
```

**Step 2: Voir échouer** (le test documente le comportement déjà correct ; il échoue uniquement si le mappage de fixture n'est pas aligné).

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts -t "mapFormFields"
```

**Step 3: Implémenter le minimum**

`FormFill.tsx` — dans `handleSubmit`, après `formSubmissionRepo.create(...)` réussi :

```ts
if (form.targetEntityType && Object.keys(mapped).length > 0) {
  const dispatchers: Record<string, (p: any) => Promise<void>> = {
    member: async (p) => { await addMemberPS(p); },
    event: async (p) => { await addEventPS(p); },
    account: async (p) => { /* account n'a pas de createPS dédié — log-only */ },
  };
  const fn = dispatchers[form.targetEntityType];
  if (fn) await fn({ orgId, ...mapped, createdFromFormSubmissionId: submission.id });
}
```
> Importer `addMemberPS`/`addEventPS` depuis `@/lib/dataLayer`. Ne pas inventer de createPS inexistant : si `targetEntityType` n'a pas de dispatcher, ne rien écrire (le résultat reste dans `form_submissions`).

**Step 4: Voir passer**

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/pages/FormFill.tsx src/lib/__tests__/form-report-audit.test.ts
git commit -m "feat: F.1b — écriture vers entité cible (dispatcher mapFormFields) au submit du formulaire"
```

---

### Task 6 — F.1c : `FormSubmissions` export CSV + affichage structuré

**Files:**
- Modify: `src/pages/FormSubmissions.tsx` (affichage `<dl>` ligne ~135–152 ; ajouter bouton CSV + filtre statut)
- Test: `src/lib/__tests__/form-report-audit.test.ts` (exposer une fonction pure `buildSubmissionsCSV(rows, formDef)`)

**Step 1: Écrire le test qui échoue**

```ts
it("buildSubmissionsCSV mappe keys → labels et utilise ; comme séparateur", () => {
  const csv = buildSubmissionsCSV([subFixture], formDefWithLabels);
  expect(csv).toContain("Nom;");
  expect(csv).toContain(";");
});
```

**Step 2: Voir échouer**

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts -t "buildSubmissionsCSV"
```

**Step 3: Implémenter le minimum**

- `src/lib/formSystem.ts` : ajouter `buildSubmissionsCSV(rows: FormSubmission[], formDef: FormDefinition): string` — entêtes = labels des `formDef.fields` (fallback keys), ligne par soumission, séparateur `;`, BOM `﻿`.
- `FormSubmissions.tsx` : charger le `FormDefinition` correspondant (pour les labels), afficher `label` à la place de `key` dans le `<dl>`, ajouter le bouton **Exporter CSV** (pattern : `Blob` + `URL.createObjectURL` + `a.click()`, cf. `ReportBuilder.exportCSV`) et un filtre par statut (`SUBMITTED`/`PROCESSED`/`REJECTED`).

**Step 4: Voir passer**

```bash
npx vitest run src/lib/__tests__/form-report-audit.test.ts
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/pages/FormSubmissions.tsx src/lib/formSystem.ts src/lib/__tests__/form-report-audit.test.ts
git commit -m "feat: F.1c — FormSubmissions : affichage structuré (labels) + export CSV + filtre statut"
```

---

### Task 7 — F.3 : `FormBuilder` comme entrée d'administration

**Files:**
- Modify: `src/pages/FormBuilder.tsx` (`FIELD_TYPES` ligne ~20–28 ; `addField` ligne ~77–91 ; boutons publication/suivi ligne ~183–213)

**Step 1: Écrire le test qui échoue**

```ts
it("addField initialise la config par type (reference → referenceEntityType)", () => {
  const f = addField({ type: "reference" }) as any;
  expect(f.referenceEntityType).toBe("member"); // défaut raisonné
  expect(f.mapsToEntityField).toBeUndefined();
});
```
> `addField` doit être exportable/testable (ou testé via le composant si plus simple).

**Step 2: Voir échouer**

```bash
npx vitest run src/pages/__tests__/FormBuilder.test.tsx  # créer si absent
```

**Step 3: Implémenter le minimum**

`FormBuilder.tsx` :
- `FIELD_TYPES` : ajouter `reference` et `file` (2 types manquants).
- `addField` : selon le type, pré-initialiser `referenceEntityType` (défaut `member`) pour `reference`, et laisser `conditional`/`mapsToEntityField` éditables (champ dédié dans l'éditeur de champ).
- Boutons existants déjà branchés : « Publier » (toggle DRAFT↔PUBLISHED), « Soumissions » (`/forms/:id/submissions`), « Exporter CSV » (vers F.1c — naviguer vers la page soumissions où le CSV vit).
- Éditeur de champ : exposer `conditional.showIfField`/`showIfValue`, `validation.regex`, `mapsToEntityField`.

**Step 4: Voir passer**

```bash
npx vitest run
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/pages/FormBuilder.tsx src/pages/__tests__/FormBuilder.test.tsx
git commit -m "feat: F.3 — FormBuilder comme entrée d'admin : champs reference/file + config + publication + suivi"
```

---

## 2. Stabilisation & validation (après les 7 tâches)

1. **Typecheck global :**
   ```bash
   npx tsc --noEmit
   ```
2. **Suite Vitest complète** (l'échec 876ᵉ est un artefact du worker pool `[vitest-pool] Timeout`, pas un test réel) :
   ```bash
   npx vitest run
   ```
   Si un timeout de pool apparaît, relancer le fichier concerné isolément :
   ```bash
   npx vitest run src/lib/__tests__/<fichier>
   ```
3. **Cleanup de l'index orphan** (à part, non bloquant) :
   - Créer `supabase/migrations/20260922000003_drop_orphan_audit_index.sql` :
     ```sql
     -- idx_audit_entries_actor référence une colonne inexistante (actor_id) ;
     -- la colonne réelle est user_id. On le supprime proprement.
     DROP INDEX IF EXISTS public.idx_audit_entries_actor;
     ```
4. **Graphify (obligatoire après modif de code) :**
   ```bash
   graphify update .
   ```
5. **Portes de qualité CCG (non-bloquantes, >30 lignes) :**
   ```
   /ccg:verify-change
   /ccg:verify-quality src/lib/reporting.ts
   /ccg:verify-quality src/pages/FormFill.tsx
   ```

---

## 3. Commit & push GitHub

Les 2 fichiers orphelins de la session précédente doivent rentrer dans ce commit de clôture :
- `docs/plans/2026-09-22-gaps-multi-org-closure.md`
- `supabase/migrations/20260921000007_powersync_grants_write_access.sql`

```bash
git add docs/plans/2026-09-22-gaps-multi-org-closure.md supabase/migrations/20260921000007_powersync_grants_write_access.sql
git commit -m "chore: plan de clôture gaps multi-org + grants write AccessPowerSync"

git push origin main
```

> 8 commits non pûshés de `B.1`–`B.8` (`e45d89f`→`4deda57`) + les commits Lot F de ce plan + ce commit de clôture seront pûshés d'un coup.

---

## 4. Hors périmètre (ne PAS faire ici)

- Upload binaire des fichiers `file` dans un storage (ici on ne stocke que le nom).
- UI de rendu de graphique pour les nouveaux rapports FEATURE/AUDIT dans `ReportBuilder` (l'export CSV + la liste de lignes suffisent pour ce lot).
- Suppression des migrations périodiques autres que l'index orphan (ne pas toucher au legacy).
- Toute feature Lazyweb/UI redesign — hors demande.
