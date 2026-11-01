# Phase 0 — Baseline d'audit (mesurée, reproductible)

Branche : `audit/pre-prod`. Base : `main`.
Date : 2026-11-01. Viewport de mesure : **390×844**, thème sombre.

## 1. Méthode et reproductibilité

Tout ce document est produit par un harnais exécutable, pas à l'œil :

- Harnais Playwright : `e2e-audit/seed.mjs` (session hors-ligne), `e2e-audit/demoSeed.mjs`
  (portage de `cypress/support/visualSeed.ts` — organisation, caisses, membres,
  transactions, événements, budgets, campagnes, formulaires, notifications, audit),
  `e2e-audit/routes.mjs` (63 routes), `e2e-audit/run-audit.mjs` (parcours + mesures).
- Lancement : `node e2e-audit/run-audit.mjs` (serveur `vite` sur `:8080`).
- Sorties : `audit/phase0.json` (rôle `PASTEUR_PRINCIPAL`), `audit/phase0-admin.json`
  (rôle `ADMIN`), `audit/baseline*/*.txt` (texte DOM par route), `*.png` (captures,
  non versionnées — lourdes).
- Détecteurs automatiques par route : fuites techniques (`default-org`, `demo-`,
  `E2E`, `PENDING`, `PUBLISHED`, `MONTHLY`, `undefined`, `NaN`, `[object Object]`,
  `bucket «`, `PowerSync`), enums bruts (`[A-Z]{3,}_[A-Z_]+`), libellés anglais
  (`Back`, `Offline`, `Features & navigation`), formats de date non localisés
  (`mm/dd/yyyy`, ISO `T…`), format 12 h (`AM/PM`), nombre d'en-têtes, et
  **F-30** (distance en px entre le bas de l'en-tête et le premier contenu).

Le serveur Vite, le seed et le harnais fonctionnent hors-ligne (Supabase et
PowerSync sont neutralisés ; la réplique locale est alimentée via `window.__psDb`).

## 2. Ce qui a pu être mesuré — et ce qui ne l'a pas été

**Mesuré** : rendu réel de chaque écran (texte DOM), fuites techniques, enums,
formats, nombre d'en-têtes, et géométrie (position du premier contenu).

**NON mesuré (limites d'environnement — voir §7)** : rendu visuel (couleurs,
contraste, chevauchement graphique, alignement). Je n'ai **aucun outil de vision**
et pas de bibliothèque d'image (PIL/numpy absents) : je peux **enregistrer** une
capture mais **pas l'ouvrir**. Toute affirmation « vérifié visuellement » serait
donc fausse de ma part. Les défauts purement visuels listés par l'audit (contraste,
pastilles, ombres, chevauchements) restent **à confirmer par un œil humain**.

## 3. Table route → F-30 et anomalies

`gap` = bas de l'en-tête → haut du premier contenu. `n/a` = pas d'en-tête mesurable.
Les valeurs **négatives** signifient « premier contenu au-dessus du bas de
l'en-tête » (mise en page qui **remonte** le contenu sous l'en-tête fixe — le
premier contenu n'est pas à la distance attendue).

