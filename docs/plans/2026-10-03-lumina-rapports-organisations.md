# Lumina — Rapports de gestion inter-organisations (PDF/Word/Excel/PNG)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre à une organisation (annexe) de générer et envoyer à sa mère un rapport de gestion détaillé (finances + événements + membres + documents), le recevoir côté mère avec prévisualisation intégrée, dans une hiérarchie de profondeur illimitée — en laissant le dashboard admin central et le mode mono-org intacts.

**Architecture:** La hiérarchie mère/annexe EXISTE déjà (`organizations.parent_org_id`, migration `000004`, edge `create_org`, capability `federation`). Cette feature **s'appuie dessus**, elle ne la recrée pas. Ce qu'on ajoute : (a) une table `org_reports` + bucket storage privé + outbox offline-first ; (b) une page d'émission (dashboard admin de l'org, section « Envois ») qui génère PDF/Word/Excel/PNG depuis la SQLite locale via le moteur `lib/export.ts` existant + recharts ; (c) une page de réception (dashboard mère) avec liste + prévisualisation PDF intégrée (`react-pdf`/`pdf.js` à installer) ; (d) un picker de documents uploadés (feature `documents` + `useDocuments` + `lib/storageService` déjà présentes) pour joindre des pièces à un rapport destiné à une org ciblée. **Frein levé par ce plan :** le RLS `orgs_select_federation` (000004 L30-35) ne couvre que la profondeur 2 → on ajoute une policy `WITH RECURSIVE` + un stream PowerSync aligné pour l'illimité.

**Tech Stack:** Ionic React, Supabase migrations `20261003000002+`, Storage buckets, PowerSync outbox, `jspdf`+`jspdf-autotable`+`xlsx` (déjà installés) via `lib/export.ts`, `react-pdf` (à installer) pour la prévisualisation, `docx` (à installer) pour le format Word, `recharts` (installé).

**Invariants Lumina (jamais violés) :**
- Non-régression : dashboard central (`CentralAdmin.tsx`) et mode mono-org (`getOrganizationId()`) intacts. La feature **s'ajoute** (nouvelles routes + section), ne remplace rien.
- Ne jamais créer de modèle de données concurrent d'un modèle existant : `org_reports` est une nouvelle table, mais le parentage réutilise `parent_org_id` (pas d'arbre parallèle).
- Offline-first : génération 100% locale (SQLite PowerSync), upload + écriture au retour de connexion, idempotent (dédup sur `event_id`/période).
- RLS : émetteur lit ses envois, mère lit ses réceptions, création d'annexe réservée à l'admin de la parente ; accès autorisés ET refusés testés.
- Formulaires = grammaire ionique canonique ; couleurs = tokens (`--data-*`, `--accent-primary`).
- `Co-Authored-By: Claude <noreply@anthropic.com>`, tsc-gated, `graphify update .` par batch.

---

## Phase 0 — Audit (fait, lecture seule)

Constats des 3 agents :

