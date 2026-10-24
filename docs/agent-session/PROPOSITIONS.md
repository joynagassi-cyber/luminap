# Propositions — Lumina (session 2026-10-22)

> Aucune de ces propositions n'est implémentée, sauf mention explicite
> (« fait pendant la session »). Elles sont triées par priorité.
> Coût en heures de travail d'un ingénieur familier du dépôt.

## Priorité CRITIQUE (bloquantes pour la fiabilité à 4 mois)

### P1 — Activer les sauvegardes planifiées + PITR Supabase
- **Problème** : `backups=[]`, `pitr_enabled=false` (constaté via l'API
  Management). Une corruption ou une suppression accidentelle est
  **irréversible**. Voir RISQUES R18.
- **Proposition** : activer les sauvegardes quotidiennes et, si le plan le
  permet, le PITR. Tester une restauration réelle au moins une fois.
- **Intérêt** : sans cela, tout le reste du travail de fiabilité est annulé
  par un seul incident.
- **Coût** : 0,5 h (configuration) + 1 h (test de restauration).
- **Risques** : coût d'hébergement selon le plan ; aucune modification de code.
- **Bloquante** : **oui**.

### P2 — Réconcilier les migrations du dépôt avec la base (dérive R17)
- **Problème** : 128 fichiers de migration mais l'historique appliqué diverge
  de la base réelle. Un `supabase db push` sur une base neuve ne reproduit pas
  l'état actuel → impossible de reconstruire l'environnement.
- **Proposition** : produire un dump de schéma de référence, régénérer un jeu
  de migrations « baseline » cohérent, et adopter `supabase db diff` en CI.
- **Intérêt** : reproductibilité, onboarding, restauration.
- **Coût** : 6–10 h. **Risques** : moyen (manipulation de schéma) → à faire
  hors ligne sur une base de test.
- **Bloquante** : oui pour la reprise à froid.

### P3 — Traiter les 59 profils rattachés à `org-1` (R22) et 47 orphelins (R10)
- **Problème** : des comptes (dont des adresses e-mail réelles) restent
  rattachés à une organisation de démonstration.
- **Proposition** : décider avec le propriétaire du devenir de ces comptes
  (rattachement à leur propre organisation, ou anonymisation). Opération en
  masse, réversible, journalisée.
- **Coût** : 1 h + validation propriétaire. **Risques** : élevé (données
  personnelles) → exige l'accord explicite du propriétaire.

## Priorité HAUTE

### P4 — Limitation de débit sur les endpoints sensibles (R6)
- **Problème** : aucun rate-limit sur connexion, invitation, envoi de rapport.
- **Proposition** : rate-limit au niveau Supabase (Edge Function) ou du
  fournisseur (Cloudflare), par IP et par compte.
- **Coût** : 3 h. **Risques** : faible. **Bloquante** : non, mais exposition
  aux abus.

### P5 — Suppression de compte et export de données (RGPD, R5)
- **Problème** : aucune fonction de suppression de compte ni d'export complet.
- **Proposition** : Edge Function `delete-account` (anonymisation + purge) et
  `export-account` (JSON/CSV), avec confirmation par e-mail.
- **Coût** : 6 h. **Risques** : moyen (données financières liées).

### P6 — Rendre `IonSelect`/`IonCheckbox` réactifs (R33)
- **Problème** : `onIonChange` reste la seule option ; un `<IonSelect>` qui
  conditionne l'activation d'un bouton peut bloquer comme l'a fait
  `onIonChange` sur `IonInput` (R32).
- **Proposition** : tester chaque `<IonSelect>` conditionnel ; au besoin,
  écouter `ionChange` **et** `ionInput`, ou déclencher la validation au
  `ionFocus`/`ionBlur`.
- **Coût** : 2 h. **Risques** : faible.

### P7 — Corriger les onglets `nav-bottom` non cliquables (R30)
- **Problème** : des vues Ionic conservent une superposition qui rend les
  onglets non cliquables dans certaines specs.
- **Proposition** : auditer `IonPage`/`IonRouterOutlet` et supprimer les
  couches résiduelles.
- **Coût** : 3 h. **Risques** : moyen (régression de navigation).

### P8 — Aucun test en CI (vitest non exécuté)
- **Problème** : 18 échecs vitest invisibles ; Cypress non exécuté en CI.
- **Proposition** : workflow GitHub Actions : `tsc`, `vitest run`, `build`,
  puis Cypress (headless) sur PR.