| Route | Gap header→contenu (px) | En-têtes | Fuites / anomalies |
|---|---|---|---|
| `/welcome` | n/a | 0 | — |
| `/splash` | n/a | 1 | TECH_LEAK:default-org |
| `/auth` | n/a | 0 | — |
| `/onboarding` | n/a | 0 | — |
| `/sessions` | -100 | 1 | TECH_LEAK:default-org |
| `/org-setup` | n/a | 0 | — |
| `/dashboard` | -100 | 1 | TECH_LEAK:default-org |
| `/notifications` | -100 | 1 | TECH_LEAK:default-org |
| `/search` | -100 | 1 | TECH_LEAK:default-org |
| `/history` | -100 | 1 | TECH_LEAK:default-org |
| `/help` | -100 | 1 | TECH_LEAK:default-org, TECH_LEAK:PowerSync |
| `/tutoriel` | -100 | 1 | TECH_LEAK:default-org |
| `/finance` | -100 | 1 | TECH_LEAK:default-org |
| `/balance` | -100 | 1 | TECH_LEAK:default-org |
| `/cotisations` | -100 | 1 | TECH_LEAK:default-org |
| `/versement` | -100 | 1 | TECH_LEAK:default-org |
| `/membres-en-avance` | -100 | 1 | TECH_LEAK:default-org |
| `/budgets` | -100 | 1 | TECH_LEAK:default-org |
| `/giving` | -110 | 1 | TECH_LEAK:default-org |
| `/reports` | -100 | 1 | TECH_LEAK:default-org |
| `/report-builder` | -110 | 1 | TECH_LEAK:default-org |
| `/admin` | n/a | 0 | — |
| `/admin/federation` | n/a | 0 | — |
| `/admin/federation/tree` | n/a | 0 | — |
| `/admin/roles` | -110 | 1 | TECH_LEAK:default-org |
| `/admin/reports` | -44 | **2** | TECH_LEAK:default-org, DOUBLE_HEADER |
| `/admin/units` | -100 | 1 | TECH_LEAK:default-org |
| `/admin/transfer-ownership` | -110 | 1 | TECH_LEAK:default-org |
| `/admin/report-send` | n/a | 0 | — |
| `/groups` | -100 | 1 | TECH_LEAK:default-org |
| `/members` | -100 | 1 | TECH_LEAK:default-org |
| `/events` | n/a | 0 | — |
| `/forms` | -100 | 1 | TECH_LEAK:default-org, TECH_LEAK:PUBLISHED |
| `/custom-fields` | -126 | 1 | TECH_LEAK:default-org |
| `/archives` | n/a | 0 | — |
| `/trace` | -100 | 1 | TECH_LEAK:default-org |
| `/invitation/emit` | -44 | 1 | — |
| `/invitation/manage` | -44 | 1 | — |
| `/invitation/claim` | -100 | 1 | TECH_LEAK:default-org, TECH_LEAK:PENDING |
| `/settings` | -100 | 1 | TECH_LEAK:default-org, ENGLISH:Features & navigation |
| `/settings/about` | -100 | 1 | TECH_LEAK:default-org, TECH_LEAK:PowerSync |
| `/settings/features` | -110 | 1 | TECH_LEAK:default-org, ENGLISH:Features & navigation |
| `/settings/gestion` | -100 | 1 | TECH_LEAK:default-org |
| `/settings/health` | -110 | 1 | TECH_LEAK:default-org, TECH_LEAK:PowerSync, AMPM |
| `/settings/notifications` | -100 | 1 | TECH_LEAK:default-org |
| `/settings/personnalisation` | n/a | 0 | — |
| `/settings/profil` | -100 | 1 | TECH_LEAK:default-org |
| `/settings/theme` | -110 | 1 | TECH_LEAK:default-org |
| `/budgets/demo-budget-2026` | -100 | 1 | TECH_LEAK:default-org |
| `/culte/demo-event-culte` | -44 | 1 | — |
| `/event/demo-event-retraite` | -44 | 1 | BAD_DATE:ISO |
| `/event/demo-event-retraite/edit` | -110 | 1 | TECH_LEAK:default-org |
| `/form/fill/demo-form-visite` | -100 | 1 | TECH_LEAK:default-org |
| `/forms/demo-form-visite/submissions` | 0 | 1 | BAD_DATE:mm/dd/yyyy |
| `/giving/campaigns/demo-campaign-construction` | -100 | 1 | TECH_LEAK:default-org, TECH_LEAK:MONTHLY |
| `/groups/demo-group-jeunesse` | 0 | 1 | — |
| `/groups/demo-group-jeunesse/cotisation` | 0 | 1 | — |
| `/groups/demo-group-jeunesse/transaction/new` | -110 | 1 | TECH_LEAK:default-org |
| `/membre/demo-mem-1` | -44 | **2** | TECH_LEAK:default-org, DOUBLE_HEADER |
| `/saisie-rapide/demo-group-jeunesse` | 0 | 1 | — |
| `/transaction/demo-tx-1` | n/a | 0 | — |
| `/transaction/demo-tx-1/edit` | n/a | 1 | (voir F-04 : écran d'erreur) |
| `/admin/reports/demo-report-mensuel` | n/a | 0 | — |

## 4. Défauts confirmés par la mesure (et non par l'œil)

| Réf | Constat mesuré | Preuve (fichier) | Gravité |
|---|---|---|---|
| **F-01** | `default-org` rendu dans le **bandeau d'organisation de l'en-tête** sur ~45 routes | `audit/baseline*/dashboard.txt` l.7 ; cause : `organization-context.ts:95` (`label: orgId`) et `TopHeader.tsx:160` (`ctx.label`) | **P0** |
| **F-01** | `PowerSync` (technique) affiché en clair sur `/help`, `/settings/about`, `/settings/health` | `settings_about.txt`, `settings_health.txt` | P1 |
| **F-01** | `bucket « logos »` dans le DOM de `/settings/personnalisation` (texte d'aide) | `SettingsPersonalisation.tsx:131` | P1 |
| **F-02** | Enums bruts : `PASTEUR_PRINCIPAL` (dashboard/splash), `PUBLISHED` (`/forms`), `MONTHLY` (détail campagne), `PENDING` (`/invitation/claim`) | `forms.txt` l.14, `giving_campaigns_*.txt` l.28 | P1 |
| **F-02** | Cause du rôle : `getRoleLabel()` (`utils.ts:175`) est une carte **dupliquée et incomplète** (n'a pas `PASTEUR_PRINCIPAL`) → renvoie l'enum. La carte canonique `ROLE_LABELS` (`rbac.ts:295`) est complète. | — | P1 |
| **F-04** | `/transaction/:id/edit` (transaction APPROVED) affiche **« Impossible d'afficher cette page »** (error boundary). Route accessible, navigation directe/refresh → crash. | `audit/baseline*/transaction_demo_tx_1_edit.txt` | **P0** |
| **F-03** | `/groups/:id` affiche **« Groupe introuvable »** alors que la ligne existe en base (org `default-org`) | `groups_demo_group_jeunesse.txt` ; `groups` table = 2 lignes | **P0** |
| **F-03** | `/saisie-rapide/:id` affiche **« Culte introuvable »** | `saisie_rapide_*.txt` | **P0** |
| **F-22** | **Double en-tête** (`ion-header` ×2) sur `/admin/reports` et `/membre/:id` | `phase0-admin.json` (`DOUBLE_HEADER:2`) | P1 |
| **F-11** | Libellé anglais **« Offline »** au Splash | `src/pages/Splash.tsx:127` | P1 |
| **F-08** | `/settings/about` n'affiche **aucune version** applicative (ni inconnue) | `settings_about.txt` | P1 |
| **F-30** | Le premier contenu **remonte sous l'en-tête** (gap négatif) au lieu de se poser dessous ; **pas de layout de page unique** (37 pages avec `IonHeader` distinct sur 65) | table §3 | P1 |
| **F-26** | `1 membre(s)` (parenthèses) sur la cotisation de groupe | `groups_demo_group_jeunesse_cotisation.txt` | P2 |
| **F-10** | Un formulaire publié **sans champ** affiche « 0 champs » mais propose « Remplir » | `forms.txt` | P2 |
| **F-07** | Historique : montants **sans devise** (`9500000` au lieu de `9 500 000 XOF`) | `history.txt` l.42-45 | P2 |
| **F-06** | Notifications : « 2 non lus » (pluriel) ; « il y a environ 5 heures » | `notifications.txt` | P2 |
| **F-05** | Aucune indication dans l'UI qu'une transaction APPROVED est non modifiable ; l'accès direct à `/edit` casse (cf. F-04) | — | P1 |

## 5. Défauts NON confirmés (mesure contradictoire ou non concluante)

- **F-09 (rôles / invitation)** : les écrans `/admin/roles`, `/invitation/emit`,
  `/invitation/manage` ont renvoyé **« Accès refusé »** même avec le rôle ADMIN
  seedé (le gating dépend d'un *grant* serveur `org_admins` que le seed local ne
  fournit pas). Je **n'ai pas pu** observer ces écrans ni confirmer/infirmer F-09.
- **F-40, F-41, F-42, F-43, F-50, F-51, F-52, F-53, F-54** : aucun de ces numéros
  n'est décrit dans les addenda reçus ; sans énoncé, ils restent **non évaluables**.
- Défauts **purement visuels** (contraste, pastilles, ombres, chevauchement,
  alignement) : **non vérifiables par moi** (pas de vision). À traiter par
  l'agent/œil humain.

## 6. Classification F-30 (par route)

- **Gap négatif** (−44 à −126) : ~40 routes. Le premier contenu **remonte sous
  l'en-tête** au lieu de se poser dessous. La distance n'est ni 0 ni 16 : elle est
  incohérente **d'un écran à l'autre** (F-30 : « identique entre écrans du même
  type » n'est pas satisfait).
- **Gap 0** : quelques écrans (`/groups/:id`, `/groups/:id/cotisation`,
  `/forms/.../submissions`, `/saisie-rapide/:id`) — ceux dont le premier contenu
  est un « Retour » ou un titre sans bandeau.
- **`n/a`** : pages plein cadre (`/welcome`, `/auth`, `/splash`, `/onboarding`) ou
  pages d'erreur (`/transaction/:id/edit`) — à exclure de la cible ≤ 16 px.

**Cause (dans le DOM/styles, sans deviner)** : il n'existe **aucun composant de
page partagé**. Chaque page réimplémente son `IonHeader`/`IonContent`/padding.
Selon que la page utilise un bandeau d'organisation (`TopHeader`, ~100 px) ou un
en-tête local (`IonTitle` seul, ~44 px), le décalage du contenu diffère. La
correction F-30 doit donc se faire dans **un layout de page unique** (Lane 0),
pas écran par écran.

## 7. Limites honnêtes de cette phase

1. **Pas de vision.** Je ne peux pas ouvrir les captures. Aucune correction ne
   pourra être « prouvée visuellement » par moi ; je fournirai des preuves
   **DOM/mesures** (texte, bounding boxes, contrastes calculés) et laisserai la
   relecture visuelle à un humain ou à un agent doté de vision.
2. **Pas de sous-agents.** Je ne peux pas lancer 6 agents simultanés. Je
   exécuterai les lanes **séquentiellement**, une branche par lane, et le dirai.
3. **Pas de « navigation réelle » pour 5 écrans à grant serveur** (rôles,
   invitation emit/manage, units) : le seed local ne satisfait pas le gating
   `org_admins`. Il faut soit un seed avec grant, soit un déploiement (interdit ici).
4. **Fixtures fournies manquantes** : `docs/tutoriel/donnees-reelles.yaml` et la
   maquette `dashboard-MF` sont **absentes** → Phase 10 et annexe B **bloquées**
   (voir `audit/requests.md`).
5. Les mesures de gap sont **sensibles** au sélecteur « premier contenu » ; la
   valeur absolue px est indicative, l'**incohérence entre écrans** est le fait
   robuste.