- **Hiérarchie canonique** : `organizations` + `parent_org_id` FK récursive (000001 + 000004), `create_org` edge (service_role, gate grant), `federation` capability (arbre liste + graphe React Flow livré en M22/M23). **Frein : RLS 000004 profondeur 2** (parent + enfants directs), pas de CTE → illimité = à corriger ici.
- **Dupliqué à connaître** : `useOrganizations("central")` ≡ `federation.listOrgs` ≡ `listUserOrgs` (3 unions de 3 sources ; `listUserOrgs`/`useOrganizations` n'ont que 2 sources → un user multi-org sans profil legacy ne voit rien). `PSOrganization` vs `FederationOrg` (2 interfaces, même table). **Ce plan utilise la capability `federation` (canonique) pour tout le parentage** et n'ajoute pas de 4e union.
- **Sources de données pour le rapport (EXISTENT, 100% locales PowerSync)** : `transactions`/`caisses`/`accounts`/`versements` (grand livre), `events`/`event_budgets`/`budget_lines`/`org_budgets`/`cotisations`, `members`/`groups`/`group_memberships`/`org_memberships`, `documents`. Agrégation client déjà dans `Reports.tsx`/`Balance.tsx` + moteur `lib/reporting.ts` (AggregationEngine). **Exports : `lib/export.ts` opérationnel** (`exportPDF` jsPDF+autoTable, `exportExcel` XLSX, `exportCSV`).
- **Documents uploadés : feature COMPLÈTE** — table `documents` (0041, buckets `archives`/`expense_proofs`/`logos`), `useDocuments` (dataLayer:673), `addDocumentPS` (1318), `lib/storageService.ts` (URL signées 30 min), page `Archives.tsx`. **Aucune création nécessaire** pour le picker.
- **Tâches/sous-tâches : inexistantes** (couvertes par le plan calendrier, à croiser dans le rapport si le périmètre l'exige).
- **Libs absentes** : `pdfjs`/`react-pdf` (prévisualisation), `docx` (Word). → à installer Phase 1.
- **`org_reports` n'existe pas** (0 résultat) → table à créer.

### Rapport de risques Phase 0

| Risque | Mitigation |
|---|---|
| RLS profondeur 2 freine l'illimité | Policy `WITH RECURSIVE` sur `organizations` + stream PowerSync recalé (Phase 1, Task 1.2) |
| Divergence des 3 unions d'« orgs visibles » | Utiliser UNIQUEMENT `federation.listOrgs` / `federation` capability ; ne pas en créer une 4e |
| Outbox hors-ligne : upload Storage avant écriture DB | Séquencer : générer PDF → `uploadLuminaFile` (bucket privé) → INSERT `org_reports` (pdf_path) → `read_at=null` ; idempotent par clé `event_id+period` |
| Prévisualisation PDF lourde sur mobile (Capacitor) | `react-pdf` rend canvas, lazy-load le lecteur ; fallback téléchargement (URL signée 30 min) |
| Word/Excel/PNG multi-format | `docx` (Word) + `xlsx` (Excel) + `jspdf` (PDF) + recharts→PNG ; un seul générateur, export multi-format |
| Non-régression dashboard central | Nouvelles routes `/admin/reports` (reception) + section « Envois » dans l'admin org ; `CentralAdmin.tsx` inchangé |

**STOP — confirmation demandée avant Phase 1.**

---

## Phase 1 — Domaine, données, sécurité

**Objectif :** `org_reports` + bucket privé + RLS récursif + stream PowerSync + outbox. Testé (accès autorisés ET refusés).

### Task 1.1 — Type + migration `org_reports`

**Files:**
- Create: `supabase/migrations/20261003000002_create_org_reports.sql`
- Create: `src/lib/powersync/org-reports-schema.ts` (puis assemblage dans `schema.ts`)

**Step 1: Collision check** — `SELECT ... FROM pg_class WHERE relname='org_reports'` (aucune collision attendue, table nouvelle).

**Step 2: Écrire + appliquer la migration** (MCP `execute_sql`, bloc par bloc, `aurora_`/`_history` si collision) :
```sql
CREATE TABLE IF NOT EXISTS public.org_reports (
  id text PRIMARY KEY,
  from_org_id text NOT NULL,            -- émetteur (l'annexe)
  to_org_id text NOT NULL,              -- destinataire (la mère) = parent_org_id de from_org
  period_start date NOT NULL,
  period_end date NOT NULL,
  format text NOT NULL DEFAULT 'pdf'
    CHECK (format IN ('pdf','docx','xlsx','png')),
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',  -- agrégats calculés (finances/événements/membres)
  pdf_path text,                         -- bucket privé, clé storage
  document_refs text[] DEFAULT '{}',    -- ids documents uploadés joints (picker)
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENT','READ','FAILED')),
  read_at timestamptz,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (from_org_id, to_org_id, period_start, period_end, format)
);
ALTER TABLE public.org_reports ENABLE ROW LEVEL SECURITY;
-- Rationale: accès restreints (pas USING(true) global) :
CREATE POLICY "org_reports_emitter" ON public.org_reports FOR SELECT, INSERT, UPDATE
  USING (from_org_id = current_org_id()) WITH CHECK (from_org_id = current_org_id());
CREATE POLICY "org_reports_receiver" ON public.org_reports FOR SELECT
  USING (to_org_id = current_org_id());
GRANT SELECT, INSERT, UPDATE ON public.org_reports TO authenticated, service_role;
CREATE INDEX idx_org_reports_to ON public.org_reports(to_org_id, period_start DESC);
CREATE INDEX idx_org_reports_from ON public.org_reports(from_org_id, period_start DESC);
```
(Le helper `current_org_id()` — SECURITY DEFINER retournant l'org courante de l'appelant — est créé dans la même migration si absent ; aligné sur `is_org_member`.)

**Step 3: Vérifier** — compter policies/indexes de `org_reports`.

**Step 4: Schema PowerSync** — `org_reports` (auto_subscribe:false, scoping `from_org_id = auth profile OR to_org_id` via stream dédié dans `sync-config.yaml`).

**Step 5: Commit**
```bash
git add supabase/migrations/20261003000002_create_org_reports.sql src/lib/powersync/
git commit -m "feat(organisations): table org_reports + RLS émetteur/récepteur + PowerSync (Phase 1)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 1.2 — RLS récursif (illimité) + stream aligné

**Files:**
- Create: `supabase/migrations/20261003000003_recursive_org_federation_rls.sql`
- Modify: `powersync/sync-config.yaml` (stream `organizations` → version récursive)

**Step 1: Écrire la policy CTE** (remplace l'extension de profondeur-2 de `orgs_select_federation`) :
```sql
-- Vue closure transitive de la famille organisationnelle (profondeur illimitée).
CREATE OR REPLACE VIEW public.org_family AS
WITH RECURSIVE fam AS (
  SELECT id AS org_id, id AS ancestor, 0 AS depth FROM organizations
  UNION ALL
  SELECT o.id, f.ancestor, f.depth+1 FROM organizations o JOIN fam f ON o.parent_org_id = f.org_id
) SELECT ancestor, org_id FROM fam;
-- RLS : voir sa famille complète (soi + ascendants + descendants) :
CREATE POLICY "orgs_select_federation_recursive" ON public.organizations FOR SELECT
  USING (id IN (SELECT org_id FROM public.org_family
                 WHERE ancestor = (SELECT org_id FROM profiles WHERE id = auth.uid()))
         OR id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
```

**Step 2: Collision check + appliquer**, vérifier `pg_views`/`pg_policy`.

**Step 3: Aligner le stream PowerSync** sur `org_family` (chacun ne réplique que SA famille + `org_reports` qui le concerne).

**Step 4: tsc + tests RLS** — simuler `SET ROLE authenticated` + `SET request.jwt.claims` : un admin d'annexe lit sa famille ; un user sans accès refuse. **Test des accès autorisés ET refusés** (règle du projet).

**Step 5: Commit**
```bash
git add supabase/migrations/20261003000003_recursive_org_federation_rls.sql powersync/sync-config.yaml
git commit -m "feat(organisations): RLS récursif + vue org_family (profondeur illimitée) (Phase 1)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 1.3 — Bucket storage privé + outbox

- `lib/storageService.ts` : ajouter bucket `org_reports` (privé) + `uploadReportFile(orgReports)` / `getReportUrl(id)` (URL signée 30 min).
- Outbox offline-first (pattern des tables PowerSync) : `org_reports` scoping `org_id`, statut `PENDING` hors-ligne → `uploadLuminaFile` puis INSERT au retour. Idempotente via la clé `UNIQUE`.

**Commit** (tsc-gated) : `feat(organisations): bucket privé org_reports + outbox offline-first (Phase 1)`

**STOP après Phase 1 — rapport + confirmation.**

---

## Phase 2 — Création d'annexe (récursive)

**Objectif :** section « Mes annexes » dans le dashboard admin de chaque org + création récursive + déblocage des fonctions « mère ».

### Task 2.1 — Section « Mes annexes »

**Files:**
- Modify: `src/pages/CentralAdmin.tsx` (NOUVELLE section, non-régression : on n'y touche que par ajout)
- Create: `src/components/OrgChildren.tsx` (liste des annexes directes + sous-arbre, via `federation.getOrgChildren` + `org_family`)

**Step 1: Section** — sous le panneau « Organisations gérées », « Mes annexes » = `federation.getOrgChildren(currentOrg)` ; arbre récursif (unfold par `parent_org_id` sur `org_family`). Bouton « Créer une annexe » → `createOrganization` (capability) avec `parentOrgId = currentOrg`.

**Step 2: Déblocage** — une org avec ≥1 annexe active les fonctions « mère » (section rapports reçus, consolidation) pour son sous-arbre, sans perdre le lien vers sa propre mère. Gating = `federation.getOrgChildren(org).length > 0`.

**Step 3: tsc** → PASS.

**Step 4: Commit**
```bash
git add src/pages/CentralAdmin.tsx src/components/OrgChildren.tsx
git commit -m "feat(organisations): section Mes annexes + création récursive (Phase 2)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

**STOP après Phase 2 — rapport + confirmation.**

---

## Phase 3 — Génération + envoi du rapport (offline-first)

**Objectif :** bouton « Envoyer un rapport » (visible si l'org a une mère), choix de la période + du format, génération depuis la SQLite locale, outbox.

### Task 3.1 — Moteur de composition du rapport

**Files:**
- Create: `src/lib/orgReport.ts` (compose `useTransactions + useCaisses + useEvents + useMembers + useGroups + useDocuments` → un agrégat JSON ; période mensuelle/semestrielle/annuelle)

**Step 1: Test qui échoue** (fonction pure d'agrégation) :
```ts
import { buildOrgReport } from "./orgReport";
test("agrège revenus/dépenses par caisse sur la période", () => {
  const r = buildOrgReport({ transactions: [ /* INCOME+EXPENSE sur caisse */ ], period: {...} });
  expect(r.summary.netResult).toBeGreaterThan(0);
});
```
**Step 2: Lancer, doit échouer.** **Step 3: Implémenter** — agrégats (synthèse + transactions détaillées + événements/tâches + membres/groupes + documents joints). **Step 4: Tester, doit passer.** **Step 5: Commit** `feat(organisations): moteur de composition du rapport de gestion (Phase 3)`

### Task 3.2 — Multi-format (PDF/Word/Excel/PNG)

**Files:**
- Modify: `src/lib/export.ts` (fonction `exportOrgReport(report, format)` réutilisant `exportPDF`/`exportExcel` + `docx` (à installer) + recharts→PNG)

**Step 1: Installer** — `npm i docx react-pdf` (PDF prévisualisation Phase 4 ; `docx` ici).
**Step 2: `exportOrgReport`** — dispatch par format, graphique recharts (revenus/dépenses), table autoTable (transactions), FCFA/`formatCurrencyCompact`.
**Step 3: tsc** → PASS. **Commit** `feat(organisations): export multi-format du rapport (pdf/docx/xlsx/png) (Phase 3)`

### Task 3.3 — Bouton « Envoyer un rapport » + picker de documents

**Files:**
- Create: `src/pages/OrgReportSend.tsx` (section de l'admin org)
- Modify: `src/components/DocumentPicker.tsx` (picker `useDocuments()` → sélection `document_refs`)

**Step 1: Page d'émission** — visible que si `federation.getOrgParent(org)` existe. Choix période + format + picker de documents uploadés (joindre aux `document_refs`) + destinataire (la mère, ou une org ciblée de la famille). Générer (local) → outbox `PENDING` → upload + INSERT `org_reports` au retour. Traçabilité (`created_by`).
**Step 2: tsc** → PASS. **Commit** `feat(organisations): page d'émission du rapport + picker documents (Phase 3)`

**STOP après Phase 3 — rapport + confirmation.**

---

## Phase 4 — Réception + prévisualisation

**Objectif :** page « Rapports reçus » côté mère + lecteur PDF intégré.

### Task 4.1 — Page « Rapports reçus »

**Files:**
- Create: `src/pages/OrgReportsReceived.tsx` (route `/admin/reports`)
- Modify: `src/ionic/routes/admin.tsx` (nouvelle route)

**Step 1: Page** — liste des `org_reports WHERE to_org_id = currentOrg`, filtres par annexe + période, lu/non lu (`read_at`), notification. `navigate` depuis le dashboard admin.
**Step 2: tsc** → PASS. **Commit** `feat(organisations): page Rapports reçus (reception) (Phase 4)`

### Task 4.2 — Lecteur PDF intégré

**Files:**
- Create: `src/components/PdfPreview.tsx` (`react-pdf`, rendu canvas, zoom + pagination)
- Modify: `src/pages/OrgReportsReceived.tsx` (ouverture en preview, URL signée 30 min)

**Step 1: Lecteur** — `pdfjs` rendu canvas, zoom/pagination, lecture immédiate sans téléchargement ; téléchargement/partage (Capacitor) en option. **Step 2: tsc** → PASS. **Step 3: Mark `read_at`** à l'ouverture. **Commit** `feat(organisations): prévisualisation PDF intégrée (Phase 4)`

**STOP après Phase 4 — rapport + confirmation.**

---

## Phase 5 — Vérification

- `npx tsc --noEmit` global → 0 erreur. `npx vitest run src/lib/orgReport.test.ts`.
- Test hiérarchie à **4 niveaux** (mère → A → B → C) : création récursive + envoi C→B→A→mère ; envoi hors-ligne puis reconnexion (outbox idempotent).
- Test RLS : accès autorisé (émetteur/récepteur) ET refus (tiers sans famille).
- Vérifier **non-régression** : dashboard central `CentralAdmin.tsx` et le mode mono-org inchangés ; les tabs BottomNav et autres vues intactes.
- Déploiement Render post-PR.
- `graphify update .` + commit du graphe.

---

## Résumé des livrables Phase par Phase

| Phase | Livrable | STOP |
|---|---|---|
| 0 | Audit + rapport de risques (fait) | ✅ demandé |
| 1 | `org_reports` + RLS récursif (`org_family`) + bucket privé + outbox | après Task 1.3 |
| 2 | Section « Mes annexes » + création récursive + déblocage | après Task 2.1 |
| 3 | Moteur de composition + multi-format + page émission + picker docs | après Task 3.3 |
| 4 | Page réception + prévisualisation PDF intégrée | après Task 4.2 |
| 5 | Vérif (hiérarchie 4 niveaux, RLS, outbox, non-régression, Render) | rapport final |