- **Coût** : 4 h. **Risques** : faible. **Bloquante** : non, mais garantit la
  non-régression après la session.

## Priorité MOYENNE

### P9 — Onboarding dynamique + tutoriel à jour
- **État** : implémenté pendant la session (exception explicite).
- **Reste** : enrichir avec des cas réels observés à l'usage.

### P10 — Observabilité et alertes (Phase 5)
- **Problème** : pas d'alerte en cas de panne critique ; Sentry présent mais
  configuration à vérifier.
- **Proposition** : brancher Sentry (front) + alertes Supabase (CPU, erreurs
  5xx, échecs d'authentification) vers un canal e-mail/Slack.
- **Coût** : 3 h. **Risques** : faible.

### P11 — Vérifier la résistance à la mise en pause du projet Supabase
- **Problème** : un projet Supabase inactif peut être mis en pause (plan
  gratuit) → l'app cesse de fonctionner silencieusement après quelques
  semaines.
- **Proposition** : mettre en place une sonde de disponibilité externe
  (cron) qui appelle `/rest/v1/` et alerte ; ou passer sur un plan payant.
- **Coût** : 2 h. **Risques** : faible.

### P12 — Divergence de rôle `profiles.role` ↔ `org_memberships.role` (R16)
- **Proposition** : désigner `org_memberships.role` comme source de vérité et
  déprécier `profiles.role` (ou le synchroniser par trigger).
- **Coût** : 4 h. **Risques** : moyen (logique de permissions partout).

### P13 — Mot de passe de test en clair dans le dépôt (R8) et keystore (R9)
- **Proposition** : déplacer les identifiants de test vers des variables
  d'environnement ; retirer le mot de passe du keystore du dépôt.
- **Coût** : 1 h. **Risques** : faible (les valeurs ne sont pas des secrets de
  production, mais restent à hygiéniser).

## Priorité BASSE

### P14 — Couverture Cypress complète par fonctionnalité
- **Problème** : plusieurs fonctionnalités n'ont ni test d'erreur, ni test de
  permissions, ni test responsive.
- **Proposition** : compléter selon la matrice FEATURES.md.
- **Coût** : 15–25 h. **Risques** : faible.

### P15 — Mesurer et suivre le budget de performance
- **Proposition** : Lighthouse CI + budget (LCP, taille de bundle).
- **Coût** : 3 h. **Risques** : faible.

### P16 — Mode sombre / thème et préférences d'accessibilité
- **Proposition** : exposer le thème dans `/settings` (le support existe dans
  les design tokens).
- **Coût** : 4 h. **Risques** : faible.

### P17 — Notifications push (OneSignal) — durcissement
- **Problème** : relais de notification non authentifié (R1, corrigé) ; à
  surveiller après déploiement.
- **Proposition** : vérifier la livraison réelle et le comportement hors ligne.
- **Coût** : 2 h. **Risques** : faible.

## P-BACKFILL-BUDGET — Re-normaliser `events.budget_items` — **EXÉCUTÉ le 2026-10-24**

> **Statut : fait**, et étendu à toutes les colonnes concernées (6 colonnes,
> 218 valeurs) — cf. R65 et migration `20261024000001`. Conservé ici pour
> mémoire du raisonnement. Il reste proposé (P-NEW ci-dessous) d'ajouter une
> **contrainte de forme** en base pour rendre le défaut impossible.

- **Problème** : 158 des 159 lignes portent un jsonb de type *string*
  (double encodage historique). Le code tolère désormais les deux formes,
  mais la donnée reste sale et toute nouvelle lecture naïve casserait.
- **Proposition** : migration de données idempotente et réversible :
  `update events set budget_items = (budget_items #>> '{}')::jsonb
   where jsonb_typeof(budget_items) = 'string';`
  puis `alter table events alter column budget_items set default '[]'::jsonb`.
- **Intérêt** : supprime la cause, pas seulement le symptôme ; rend la
  colonne exploitable par SQL (rapports, agrégats) sans cast défensif.
- **Coût** : 0,5 h (dont script de retour arrière et vérification).
- **Risque** : faible (opération idempotente, réversible par
  `to_jsonb(budget_items::text)`).
- **Bloquante pour la fiabilité** : non (le code tolère), mais **haute**.

---

## Session 2 (2026-10-23)

### P18 — Persister le logo de l'organisation (et des annexes) en base
- **Problème** : `organizations` n'a pas de colonne `logo_url` ; le logo
  reste local au navigateur (R48). Les rapports PDF/Excel et les autres
  membres ne le voient pas.
- **Proposition** : migration `ADD COLUMN logo_url TEXT`, exposition dans les
  3 streams `org_*` de `sync-config.yaml`, déploiement Cloud, puis écriture
  client (bucket `logos` → URL publique).
- **Intérêt** : identité visuelle cohérente sur tous les appareils et dans
  tous les exports — c'est ce que promet déjà l'UI.
- **Coût** : 1 h 30 (dont 20 min de déploiement PowerSync). **Risque** :
  moyen (déploiement Cloud requis ; sans lui, la colonne reste invisible).
- **Priorité** : haute. **Bloquant long terme** : non, mais l'écart
  promesse/UI est visible par l'utilisateur.

### P19 — Écran de personnalisation des annexes (`org_units`)
- **Problème** : la Phase 7 demandait la personnalisation « de
  l'organisation **et de ses annexes** » ; seule l'organisation est couverte
  (R49).
- **Proposition** : formulaire nom/logo/adresse par annexe, écriture
  `org_units`, visible par les membres de l'annexe.
- **Intérêt** : une fédération gère plusieurs sites ; chacun doit porter son
  identité dans les rapports.
- **Coût** : 1 h. **Risque** : faible. **Priorité** : moyenne.

### P20 — Activer les sauvegardes planifiées Supabase + PITR
- **Problème** : `backups: []`, `pitr_enabled: false` (R18). Aucune
  sauvegarde exploitable : une corruption est irréversible. C'est le risque
  n° 1 pour une exploitation de 4 mois sans surveillance.
- **Proposition** : activer les sauvegardes quotidiennes (voire le PITR) dans
  le dashboard Supabase ; consigner la procédure de restauration dans
  RUNBOOK.md (déjà rédigée).
- **Intérêt** : survie aux erreurs humaines et aux pannes.
- **Coût** : 15 min (action propriétaire, pas développeur). **Risque** :
  aucun. **Priorité** : **critique — bloquant pour la fiabilité à 4 mois.**
- **Note** : l'agent ne peut pas l'activer (plan payant, dashboard).

### P21 — Déployer le correctif d'isolation PowerSync (R6)
- **Problème** : les streams `categories`, `org_units`, `caisses` étaient en
  `SELECT *` **sans filtre d'organisation** ; le fichier est corrigé mais
  **non déployé** (pas de `PS_ADMIN_TOKEN` dans cet environnement).
- **Proposition** : exécuter `powersync deploy sync-config` avec un jeton
  administrateur, puis rejouer `cross-tenant.cy.ts`.
- **Intérêt** : isolation réelle des données entre organisations côté
  synchronisation (défense en profondeur, en plus de la RLS).
- **Coût** : 30 min. **Risque** : faible (fichier déjà validé). **Priorité** :
  **critique — bloquant pour la fiabilité à 4 mois.**

### P22 — Alerter sur l'échec de la CI (notification)
- **Problème** : la CI est restée rouge sans que personne ne le voie
  (R45). Le propriétaire n'a pas de canal d'alerte.
- **Proposition** : notification GitHub (e-mail/Slack) sur échec de workflow
  `main`, ou badge de statut en tête de README.
- **Intérêt** : un défaut d'infrastructure devient visible en minutes.
- **Coût** : 15 min. **Risque** : aucun. **Priorité** : haute.

---

## Session 2 — propositions complémentaires

### P23 — Corriger le défaut UX de `/sessions` (état de chargement) — HAUTE
- **Problème** : `Sessions.tsx` confond `null` (chargement) et `[]` (vide) →
  « Aucun compte lié pour l'instant » s'affiche alors que le compte existe
  (R52). Message faux, perte de confiance au moment précis où l'utilisateur
  cherche à se reconnecter.
- **Proposition** : `const loading = orgs === null;` → squelette pendant le
  chargement ; `EmptyState` seulement quand `orgs !== null && list.length === 0`.
- **Intérêt** : supprime un mensonge à l'écran sur le parcours de reconnexion.
- **Coût** : 30 min. **Risque** : très faible (affichage conditionnel).
- **Priorité** : haute. **Bloquant long terme** : non, mais dégrade fortement
  la confiance.

### P24 — Ajouter `logo_url` à `organizations` + streams PowerSync — MOYENNE
- **Problème** : le logo d'organisation n'est pas persisté en base (R48) —
  invisible pour les autres membres, les autres appareils et les rapports PDF.
- **Proposition** : migration `ALTER TABLE organizations ADD COLUMN logo_url
  TEXT` + rollback, ajout de la colonne aux 3 streams `org_*` de
  `sync-config.yaml`, déploiement Cloud, puis écriture client.
- **Coût** : 1 h 30. **Risque** : moyen (déploiement PowerSync Cloud requis).
- **Priorité** : moyenne. **Bloquant** : non.

### P25 — Personnalisation des annexes (`org_units`) — BASSE
- **Problème** : la demande « personnalisation de l'organisation **et de ses
  annexes** » n'est satisfaite que pour l'organisation (R49).
- **Coût** : 1 h. **Priorité** : basse.

### P26 — Réparer le build Android (`@capacitor/storage` → `preferences`) — HAUTE
- **Problème** : l'APK Android ne se construit plus (R55) — namespace manquant
  dans le plugin `@capacitor/storage`, déprécié.
- **Proposition** : migrer vers `@capacitor/preferences` (remplacement
  officiel) ou épingler un plugin déclarant son `namespace`.
- **Intérêt** : rend à nouveau possible la distribution native.
- **Coût** : 1 h. **Risque** : moyen (dépendance native, à tester sur
  appareil). **Priorité** : haute. **Bloquant** : oui pour toute livraison
  Android.

### P27 — Assainir la CI : 3 workflows à réparer — CRITIQUE
- **Problème** : `CI Pipeline` était rouge sur 3 jobs (corrigé cette session),
  mais `cypress.yml` et `android-debug.yml` restent rouges à **chaque push**,
  et le job E2E de `ci.yml` est **illusoire** (R54 : `continue-on-error` +
  suite complète skippée faute de secret). Conclusion : **aucune couche E2E
  n'est réellement vérifiée automatiquement**.
- **Proposition** : (1) provisionner `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD`,
  (2) retirer `continue-on-error`, (3) élargir la liste de specs, (4) fournir
  `CYPRESS_RECORD_KEY` ou exécuter sans `record/parallel`, (5) corriger le
  build Android. Objectif : **une CI verte signifie réellement « tout passe »**.
- **Intérêt** : rétablit le garde-fou automatique — la seule protection
  possible pendant 4 mois sans surveillance.
- **Coût** : 3 h 45 (dont 2 h E2E, 1 h Android, 45 min Cypress Cloud).
- **Risque** : faible (CI uniquement). **Priorité** : critique.
- **Bloquant long terme** : **oui** — sans CI fiable, toute régression future
  passera inaperçue.

## Session 3 (2026-10-23) — propositions

### P28 — Corriger l'ordre des hooks : généraliser le garde-fou — CRITIQUE
- **Problème** : R60 (retour anticipé avant un hook dans `useTransactions`)
  était **silencieux** en revue statique et ne se manifestait qu'à l'exécution,
  sur une seule route. Rien n'empêche un futur hook de réintroduire le même
  motif (cache, `if (!ready) return`, `if (cached) return`).
- **Proposition** : (1) activer `eslint-plugin-react-hooks` en **erreur** dans
  la CI ; (2) ajouter un test unitaire qui monte chaque hook de `dataLayer.ts`
  avec `renderHook` et le re-rend après remplissage du cache (détecte tout
  changement de nombre d'appels) ; (3) règle de revue : aucun `return`
  conditionnel avant le dernier hook d'une fonction.
- **Intérêt** : élimine une classe entière de crashs en ErrorBoundary, les
  plus difficiles à diagnostiquer (message React cryptique).
- **Coût** : 3 h. **Risques** : faible. **Priorité** : critique.
- **Bloquant pour la fiabilité à long terme** : oui.

### P29 — Couverture de l'édition de transaction — HAUTE
- **Problème** : R60 n'a été détecté que tardivement ; `/transaction/:id/edit`
  n'avait **aucun test** avant cette session.
- **Proposition** : spec Cypress dédiée (création → édition → relecture du
  montant/description modifiés **en base**), plus un test du refus d'édition
  d'une transaction `APPROVED` (immunité déjà codée, non testée).
- **Intérêt** : verrouille R60 et l'immunité. **Coût** : 2 h. **Priorité** : haute.

### P30 — Statut de vérification produit dans le rapport — MOYENNE
- **Problème** : les captures d'erreurs (`console.error`) restent dans la
  console du navigateur ; en production personne ne les voit.
- **Proposition** : brancher le `LazyRouteErrorBoundary` et les erreurs de
  synchronisation PowerSync sur le service d'observabilité (Sentry est
  disponible dans l'environnement) avec un identifiant de corrélation.
- **Intérêt** : un échec silencieux chez un utilisateur devient une trace
  exploitable au retour du propriétaire. **Coût** : 4 h. **Priorité** : moyenne.

### P31 — Sauvegardes sans plan Pro (voir aussi P20) — CRITIQUE
- **Problème** : les sauvegardes classiques Supabase exigent un plan Pro.
  L'environnement est en plan **gratuit**.
- **Proposition** : export logique planifié hors Supabase — `pg_dump`
  quotidien (données + schéma) vers un stockage externe, plus l'export
  `supabase db dump` pour les migrations, avec rotation et test de
  restauration mensuel documenté dans `RUNBOOK.md`.
- **Intérêt** : sans sauvegarde, une corruption est définitive.
  **Coût** : 4 h puis 0 h/mois. **Priorité** : critique. **Bloquant** : oui.

### P32 — Titres de page sémantiques (`<h1>`) — BASSE
- **Problème** : R61 — `TopHeader` rend le titre en `<p>`, donc pas de `<h1>`
  sur les pages de premier niveau. **Proposition** : un `<h1>` par page.
  **Coût** : 2 h. **Priorité** : basse (a11y).

### P33 — Conflits de synchronisation PowerSync explicites — HAUTE
- **Problème** : le comportement en cas de conflit d'écriture concurrente
  (deux appareils hors ligne modifiant la même transaction) n'est ni
  documenté ni testé.
- **Proposition** : documenter la stratégie (`uploadData` actuel), tester un
  conflit réel (deux clients, même ligne) et afficher un état « version
  divergente » plutôt qu'un écrasement silencieux.
- **Intérêt** : évite une confusion de données financières. **Coût** : 6 h.
  **Priorité** : haute. **Bloquant** : partiellement (finances).

### P34 — Écran noir à la navigation vers une route paramétrée (R59) — CRITIQUE
- **TRAITÉ (session 4)** : R59 corrigé — cause racine = fallback
  `<Suspense>` rendant un `<IonPage>` dans `ion-router-outlet`
  (`src/ionic/routes/lazy-route.tsx`, commit `93072b4`). Preuve :
  `groups-events.cy.ts` 0/3 → 3/3, 3 passes vertes.
- **Problème** : ouvrir un groupe / événement / membre depuis une liste
  laisse la page entrante à `opacity: 0` (écran noir permanent, PWA sans
  barre d'adresse). C'est le parcours cœur de l'app.
- **Proposition** : (1) instrumenter `ion-router-outlet`
  (`ionNavDidChange`) pour confirmer si l'événement de fin de transition
  est émis ; (2) tester une navigation différée (`requestAnimationFrame`)
  et une navigation via `<IonRouterLink>` ; (3) ajouter un garde-fou :
  si après N ms la page active porte encore `ion-page-invisible`, la
  forcer visible (classe retirée) — correctif de dernier recours,
  idempotent ; (4) test de non-régression qui assert `opacity !== 0` sur
  la page entrante après un clic depuis une liste.
- **Intérêt** : débloque le parcours principal et fait passer
  `groups-events`, `reports-budgets`, `persistence`, `performance-batch`
  et `org-reports` au vert.
- **Coût** : 4 à 6 h (diagnostic Ionic/`ion-router-outlet`).
  **Risques** : moyen (touche au routeur). **Priorité** : **critique**.
- **Bloquant** : oui.


### P35 — Titre de niveau 1 sur les 19 pages restantes — MOYENNE
- **Problème** : R61 (session 4) n'a été corrigé que pour `/groups/:id`.
  **19 pages** n'exposent aucun `<h1>` (mesuré :
  `grep -c '<h1' src/pages/*.tsx` → CentralAdmin, EventEdit, EventNew,
  Federation, FormFill, History, InvitationEmit, MembreDetail,
  MembresEnAvance, OrgReportDetail, OrgReportSend, OrgReportsReceived,
  OrgUnits, Reports, SaisieRapide, Sessions, Trace, TransactionDetail,
  TransactionNewGroup). Un `<h1>` global dans `TopHeader` est **exclu** :
  il créerait un **doublon** sur les 24 pages qui en ont déjà un.
- **Proposition** : `TopHeader` accepte une prop `headingLevel` (défaut
  `"none"` = `<p>` actuel) ; chaque page sans `<h1>` passe `headingLevel=1`.
  Ou, plus simple : un `<h1 className="sr-only">` par page manquante,
  comme fait pour `/groups/:id`.
- **Intérêt** : navigation par titres et lecteurs d'écran conformes sur
  toute l'app. **Coût** : 2 h. **Priorité** : moyenne (a11y).
- **Bloquant** : non.

### P36 — Trancher la source de vérité du rôle (R62) — HAUTE
- **Problème** : deux colonnes portent le rôle
  (`profiles.role` **lu** par l'app, `org_memberships.role` **écrit** par
  `settle_invitation_claim`) et **aucun trigger ne les synchronise**
  (mesuré : le compte E2E avait `MEMBRE` vs `PASTEUR_PRINCIPAL`). Un
  désalignement produit des permissions fausses (masquage d'actions
  légitimes, ou l'inverse).
- **Proposition** : (1) définir `org_memberships.role` comme source de
  vérité (elle porte déjà le multi-org) ; (2) soit faire lire ce rôle par
  `useCurrentUser`/`persistCurrentUser` au lieu de `profiles.role`, soit
  ajouter un trigger de synchronisation `org_memberships` →
  `profiles.role` ; (3) test Cypress de non-régression : un utilisateur
  invité avec `target_role='TREASURIER'` voit bien les actions de
  `TREASURIER` (et pas celles d'un `MEMBRE`).
- **Intérêt** : supprime une classe de bugs de permissions silencieux, sur
  le cœur sécurité/données. **Coût** : 5 h. **Priorité** : haute.
- **Bloquant pour la fiabilité à long terme** : oui (sécurité des rôles).

### P37 — Étendre le scoping « page active » aux specs restants — MOYENNE
- **Problème** : R64 (sélecteurs globaux matchant les pages Ionic masquées)
  a été corrigé dans `groups-events.cy.ts` uniquement. D'autres specs
  utilisent encore `cy.contains('button', …)` / `cy.get('h1')` globaux et
  peuvent échouer pour ce motif, en accusant l'app à tort.
- **Proposition** : factoriser le helper `PAGE` dans
  `cypress/support/view.ts` (qui documente déjà le mécanisme) et l'imposer
  par une règle de revue + un test lint.
- **Intérêt** : des échecs de test qui désignent le bon coupable.
  **Coût** : 2 h. **Priorité** : moyenne.


---

## Session 5 (2026-10-24) — propositions issues de la clôture

### P-NEW-1 — Contrainte de forme sur les colonnes jsonb (priorité : haute)
- **Problème** : rien n'empêche une écriture future de reposer un jsonb de
  type *string*. Le correctif amont est côté client (PowerSync) ; une
  écriture directe par SQL, un import, ou un futur client tiers
  reproduiraient le défaut, et il est **silencieux** (aucune erreur à
  l'écriture, plantage au rendu).
- **Proposition** : ajouter une contrainte `CHECK` sur les colonnes
  concernées, ex. `CHECK (budget_items IS NULL OR jsonb_typeof(budget_items)
  IN ('array','object','null'))` pour `events.budget_items` et
  `form_definitions.fields`, et un `DEFAULT '[]'::jsonb` là où le vide est
  un tableau.
- **Intérêt** : rend le défaut **impossible**, pas seulement corrigé. Une
  écriture fautive échoue immédiatement, à l'endroit de la faute.
- **Coût** : 1 h (contraintes + tests + vérification qu'aucun chemin
  légitime n'écrit un scalaire). **Risque** : moyen — à valider, car
  `custom_field_values.value` accepte légitimement des scalaires et ne doit
  PAS être contraint.
- **Bloquante pour la fiabilité** : oui, à moyen terme.

### P-NEW-2 — Rendre la suite Cypress complète fiable (priorité : haute)
- **Problème** : au dernier run complet (session 3), 20 tests sur 70
  échouaient sur 7 specs, principalement pour des **prémisses de spec
  obsolètes** et des sélecteurs portant sur des pages Ionic masquées (R64).
  Ces échecs sont du bruit qui masque les vrais défauts.
- **Proposition** : traiter les 7 specs rouges une par une (comme fait pour
  `groups-events`), en appliquant le helper `activePage`
  (`div.ion-page:not(.ion-page-hidden)`) partout.
- **Intérêt** : sans suite verte, aucune régression future n'est détectée —
  c'est la condition de la stabilité sur 4 mois.
- **Coût** : 4 h. **Risque** : faible.
- **Bloquante** : oui.

### P-NEW-3 — Purge des tables d'audit et de notifications (priorité : moyenne)
- **Problème** : `audit_entries` et `notifications` croissent sans purge.
  Sur un projet Supabase gratuit (500 Mo), la base pleine provoquerait un
  refus de **toutes** les écritures. Mesure au 2026-10-24 : **20 Mo
  utilisés (4 %)** avec 48 `audit_entries` et 314 `notifications` — le
  risque n'est donc **pas imminent**, mais il est structurel et non
  surveillé : rien n'avertit avant la limite.
- **Proposition** : tâche planifiée (`pg_cron`) purgeant les entrées de plus
  de N mois, avec archivage préalable vers `archives`.
- **Intérêt** : évite l'arrêt total des écritures. **Coût** : 2 h.
  **Risque** : faible si l'archivage précède la purge.
- **Bloquante** : non à court terme (4 % du quota) ; oui à long terme si
  l'app est utilisée intensivement pendant plusieurs années.

### P-NEW-4 — Alerte sur la taille de la base (priorité : haute)
- **Problème** : aucune surveillance de l'espace utilisé. Le propriétaire ne
  saura pas que la base approche du quota avant l'échec.
- **Proposition** : consulter régulièrement `pg_database_size` (requête
  fournie dans RUNBOOK.md) et/ou brancher une alerte Sentry/OneSignal sur
  un seuil (ex. 80 % du quota).
- **Intérêt** : prévenir au lieu de subir. **Coût** : 1 h. **Risque** : faible.
- **Bloquante** : oui pour la fiabilité à long terme.


### P-NEW-5 — Supprimer le code mort `src/adapters/` (priorité : basse)
- **Problème** : les 5 fichiers de `src/adapters/` (`CaisseAdapter`,
  `EventBudgetAdapter`, `OrgUnitAdapter`, `TransactionLegacyAdapter`,
  `VersementLegacyAdapter`) n'ont **aucun importateur** dans `src/`
  (`git grep -rn "EventBudgetAdapter"` → 0 résultat hors définition ;
  aucun `from "@/adapters"`). `EventBudgetAdapter.fromJsonb` contient un
  `JSON.parse` direct sur `budget_items` — exactement le motif qui a produit
  le double encodage. Du code mort qui ré-implémente un parseur dangereux est
  un piège pour le prochain intervenant.
- **Proposition** : supprimer le dossier, ou le marquer explicitement
  `@deprecated` avec la raison. **Vérification préalable** : relancer
  `tsc -b` et `vitest run` (les deux doivent rester verts).
- **Intérêt** : réduit la surface de confusion sur le format `budget_items`.
  **Coût** : 30 min. **Risque** : faible (à confirmer par la suite de tests).
- **Bloquante** : non.


### P-NEW-6 — Séparer « type d'événement » et « destinataire » des notifications (priorité : moyenne)
- **Problème** : `notifications.action_type` reçoit tantôt un type
  d'événement (`EVENT_CREATED`, 311 lignes), tantôt un rôle
  (`TREASURIER`, via `sendNotification`). Aucun code ne route par
  destinataire ; `getNotifIcon` ne reconnaît que 3 valeurs jamais produites
  (cf. R74). Le « ciblage » affiché dans l'UI est donc inexistant.
- **Proposition** :
  1. décider la sémantique de `action_type` (**type d'événement**) et
     l'appliquer partout : remplacer les `targetRole:` de
     `TransactionDetail.tsx` (5), `EventNew.tsx`, `GivingCampaign.tsx`,
     `FormFill.tsx`, `InvitationEmit.tsx`, `InvitationClaim.tsx` par un
     `actionType:` d'événement (`TRANSACTION_APPROVED`, etc.) ;
  2. ajouter un vrai champ de ciblage (`target_role` / `target_user_id`)
     **si** le ciblage par rôle est voulu, et le lire dans `useNotifications` ;
  3. compléter `getNotifIcon` avec les valeurs réellement produites.
- **Intérêt** : notifications compréhensibles d'un coup d'œil (icône
  distincte par type) et ciblage réellement appliqué.
- **Coût** : 2 h (dont une migration si l'on ajoute une colonne).
  **Risque** : faible (colonne texte, sans contrainte ni FK).
- **Bloquante** : non — mais à trancher avant d'ajouter des notifications.
### P32 — Rendre l'environnement de test infalsifiable (priorité : haute)

- **Problème** : un run Cypress a pu porter sur un build obsolète de 9 minutes
  sans qu'aucun signal ne l'annonce (R81). `cypress.config.ts` ne définit pas
  de `webServer` et `baseUrl` retombe par défaut sur un déploiement distant.
  Le risque concret : valider — ou invalider — une version qui n'est pas celle
  qu'on croit, et consigner un faux résultat de test.
- **Proposition** : (1) déclarer un `webServer` explicite (commande `vite`,
  port 8080, `reuseExistingServer: false`) pour que Cypress démarre toujours
  le bon serveur ; (2) faire échouer le démarrage si un serveur préexistant
  répond mais que son horodatage de build est antérieur au dernier commit ;
  (3) journaliser l'URL cible et l'empreinte du bundle dans le rapport Cypress.
- **Intérêt** : c'est la condition pour que tout résultat de test consigné
  soit digne de confiance. Sans cela, chaque affirmation « testé » est
  potentiellement fausse — le pire cas pour un livrable vérifiable.
- **Coût estimé** : 1 h. **Risque** : faible (configuration de test
  uniquement, aucun impact production).
- **Bloquante pour la fiabilité à long terme** : **oui**. À traiter avant la
  prochaine session de validation.

---

## P34 — Typechecker la suite Cypress en CI

- **Problème** : `tsc -b` (CI) ne couvre que `src/` ; `cypress/` n'est jamais
  vérifié statiquement. Mesuré : 13 erreurs de type préexistantes dans
  `cloud-sync.cy.ts`, `nav-bottom.cy.ts`, `sessions.cy.ts` et
  `cypress/support/ionic.ts`.
- **Proposition** : créer `tsconfig.cypress.json` (`include: ["cypress"]`,
  `target` es2020 pour `--downlevelIteration`), le référencer dans
  `tsconfig.json`, corriger les 13 erreurs, et l'exécuter dans le job CI
  existant.
- **Intérêt** : attrape les fautes des specs avant l'exécution ; fiabilise la
  base de preuves de test, qui est le seul mécanisme de validation de ce
  projet.
- **Coût estimé** : 1 h. **Risques** : faibles (aucun impact runtime) ;
  nécessite de traiter 13 erreurs préexistantes.
- **Priorité** : moyenne. **Bloquante pour la fiabilité à long terme** : non,
  mais recommandée — les tests sont la seule preuve disponible.

### P31 — Sauvegardes sans plan Pro — OUTILLÉ (reste à activer)
- **MAJ 2026-10-24** : la proposition est désormais **implémentée** dans le
  dépôt : `.github/workflows/backup.yml` (quotidien 03:00 UTC) +
  `scripts/backup-supabase.sh` (export schéma+données via `supabase db dump`,
  empreintes SHA-256, chiffrement AES256 optionnel, rotation 30 j). L'artefact
  n'est publié que **chiffré** (dépôt public). **Reste à faire par le
  propriétaire** : créer les secrets `SUPABASE_DB_URL` et
  `BACKUP_GPG_PASSPHRASE` (procédure dans RUNBOOK.md §Sauvegardes).
- **Pourquoi pas activé automatiquement** : ni `pg_dump` ni Docker ne sont
  disponibles dans l'environnement d'agent, et aucune credential DB n'y est
  présente. La sauvegarde tourne dès que le secret existe.
- **Priorité** : critique. **Bloquant** : oui (sans export, une corruption est
  définitive).

### P35 — Aligner les versions Capacitor (build Android) — HAUTE
- **Problème** : `android-debug.yml` échoue (« Namespace not specified » sur le
  module généré `capacitor-cordova-android-plugins`), car `@capacitor/cli`
  (^8.5.2) et `@capacitor/android` (^6.2.2) sont sur des majeures différentes.
  R95.
- **Proposition** : aligner `@capacitor/android` et `@capacitor/core` sur la
  majeure de la CLI, régénérer avec `npx cap sync android`, et vérifier
  `./gradlew assembleDebug` en CI. Vérifier aussi `lumina-android.yml`
  (workflow de release).
- **Intérêt** : restaure la distribution APK Android.
- **Coût** : 3–4 h (mise à jour majeure + régression éventuelle des plugins
  natifs : caméra, notifications, stockage). **Risque** : moyen (rupture de
  plugins natifs). **Priorité** : haute. **Bloquant** : non (l'app web/PWA
  fonctionne).
