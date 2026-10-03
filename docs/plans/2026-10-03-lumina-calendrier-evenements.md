# Lumina — Calendrier professionnel + timeline + tâches d'événement

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Donner à Lumina un calendrier maison 100% conforme à la charte ionique (jour / semaine / mois / année), une timeline chronologique des événements (passés + à venir), et la capacité de créer des tâches/sous-tâches + un « groupe doit » par événement.

**Architecture:** Un composant maison `EventCalendar` (date-fns 3.6, sans UI tierce) dans `src/components/EventCalendar/` qui se branche sur `useEvents()` (dataLayer.ts:328) + `sortedEvents`/`STATUS_COLORS` déjà présents dans `Events.tsx`. Les tâches sont une nouvelle table `event_tasks` (migration Supabase + schema PowerSync + hook `useEventTasks` + outbox), et le « groupe doit » est un champ `obligation_group_id` qui référence `groups` (feature « documents uploadés » et exports PDF/Excel existent déjà et sont réutilisés pour l'affichage du rapport des tâches). La page `/events` passe en segmented control Liste | Calendrier | Timeline (pattern tabs copié d'`EventDetail.tsx`).

**Tech Stack:** Ionic React 9, Tailwind (tokens Lumina), date-fns ^3.6.0, PowerSync/SQLite local, Supabase migrations `20261003000001+`, `@xyflow`/`recharts` (graphiques éventuels dans le rapport).

**Invariants Lumina à respecter (jamais violés) :**
- Tout formulaire = grammaire canonique `IonItem lines="none" bg-card rounded-xl` + `IonLabel position="floating"` + `IonInput/IonTextarea/IonSelect slot="input"` (pattern `Versement.tsx` / `TransactionNew.tsx`).
- Jamais de couleur brute pour les données/finances : `var(--data-planified)`, `var(--data-income)`, `var(--data-expense)`, `var(--data-pending)`, `var(--accent-primary)`, `color-mix(in srgb, var(--token) N%, transparent)`.
- `event_tasks` ne double pas `ShoppingItem`/`BudgetItem` — c'est une entité autonome (suivi d'exécution), liée à `events(id)`.
- Le mode mono-org reste intact (`getOrganizationId()` scoping sur toutes les requêtes).
- Commits conventionnels, tsc-gated, `Co-Authored-By: Claude <noreply@anthropic.com>`. `graphify update .` après chaque batch de modifications de code.

---

## Conventions de test (projet)

Projet Ionic/Vite. Le projet n'a pas de suite Vitest de bout-en-bout obligatoire sur les composants UI ; le pattern de ce repo = **tsc-gated + test unitaire ciblé des pures fonctions** (dates, layout, agrégation) via `npx vitest run <file>` si le harnais l'expose, sinon validation par `npx tsc --noEmit` + test manuel via le dev server. Chaque tâche se termine par un commit.

Utilise `node --experimental-strip-types` pour les tests de fonctions pures si nécessaire. Les commandes exactes sont données par tâche.

---

## Phase 0 — Audit (fait, lecture seule)

L'audit a été réalisé par 3 agents d'exploration. Constat clé pour cette feature :

- **`useEvents()`** (dataLayer.ts:328) : `SELECT ... FROM events WHERE org_id = ? ORDER BY start_date ASC`, shape `PSEvent` (snake_case). **Les pages lisent `start_date` OU `startDate`** (camelCase legacy IndexedDB) — le calendrier doit gérer les deux (`getEventStart(e) = e.start_date ?? e.startDate`).
- **`STATUS_COLORS`/`STATUS_LABELS`** (Events.tsx:19-31) : PLANIFIED→`--data-planified`, ONGOING→`--data-income`, COMPLETED→`--text-tertiary`, CANCELLED→`--data-expense`. À factoriser dans `src/lib/event-status.ts` pour partager avec le calendrier + timeline.
- **Aucun type tâche/sous-tâche n'existe** (0 résultat). `ShoppingItem`/`BudgetItem` sont des sous-éléments financiers, pas un suivi d'exécution.
- **Calendrier existant** : `src/components/ui/calendar.tsx` = wrapper shadcn `react-day-picker` (tokens shadcn, hors charte Lumina). **Ne pas réutiliser** : le calendrier maison va dans `src/components/EventCalendar/`.
- **Router** (routes/events.tsx) : `/events`, `/event/new`, `/event/:id`, `/event/:id/edit`. **BottomNav** : feature `events` (route `/events`, icône `CalendarDays`) n'est pas dans `DEFAULT_NAV_TABS` (max 4 tabs) — **ne pas ajouter un 5e tab** ; le calendrier est une sous-vue de `/events`.
- **Exports** : `lib/export.ts` (exportPDF/exportExcel/exportCSV) déjà opérationnel → réutilisable pour exporter les tâches d'un événement dans un rapport.

