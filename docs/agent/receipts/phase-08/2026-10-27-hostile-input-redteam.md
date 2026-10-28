# Receipt — Phase 8 (Isolation & sécurité) : entrées hostiles + intrusion inter-org

- **Date** : 2026-10-27
- **Branche** : `agent/phase-08-hostile-input`
- **Périmètre** : défense en profondeur des entrées hostiles (XSS, caractères
  de contrôle, injection de formule CSV) et tests d'intrusion inter-organisation
  côté client. Complète le receipt `2026-10-26-isolation.md` (R103/R104/CSV) en
  élargissant la couverture hostile (T3 XSS, T4 inter-org) sans toucher aux
  migrations ni à la RLS.

## Défaut 1 — XSS : sinks HTML bruts (T3)

**Mesure avant** (`grep -rn dangerouslySetInnerHTML src/` + `innerHTML`) :

| Sink | Fichier | Risque |
|---|---|---|
| `el.innerHTML = '<div…>'` | `src/lib/bootWatchdog.ts:61` | balisage construit en chaîne ; tout texte interpolé demain devient un XSS |
| `dangerouslySetInnerHTML={{ __html: … }}` | `src/components/ui/chart.tsx` | CSS injecté dans un `<style>` construit en chaîne (`id`, `color`) → évasion `</style>` |

**Correctif** :
- `bootWatchdog.ts` — **plus aucun `innerHTML`** : l'overlay est construit en
  nœuds DOM (`createElement` + `textContent` + `append`). Un texte hostile ne
  peut jamais y être interprété comme du balisage.
- `chart.tsx` — les valeurs `id`/`color` interpolées dans le `<style>` passent
  par `sanitizeCssValue()` (retrait de `<>{};"'\\` + caractères de contrôle +
  plafond de longueur).
- Nouveau helper `src/lib/sanitize.ts` : `escapeHtml`, `sanitizeCssValue`,
  `normalizeText`.

## Défaut 2 — caractères de contrôle / longueur (T3)

Un message d'erreur (issu du serveur, d'un `Error.message`, ou d'une saisie)
peut contenir des caractères de contrôle : ESC (`\u001B`, séquences ANSI
falsifiant les logs), NUL, BEL, DEL, C1. Ils corrompent l'affichage, les logs
et les fichiers exportés.

**Correctif** : `normalizeText` (suppression des C0/C1 dangereux, TAB/CR/LF →
espace, `trim`, plafond 2000). Câblé dans le rapport de diagnostic
(`health.ts`, `buildDiagnosticReport`) : les messages d'erreur hostiles sont
neutralisés avant d'être copiés/partagés.

## Défaut 3 — injection de formule CSV : trous résiduels (T1)

`escapeCsvCell` neutralisait déjà `= + - @` et TAB/CR/LF **en tête** ; il
restait un trou : un préfixe de contrôle **avant** la formule
(`"\u000B=1+1"` — VT ignoré par certains tableurs) passait sans apostrophe.

**Correctif** (`src/lib/csv.ts`) : `startsWithRiskyPrefix` retire les
caractères de contrôle de tête (`\u0000-\u001F`) avant de tester le préfixe.
En complément : `formSystem.ts` échappe désormais la **ligne d'en-tête** de
l'export des soumissions et normalise les valeurs texte à la frontière
(`mapFormFields`).

## Défaut 4 — intrusion inter-organisation côté client (T4)

**Mesure avant** : `useGroupMemberships()` et `getGroupMembershipsPS()` (lecture
des appartenances de groupe) sélectionnaient `group_memberships` **sans filtre
`org_id`** → un membre de l'org A lisait, depuis le cache PowerSync local, les
appartenances de l'org B. C'est une fuite inter-org **côté client** (la RLS
serveur reste l'autorité, mais la défense en profondeur manquait).

**Correctif** (`src/lib/dataLayer.ts`) : requêtes bornées à
`WHERE org_id = ?` (`getOrganizationId()`), lecture **et** écriture (l'INSERT
pose `org_id` explicitement).

**Tests d'intrusion** (`src/lib/__tests__/org-isolation-intrusion.test.ts`,
15 cas) : exécutés contre un **vrai moteur SQL** (`node:sqlite`, embarqué dans
Node) — pas de mock du filtrage. Les seuls mocks sont les frontières de
plateforme (pas de PowerSync WASM ni de React context en unitaire) ; le SQL réel
de `dataLayer.ts` est exercé tel quel. Couvre : `useEvents`, `useMembers`,
`useCaisses`, `useGroups`, `useTransactions`, `useGroupMemberships`,
`getGroupMembershipsPS`, chemins formulaires (`listFormDefinitionsPS`,
`listFormSubmissionsPS`), changement d'org (pas de fuite résiduelle), absence
d'org, et la garde de contexte `canAccessOrganization` (org non liée refusée).

