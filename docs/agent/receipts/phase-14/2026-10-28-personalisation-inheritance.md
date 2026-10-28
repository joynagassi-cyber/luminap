# Receipt — Phase 14 (Personnalisation profil/organisation : persistance, isolation, héritage mère→annexe)

- **Date** : 2026-10-28
- **Branche** : `agent/phase-14-personalisation`
- **Base** : `main` (`08c2342`)
- **Périmètre** : TESTS uniquement. Aucun code applicatif modifié.
- **Livrable** : `src/pages/__tests__/SettingsPersonalisation-inheritance.test.tsx`
  (**nouveau**, 10 tests) — complète `SettingsPersonalisation.test.tsx`
  (déjà centré sur « nom d'org persisté en base »).

## Audit préalable (R1)

Chemins de personnalisation examinés (lecture seule) :

| Élément | Rôle | Fichier |
|---|---|---|
| Nom d'org + logo | écrit en base (`renameOrganizationPS`) + cache `lumina-config` | `src/pages/SettingsPersonalisation.tsx` |
| Thème (couleur de marque) | `lumina-theme` (localStorage, clé **globale**) | `src/ionic/themes.ts`, `ThemePicker.tsx` |
| Mode clair/sombre | `lumina-theme-mode` | `src/store/useThemeModeStore.ts` |
| Config locale | `useAppConfig` (lit/écrit `lumina-config`) | `src/lib/dataLayer.ts` |
| Arbre mère→annexe | `parent_org_id`, `org_family`, `org_descendants` | `src/capabilities/federation/index.ts`, `src/lib/orgTree.ts`, migrations `20261003000003` / `20261022000008` |
| Purge inter-comptes | `ensureLocalDataOwnedBy` (PM18) | `src/lib/dataLayer.ts` |

## Ce que les tests verrouillent

### 1. Persistance (chemins réels, pas de mock du composant)

- **Thème** : cliquer une pastille du **vrai** `ThemePicker` écrit `lumina-theme`
  (`"trust"`) — `applyTheme` → `persistThemeId`.
- **Nom d'organisation** : « Sauvegarder » exécute le **vrai** SQL
  `UPDATE organizations SET name = ? …` (via `getPowerSyncDatabase().execute`)
  **puis** met à jour `lumina-config`. `dataLayer` n'est PAS mocké ; seules les
  frontières de plateforme le sont (PowerSync WASM, cache, store local, auth,
  Ionic shadow-DOM, upload).

### 2. Restauration au remontage

- **Thème** : après remontage, la pastille enregistrée est `aria-pressed="true"`
  (relecture de `lumina-theme`).
- **Config** : `useAppConfig` relit `lumina-config` au montage (chemin réel).
- **CARACTÉRISATION (R3)** : le champ « nom d'organisation » de la page **ne se
  restaure PAS** — voir Défaut 1.

### 3. Isolation entre utilisateurs / organisations — **NON isolé** (défaut documenté, NON corrigé)

La clé de personnalisation n'est **pas scopée** par organisation ni par
utilisateur. Deux cas de caractérisation :

- `lumina-theme` : `persistThemeId` écrit la clé **globale** ; un autre contexte
  d'org relit la même valeur. La clé ne contient aucun segment org/user.
- `lumina-config` : l'org A écrit sa config, l'org B relit **la même valeur**
  (le hook `useAppConfig` ne prend pas d'`orgId` ; la clé est un singleton
  navigateur).

> Atténuation existante (à ne pas confondre) : `ensureLocalDataOwnedBy`
> (PM18) purge les clés `lumina-*` au changement de **compte** sur l'appareil.
> Elle **ne scope pas** la clé : **même compte, autre organisation ⇒ même
> préférence partagée**. Le défaut d'isolation inter-org demeure.

### 4. Héritage mère→annexe — **NON implémenté** (caractérisation R3)

Recherche effectuée (`parent_org_id`, `org_family`, `org_descendants`,
`federation`, `inherit*`, `effectiveConfig`, `resolveConfig`, `org_settings`) :
**aucun mécanisme d'héritage de personnalisation** n'existe. L'arbre existe
côté données/fédération (rapports, RLS récursive), mais la couche de
personnalisation (`dataLayer.ts` + `ionic/themes.ts`) **ne lit jamais**
`parent_org_id` ni l'arbre.

Trois tests figent le comportement ACTUEL :

1. l'arbre mère→annexe existe bien (`orgTree.computeDescendants`/`computeAncestors`) ;
2. une annexe **sans config locale reste vide** (rien n'est hérité de la mère) ;
3. **preuve par source** : ni `dataLayer.ts` ni `themes.ts` ne référencent
   `parent_org_id` / `org_family` / `org_descendants` (le test échouerait si un
   héritage apparaissait).

## Défauts trouvés (documentés, **NON corrigés** — contrainte de la tâche)

### Défaut 1 — Le nom d'organisation ne se restaure pas au remontage (MOYENNE)

`SettingsPersonalisation` initialise `useState(config.churchName)` au **premier
rendu**, où `config.churchName` est encore `""` (le `useEffect` de `useAppConfig`
lit `lumina-config` **après** le rendu). La valeur n'est jamais resynchronisée
quand le hook charge. Conséquence : au rechargement de la page, le champ affiche
vide alors que le nom est bien enregistré (base + `lumina-config`).

- **Preuve** : `config: useAppConfig relit … = "Nom Enregistré"` (hook) mais
  `champ #org-name = ""` (page). Test de caractérisation correspondant.
- **Limite** : non corrigé (le code applicatif est hors périmètre).

### Défaut 2 — Préférences non scopées par organisation/utilisateur (MOYENNE)

Voir §3. `lumina-theme` et `lumina-config` sont des clés navigateur globales ;
aucune n'est suffixée par org ou utilisateur. Non corrigé.

### Défaut 3 — Héritage mère→annexe absent (INFORMATION)

Voir §4. Non implémenté ; non corrigé.

## Tests (R3 — caractérisation + non-régression)

`src/pages/__tests__/SettingsPersonalisation-inheritance.test.tsx` — **10 tests** :

| Groupe | Cas |
|---|---|
| Persistance | thème (vrai ThemePicker) ; nom d'org (SQL réel + cache) |
| Restauration | thème (aria-pressed) ; config (hook) ; **caractérisation** champ org vide |
| Isolation | **défaut** `lumina-theme` global ; **défaut** `lumina-config` global |
| Héritage | arbre mère→annexe OK ; **défaut** annexe vide ; **preuve** absence de lecture de l'arbre |

Les cas « caractérisation/défaut » documentent le comportement ACTUEL : ils
sont **verts** aujourd'hui et **échoueraient** si un correctif scopait les clés
ou implémentait l'héritage (signal explicite à mettre à jour alors).

## Gates (codes de sortie mesurés)

| Gate | Commande | Sortie |
|---|---|---|
| Typecheck | `npx tsc -b` | **0** |
| Lint | `npx eslint src/` | **0** — 0 erreur (1644 warnings préexistants, hors périmètre) |
| Unitaires | `npx vitest run` | **0** — **1476 passed**, 6 skipped, **0 échec** |

> Note env : `vitest` exige `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
> (+ `VITE_POWERSYNC_URL` pour `connector-schema-filter.test.ts`) ; un
> `.env.local` local a été créé (gitignoré) pour reproduire l'env CI.

## Honnêteté (R12) / limites

- **[Prouvé]** : chemins réels d'écriture (SQL `UPDATE organizations` exécuté,
  `lumina-theme`/`lumina-config` écrits puis relus) ; défauts d'isolation et
  d'héritage mesurés par des tests verts de caractérisation.
- **[Probable]** : la portée « navigateur global » des préférences est un choix
  de conception (local-first mono-appareil) ; l'isolation réelle inter-org
  repose sur la RLS/`org_id` pour les DONNÉES, mais PAS pour ces préférences UI.
- **[Non vérifié]** : comportement multi-onglets / multi-appareils (hors
  périmètre unitaire jsdom).
- Aucun code applicatif modifié ; aucun `docs/agent/PROGRESS.md` touché.