### Rapport de risques Phase 0

| Risque | Mitigation |
|---|---|
| `start_date` vs `startDate` (2 formes) | Helper `getEventStart(e)` / `getEventEnd(e)` unique, tous les composants l'utilisent |
| 5e tab BottomNav interdit (max 4) | Le calendrier = segmented control sur `/events`, pas une feature nav |
| `addEventPS` n'insère pas la colonne `type` (incohérence existante) | Hors périmètre calendrier ; documenté, non corrigé ici |
| Tâches offline-first (PowerSync upload queue) | `event_tasks` scoping `org_id = getOrganizationId()`, outbox idempotente comme les autres tables |
| `ui/calendar.tsx` shadcn polluant la charte | Nouveau compo maison, zéro dépendance à `react-day-picker` |

**STOP — confirmation demandée avant Phase 1.**

---

## Phase 1 — Domaine + données (tâches/sous-tâches)

**Objectif :** table `event_tasks` (Supabase + PowerSync) + hook + type, sans toucher à l'UI existante.

### Task 1.1 — Type `EventTask` + helpers de dates

**Files:**
- Create: `src/types/event-task.ts`
- Create: `src/lib/event-status.ts` (factorise `STATUS_COLORS`/`STATUS_LABELS` + `getEventStart`/`getEventEnd`)
- Test: `src/lib/event-status.test.ts`

**Step 1: Écrire le test qui échoue** (`src/lib/event-status.test.ts`) :
```ts
import { getEventStart, getEventEnd } from "./event-status";

test("gère start_date (snake) et startDate (camel)", () => {
  expect(getEventStart({ start_date: "2026-10-01" } as any)).toBe("2026-10-01");
  expect(getEventStart({ startDate: "2026-11-05" } as any)).toBe("2026-11-05");
  expect(getEventEnd({ end_date: null } as any)).toBeNull();
});
```

**Step 2: Lancer, doit échouer** — `npx vitest run src/lib/event-status.test.ts` → FAIL (module absent).

**Step 3: Implémenter le minimum** (`src/lib/event-status.ts`) :
```ts
export const EVENT_STATUS_COLORS: Record<string, string> = {
  PLANIFIED: "var(--data-planified)",
  ONGOING: "var(--data-income)",
  COMPLETED: "var(--text-tertiary)",
  CANCELLED: "var(--data-expense)",
};
export const EVENT_STATUS_LABELS: Record<string, string> = {
  PLANIFIED: "Planifié", ONGOING: "En cours", COMPLETED: "Terminé", CANCELLED: "Annulé",
};
export const getEventStart = (e: any): string | null =>
  (e?.start_date ?? e?.startDate ?? null) || null;
export const getEventEnd = (e: any): string | null =>
  e?.end_date ?? e?.endDate ?? null;
```

**Step 4: Tester, doit passer** — `npx vitest run src/lib/event-status.test.ts` → PASS.