## Tests (rouge → vert)

| Fichier | Cas | Objet |
|---|---|---|
| `src/lib/__tests__/sanitize.test.ts` **(nouveau)** | 15 | `escapeHtml`, `sanitizeCssValue`, `normalizeText` |
| `src/components/__tests__/chart-css-sink.test.tsx` **(nouveau)** | 3 | le CSS hostile ne s'échappe pas du `<style>` |
| `src/lib/__tests__/org-isolation-intrusion.test.ts` **(nouveau)** | 15 | fuite inter-org (lecture/écriture, garde de contexte) |
| `src/lib/__tests__/csv-escape.test.ts` **(étendu)** | +2 (7→9) | préfixe de contrôle avant formule |
| `src/lib/__tests__/health.test.ts` **(étendu)** | +2 (15→17) | caractères de contrôle + plafond dans le diagnostic |
| `src/lib/__tests__/formSystem-export.test.ts` **(étendu)** | +2 | en-tête CSV échappé |
| `src/lib/__tests__/formSystem-dispatch.test.ts` **(étendu)** | +3 | normalisation à la frontière |

**Rouge prouvé** (correctif retiré → échecs observés, puis restauré) :
- revert `chart.tsx` + `csv.ts` → **3 échecs** (`chart-css-sink` + `csv-escape`) ;
- revert `formSystem.ts` → **3 échecs** (`formSystem-export` +
  `formSystem-dispatch` ; ex. `expect(headerLine).toBe("'+Nom")` reçoit
  `"+Nom"`) ;
- revert `dataLayer.ts` (filtre `org_id`) → **2 échecs** :
  `useGroupMemberships` et `getGroupMembershipsPS` remontent
  `[ 'gm-a', 'gm-b' ]` au lieu de `[ 'gm-a' ]`.

## Gates (codes de sortie mesurés)

| Gate | Commande | Sortie |
|---|---|---|
| Typecheck | `./node_modules/.bin/tsc -b` | **0** |
| Unitaires | `./node_modules/.bin/vitest run` | **0** — **1387/1387** (103 fichiers) |
| Lint | `./node_modules/.bin/eslint .` | **0** erreur |
| Build | `./node_modules/.bin/vite build` | **OK** |

## Reste assumé / honnêteté (R12)

- **[Non testable ici]** : la **RLS PostgreSQL** et les **filtres de
  synchronisation PowerSync** (`powersync/sync-config.yaml`) restent l'autorité
  finale d'isolation. Ils ne s'exécutent pas en local (pas de Postgres ni de
  connecteur) ; les tests Cypress `rls-*.cy.ts` correspondants ne tournent pas
  dans cet environnement. Les tests d'intrusion couvrent donc la **partie
  cliente** (filtrage, garde de contexte, refus si org non autorisée), en
  profondeur, pas la frontière serveur.
- **[Hors périmètre — non corrigé]** : `src/capabilities/federation/index.ts`
  (`canAccess`) interroge `grants` filtré par **sujet** mais **sans `org_id`**,
  contrairement à `dataLayer.listGrantsForUserPS` (qui, lui, borne par
  `org_id`). Ce module est hors du périmètre autorisé (`src/lib|hooks|utils|
  components`) : le trou est **documenté**, pas corrigé ici. Recommandation :
  ajouter `AND org_id = ?` au `grantsSql` de `canAccess` / `listEffectiveGrants`.
- **[Résiduel]** : `listFormDefinitionsPS` / `listFormSubmissionsPS` ne lisent
  pas `getOrganizationId()` en interne — le cloisonnement dépend de l'appelant
  (`filters.orgId`, cf. `FormBuilder.tsx`) et de `sync-config.yaml`. Un test fige
  ce comportement pour rendre toute régression visible.
- **[Escalade]** : R104 (`auth_leaked_password_protection`) exige un plan Pro —
  non activable dans cet environnement (cf. receipt `2026-10-26-isolation.md`).
