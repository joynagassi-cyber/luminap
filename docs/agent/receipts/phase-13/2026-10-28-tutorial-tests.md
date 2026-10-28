# Receipt — Phase 13 : tests du tutoriel (non-vacuité)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-13-tutorial-tests`
- **Base** : `main` (`08c2342`)
- **Statut** : terminé (PR ouverte, non mergée)

## Objectif

Verrouiller la page `/tutoriel` (`src/pages/Tutorial.tsx`, 1638 lignes) pour
qu'une régression de contenu ou de navigation fasse échouer la CI, sans
modifier la page elle-même.

## Livrables

| Fichier | Rôle |
|---|---|
| `src/pages/__tests__/Tutorial.test.tsx` | 13 tests (structure + rendu) |
| `docs/agent/receipts/phase-13/2026-10-28-tutorial-tests.md` | ce receipt |

Aucune modification de `src/pages/Tutorial.tsx` ni de `docs/agent/PROGRESS.md`
(réservés au coordinateur).

## Ce que le test verrouille

### 1. Statique — structure du tableau `SECTIONS`

`SECTIONS` n'est **pas exporté** par la page. Le test lit la source
(`readFileSync`), isole le littéral `const SECTIONS: SectionData[] = [ … ];`
(délimité par le marqueur `// ─── SVG Diagrams`), remplace les identifiants
d'icônes lucide (`icon: BookOpen` → `icon: "BookOpen"`) puis évalue le littéral
via `new Function`. On teste ainsi **chaque** section, y compris celles jamais
affichées par défaut.

Invariants vérifiés pour chaque section :

- `id` **unique**, non vide, sans espace de bord ;
- `title` non vide ;
- ≥ 1 `paragraph` non vide (et aucun paragraphe vide) ;
- chaque `tip` / `warning` déclaré non vide ;
- chaque `faq` a `q` **et** `a` non vides ; chaque `error` a `title` **et**
  `solution` non vides.

### 2. Rendu — `MemoryRouter` + mock Ionic partagé

`@ionic/react` remplacé par `@/test/ionic-mock` (même contrat que
`a11y-screens.test.tsx`), `recharts` neutralisé (ResizeObserver absent de
jsdom), `BottomNav`/`TopHeader` stubbés, `Element.prototype.scrollIntoView`
polyfillé. Vérifie :

- un **unique** `<h1>` = « Tutoriel » et l'état `data-screen-state="ready"`
  → **jamais d'écran vide** ;
- le titre de la section active (par défaut « Vue d'ensemble ») ;
- un onglet `role="tab"` par section, libellés = titres, `aria-selected` correct ;
- changement de section **via onglet** (clic FAQ → titre + contenu FAQ montés) ;
- changement de section **via pagination** (Suivant/Précédent) ;
- « Précédent » désactivé sur la première section ;
- les paragraphes de la section active sont réellement montés.

## Preuve de non-vacuité

Seuils **mesurés** sur `main` au 2026-10-28 (valeurs codées en dur comme
constantes de garde) :

| Grandeur | Mesure réelle | Seuil de garde |
|---|---|---|
| Sections | 19 | `MIN_SECTIONS = 19` |
| Paragraphes | 76 | `MIN_PARAGRAPHS = 76` |
| Conseils (`tips`) | 69 | `MIN_TIPS = 69` |
| Précautions (`warnings`) | 12 | `MIN_WARNINGS = 12` |

**Protocole appliqué (test modifié temporairement → échec → restauré)** :

1. Suppression d'**un seul** paragraphe de la section `overview`
   (« L'application fonctionne entièrement hors ligne… »).
2. `vitest run src/pages/__tests__/Tutorial.test.tsx` →
   **1 échec** : `expected 75 to be greater than or equal to 76` (test
   « le seuil de non-vacuité est atteint »).
3. Restauration de la source (`git diff` sur `Tutorial.tsx` = vide), re-run →
   **13/13 verts**.

Le total tombe donc sous le seuil dès qu'un paragraphe (ou un conseil, ou une
section) disparaît : la non-vacuité est prouvée, pas seulement affirmée.

## Gates (codes de sortie)

| Gate | Commande | Résultat |
|---|---|---|
| Typecheck | `npx tsc -b` | **0** |
| Lint | `npx eslint src/` | **0** erreur (1643 warnings pré-existants ; le nouveau fichier : 0) |
| Test ciblé | `npx vitest run src/pages/__tests__/Tutorial.test.tsx` | **13/13** (exit 0) |
| Suite complète | `npx vitest run` | **1479 passés / 6 ignorés** (exit 0) |

## Prérequis d'environnement (rappel)

`.env.local` (gitignoré) est indispensable : sans lui, ~104 tests échouent
(`VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY` manquantes dans `src/lib/auth.ts`).
Il faut aussi `VITE_POWERSYNC_URL` (sinon `connector-schema-filter.test.ts`
échoue sur le constructeur `SupabaseConnector`). Valeurs prises depuis le
projet Supabase `hhgovvrnalibhgpakswi` et l'instance PowerSync
`6a9dd96302481fb31b945823.powersync.journeyapps.com` (déjà publiques dans
`cypress.config.ts` / `powersync/service.yaml`).

## Bug relevé dans `Tutorial.tsx` (NON corrigé — hors périmètre)

**`aria-labelledby` orphelin sur le `role="tabpanel"`** (ligne 1407) :

```tsx
<div id={`panel-${current.id}`} role="tabpanel"
     aria-labelledby={`tab-${current.id}`}>   // ← référence un id inexistant
```

Aucun élément ne porte `id="tab-<sectionId>"` : les onglets (`role="tab"`,
ligne ~1374) ne définissent **pas** d'`id`. Le `aria-labelledby` pointe donc
vers le vide → le lecteur d'écran n'obtient aucun nom accessible pour le
panneau (WCAG 4.1.2 / pattern ARIA tabpanel). Correctif suggéré (à faire par le
propriétaire, hors de ce chantier de test) : ajouter `id={`tab-${s.id}`}` sur
chaque bouton d'onglet. Le test de rendu n'échoue pas sur ce point (il vérifie
le titre `<h2>` du panneau, présent) — c'est une amélioration a11y, pas un
écran vide.

## Non-couvert (honnêteté)

- Le **visuel** (styles, diagrammes SVG, graphiques recharts) n'est pas vérifié :
  recharts est neutralisé, jsdom n'exécute pas le layout.
- La navigation clavier (flèches ←/→, écouteurs `window`) et le **swipe tactile**
  ne sont pas testés ici (événements `TouchEvent` peu fiables en jsdom) ;
  la pagination et les onglets — les chemins déterministes — le sont.