**Step 5: Commit**
```bash
git add src/lib/event-status.ts src/lib/event-status.test.ts
git commit -m "feat(calendar): helpers de dates événements + statut factorisés (Phase 1)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 1.2 — Migration Supabase `event_tasks`

**Files:**
- Create: `supabase/migrations/20261003000001_create_event_tasks.sql`

**Step 1: Écrire la migration** (via `mcp__supabase__execute_sql` bloc par bloc, convention `aurora_`/`_history` si collision — ici table nouvelle, pas de collision) :
```sql
CREATE TABLE IF NOT EXISTS public.event_tasks (
  id text PRIMARY KEY,
  org_id text NOT NULL DEFAULT 'org-1',
  event_id text NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  is_sub boolean NOT NULL DEFAULT false,
  parent_task_id text REFERENCES public.event_tasks(id) ON DELETE CASCADE,
  assigned_group_id text,             -- « groupe doit » (réf groups.id)
  due_date text,                      -- échéance (ISO date)
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','IN_PROGRESS','DONE','BLOCKED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.event_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_tasks_open_all" ON public.event_tasks FOR ALL USING (true) WITH CHECK (true);
-- Rationale: registre global, scoping org_id appliqué côté client (pattern identique à events).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_tasks TO anon, authenticated, service_role;
CREATE INDEX idx_event_tasks_event ON public.event_tasks(event_id);
CREATE INDEX idx_event_tasks_org ON public.event_tasks(org_id);
```

**Step 2: Vérifier les collisions** — `mcp__supabase__list_tables` (verbose) + `SELECT ... FROM pg_class WHERE relname='event_tasks'` **avant** le `CREATE`. Aucune collision attendue.

**Step 3: Appliquer + vérifier** — `mcp__supabase__execute_sql` bloc par bloc, puis compter `pg_policy`/`pg_trigger`/`pg_index` de la table.

**Step 4: Ajouter au schema PowerSync** (`src/lib/powersync/schema.ts`, après `events`) :
```ts
event_tasks: {
  columns: ["id","org_id","event_id","title","description","is_sub","parent_task_id",
    "assigned_group_id","due_date","status","created_at","updated_at"],
  indexes: [{columns:["event_id"]},{columns:["org_id"]}],
}
```

**Step 5: Commit**
```bash
git add supabase/migrations/20261003000001_create_event_tasks.sql src/lib/powersync/schema.ts
git commit -m "feat(calendar): table event_tasks + schema PowerSync (Phase 1)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 1.3 — Type `EventTask` + hook `useEventTasks` + outbox

**Files:**
- Modify: `src/lib/dataLayer.ts` (hook + `addEventTaskPS`/`updateEventTaskPS`)
- Test: `src/lib/event-task.test.ts` (si le hook expose une fonction pure d'agrégation)

**Step 1: Ajouter dans `dataLayer.ts`** (après `useEvents`, à côté de `PSEvent`) :
```ts
export interface PSEventTask {
  id: string; org_id: string; event_id: string; title: string; description: string;
  is_sub: number; parent_task_id: string | null; assigned_group_id: string | null;
  due_date: string | null; status: string; created_at: string; updated_at: string;
}
export function useEventTasks(eventId?: string) {
  const { data: psData } = useQuery<PSEventTask>(
    "SELECT id, org_id, event_id, title, description, is_sub, parent_task_id, assigned_group_id, due_date, status, created_at, updated_at FROM event_tasks WHERE org_id = ? AND (? IS NULL OR event_id = ?) ORDER BY created_at",
    [getOrganizationId(), eventId ?? null, eventId ?? null],
  );
  return { data: psData, isLoading: false, source: "powersync" as const };
}
```
+ `addEventTaskPS(task)` / `updateEventTaskPS(id, partial)` via `executeWrite` (pattern `addEventPS`).

**Step 2: tsc** — `npx tsc --noEmit` → PASS.

**Step 3: Commit**
```bash
git add src/lib/dataLayer.ts
git commit -m "feat(calendar): hook useEventTasks + outbox (Phase 1)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

**STOP après Phase 1 — rapport + confirmation.**

---

## Phase 2 — Calendrier maison (jour/semaine/mois/année)

**Objectif :** `src/components/EventCalendar/` — grille maison, pas de lib tierce, conforme à la charte.

### Task 2.1 — `useCalendarData` (pures fns date-fns)

**Files:**
- Create: `src/components/EventCalendar/useCalendarData.ts`
- Test: `src/components/EventCalendar/useCalendarData.test.ts`

**Step 1: Test qui échoue** :
```ts
import { buildMonthGrid, buildWeekDays, buildYearGrid } from "./useCalendarData";

test("buildMonthGrid retourne 42 cellules (6 semaines)", () => {
  const g = buildMonthGrid(new Date(2026, 9, 15));
  expect(g).toHaveLength(42);
  expect(g[0].inMonth).toBe(false); // premier du mois peut être hors-mois
});
test("buildYearGrid retourne 12 mois", () => {
  expect(buildYearGrid(new Date(2026,0,1))).toHaveLength(12);
});
```

**Step 2: Lancer, doit échouer** — `npx vitest run src/components/EventCalendar/useCalendarData.test.ts`.

**Step 3: Implémenter** (`useCalendarData.ts`, date-fns `startOfMonth/endOfWeek/startOfYear/addDays/isSameDay`…) :
```ts
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, differenceInCalendarDays,
  isSameDay, isSameMonth, startOfYear, addYears, eachDayOfInterval, startOfMonth as so,
} from "date-fns";

export interface CalCell { date: Date; inMonth: boolean; isToday: boolean; }

export function buildMonthGrid(cursor: Date): CalCell[] {
  const today = new Date();
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  return eachDayOfInterval({ start: gridStart, end: addDays(endOfMonth(cursor), 21) }).map((d) => ({
    date: d,
    inMonth: isSameMonth(d, cursor),
    isToday: isSameDay(d, today),
  }));
}
export function buildWeekDays(cursor: Date): CalCell[] {
  const today = new Date();
  return eachDayOfInterval({ start: startOfWeek(cursor, {weekStartsOn:1}), end: endOfWeek(cursor,{weekStartsOn:1}) })
    .map((d) => ({ date: d, inMonth: true, isToday: isSameDay(d, today) }));
}
export function buildYearGrid(cursor: Date): Date[] {
  return Array.from({ length: 12 }, (_, i) => so(startOfYear(cursor))); // 12× startOfMonth
}
```

**Step 4: Tester, doit passer** — `npx vitest run src/components/EventCalendar/useCalendarData.test.ts`.

**Step 5: Commit**
```bash
git add src/components/EventCalendar/useCalendarData.ts src/components/EventCalendar/useCalendarData.test.ts
git commit -m "feat(calendar): pures fns de grille (mois/semaine/année) date-fns (Phase 2)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 2.2 — Composant `EventCalendar` (vues + pastilles)

**Files:**
- Create: `src/components/EventCalendar/index.tsx`

**Step 1: Écrire le composant** — segmented control maison (Liste|Journée|Semaine|Mois|Année) + rendu de la grille ; chaque jour affiche les événements du `useEvents()` filtrés par `getEventStart(e) === date`. Pastilles : couleur = `EVENT_STATUS_COLORS[status]`, aujourd'hui = bordure `--accent-primary`, multi-événements = `color-mix(in srgb, var(--data-planified) 12%, transparent)`.

**Règles strictes :**
- Zéro `#hex` / Tailwind color-scale pour les données ; uniquement `var(--data-*)`, `var(--accent-primary)`, `var(--card)`, `var(--surface)`, `var(--border)`.
- Grille `aspect-ratio` par cellule, `min-height` 96px (mois), `overflow` contrôlé (max 3 + « +N »).
- Clic cellule → `onSelectDate(date)` (callback parent, ouvre la vue journée/timeline).
- A11y : `role="grid"`, `aria-label` sur chaque cellule, focus clavier (`tabindex`), pas de dépendance à shadcn.

**Step 2: tsc** — `npx tsc --noEmit` → PASS.

**Step 3: Commit**
```bash
git add src/components/EventCalendar/index.tsx
git commit -m "feat(calendar): composant EventCalendar maison (jour/semaine/mois/année) (Phase 2)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 2.3 — Intégrer le calendrier dans `/events` (segmented Liste|Calendrier|Timeline)

**Files:**
- Modify: `src/pages/Events.tsx` (segmented control + branchage calendrier/timeline)
- Modify: `src/components/BottomNav.tsx` si le tab events est actif (ne pas ajouter de tab)

**Step 1: Ajouter le segmented control** en tête de `/events` : `Liste` (défaut, `sortedEvents` existant) | `Calendrier` (`<EventCalendar>`) | `Timeline` (`<EventTimeline>`). `useEvents()` + `STATUS_COLORS` (importés depuis `lib/event-status`) alimentent les 3 vues.

**Step 2: tsc** → PASS.

**Step 3: Commit**
```bash
git add src/pages/Events.tsx src/components/BottomNav.tsx
git commit -m "feat(calendar): /events en segmented Liste|Calendrier|Timeline (Phase 2)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

**STOP après Phase 2 — rapport + confirmation.**

---

## Phase 3 — Timeline chronologique (passés + à venir)

### Task 3.1 — `EventTimeline` + split passé/avenir

**Files:**
- Create: `src/components/EventCalendar/EventTimeline.tsx`
- Modify: `src/components/EventCalendar/index.tsx` (export)

**Step 1: Test qui échoue** (fonction pure de split) :
```ts
import { splitEventsByToday } from "./EventTimeline";
test("sépare passé / à venir / aujourd'hui", () => {
  const ev = (d: string) => ({ start_date: d } as any);
  const { past, today, upcoming } = splitEventsByToday(
    [ev("2020-01-01"), ev("2026-10-03"), ev("2030-01-01")], "2026-10-03");
  expect(past).toHaveLength(1); expect(today).toHaveLength(1); expect(upcoming).toHaveLength(1);
});
```

**Step 2: Lancer, doit échouer.**

**Step 3: Implémenter** — `splitEventsByToday(events, todayISO)` + rendu vertical : 3 sections (À venir / Aujourd'hui / Passés), chaque item = card `bg-card rounded-xl` + pastille statut + date + titre, clic → `/event/:id`. Tokens uniquement.

**Step 4: Tester, doit passer.**

**Step 5: Commit**
```bash
git add src/components/EventCalendar/EventTimeline.tsx src/components/EventCalendar/index.tsx
git commit -m "feat(calendar): timeline chronologique passée/à-venir (Phase 3)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Phase 4 — Tâches / sous-tâches + « groupe doit » par événement

### Task 4.1 — UI de tâches dans `EventDetail` (onglet Tâches)

**Files:**
- Modify: `src/pages/EventDetail.tsx` (nouveau tab « Tâches », pattern tabs existant l.442-437)
- Create: `src/components/EventTasks.tsx` (liste + create form grammaire ionique)

**Step 1: Form de création de tâche** — grammaire canonique : `IonItem lines="none" bg-card rounded-xl` + `IonLabel position="floating"` + `IonInput` (titre, échéance `type="date"`), `IonSelect` (groupe « doit » via `useGroups()`), checkbox `is_sub` + `parent_task_id` pour les sous-tâches. Boutons via `addEventTaskPS`.

**Step 2: tsc** → PASS.

**Step 3: Commit**
```bash
git add src/pages/EventDetail.tsx src/components/EventTasks.tsx
git commit -m "feat(calendar): onglet tâches + sous-tâches + groupe doit (Phase 4)" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Task 4.2 — Avancement + état `DONE/BLOCKED`

- Actions inline (`In progress` / `Terminé` / `Bloqué`) via `updateEventTaskPS`. Progression `DONE/total` affichée en pastille. tsc-gated. Commit.

---

## Phase 5 — Vérification

- `npx tsc --noEmit` global → 0 erreur.
- `npx vitest run src/components/EventCalendar/ src/lib/event-status.test.ts` → PASS.
- Dev server : `/events` → Calendrier (4 vues) + Timeline + tâches d'un événement ; vérifier `start_date`/`startDate` sur 2 orgs.
- Vérifier que le mode mono-org + les autres tabs BottomNav ne régressent pas.
- `graphify update .` puis commit du graphe.

---

## Résumé des livrables Phase par Phase

| Phase | Livrable | STOP |
|---|---|---|
| 0 | Audit + rapport de risques (fait) | ✅ demandé |
| 1 | `event_tasks` (migration+PowerSync+hook), helpers dates/statut | après Task 1.3 |
| 2 | `EventCalendar` maison + intégration `/events` | après Task 2.3 |
| 3 | `EventTimeline` (passé/avenir) | après Task 3.1 |
| 4 | Tâches/sous-tâches + groupe doit (UI) | après Task 4.2 |
| 5 | Vérif globale (tsc+vitest+dev) + graphify | rapport final |
