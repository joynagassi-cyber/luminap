# Lumina — Plan de Test Exhaustif Atomique (test suite Autonoma)

> **Pour le planificateur Autonoma (`npx @autonoma-ai/planner`)** : ce document
> est l'inventaire de couverture complet. Chaque entrée d'une section est un
> **scénario atomique** : une action utilisateur + une attente observable.
> Génère une spec par section, un test par scénario, et chaque test s'arrête
> à la première attente vérifiée. Pas de test « tout-à-la-fois ».

**Objectif** : couvrir 100 % des pages, flows, composants UI/UX, modales,
cards, états vides/chargement/erreur, et des invariants de qualité/UX.
Le flux **login** utilise le vrai backend Supabase (compte de test dédié).

**Tech stack** : Ionic 9 + React 19 + Vite 8, pnpm 11. Dev : `pnpm dev` →
`http://localhost:8080`. Offline-first PowerSync (Web) — l'app boote sans
réseau grâce aux fallback Supabase commités dans `src/lib/auth.ts`.

---

## 0. Informations de pré-requis (à donner à Autonoma)

| Élément | Valeur |
|---------|--------|
| **Commande de preview** | `pnpm install --frozen-lockfile` puis `pnpm dev` |
| **URL de preview** | `http://localhost:8080` |
| **Route initiale** | `/` → redirect vers `/splash` → `/auth` si non connecté |
| **Port** | 8080 (Vite `server.port`) |
| **Backend** | Supabase réel `hhgovvrnalibhgpakswi.supabase.co` (key anon) |
| **Compte de test** | Email/mot de passe dédiés à créer dans Supabase Auth (pas de compte de prod). Fournir `TEST_EMAIL` / `TEST_PASSWORD`. |
| **Timeouts** | `pageLoadTimeout` 120 s (PowerSync boot lent), `command` 8 s |
| **Viewport** | Mobile 390×844 (app mobile first) — certains tests desktop 1280×800 |
| **Data layer** | PowerSync SQLite Web + Supabase — les données listées (dashboard, transactions) peuvent être vides au 1er chargement offline. Les tests de contenu doivent tolérer l'état vide ou semer les données. |

**Invariants de qualité globaux (vérifiés sur CHAQUE page, section 11)** :
pas d'écran blanc, pas de leak technique (pas de `default-org`, `org_admins`,
`JSON brut`, `via LEGACY`, ni UUIDs nus), états de chargement visibles,
retour arrière fonctionnel, navigation bottom-bar stable.

---

## 1. Flow d'Authentification (`/auth`, `/sessions`, `/auth/callback`)

**Fichiers** : `src/pages/AuthPage.tsx`, `src/pages/Sessions.tsx`, `src/lib/auth.ts`.

- **A1** — Charge `/auth` : affiche le titre, l'onglet Connexion actif par
  défaut, les champs email + mot de passe, le bouton « Se connecter »,
  le lien Google et le lien « S'inscrire ». Pas de bannière « AuthPage ».
- **A2** — Clic sur « Se connecter » avec champs vides → message de
  validation email/mot de passe, pas de requête serveur, pas de crash.
- **A3** — Email mal formaté + mot de passe vide → validation bloquante.
- **A4** — Connexion avec mauvais mot de passe → message d'erreur
  « Identifiants incorrects » (ou équivalent FR), l'app reste sur `/auth`,
  pas de crash, pas de redirect.
- **A5** — Connexion email valide (compte de test) → session créée,
  redirect vers `/onboarding` (creator) ou `/dashboard`, `sync:authenticated`
  émis. Vérifier le toast/pastille de sync.
- **A6** — Clic onglet « S'inscrire » → champs nom + email + mot de passe
  apparaissent, le label du bouton passe à « S'inscrire ».
- **A7** — Inscription d'un email **nouveau** → compte créé (Supabase),
  `signInWithPassword` fallback, session immédiate, redirect vers
  `/onboarding`. Pas de page « email déjà confirmé » bloquante.
- **A8** — Inscription avec un email **existant** → bascule en mode
  connexion avec le message « Adresse déjà enregistrée. » et les champs
  pré-remplis. Pas d'erreur « email exists » brut.
- **A9** — Bouton « Se connecter avec Google » (non natif/web) → ouvre le
  flux OAuth Supabase (nouvel onglet). Sur mobile native ce n'est PAS testé
  ici (test Android séparé). Le bouton ne doit pas crasher le web.
- **A10** — Route `/auth/callback` (redirect OAuth) → traite le code
  (PKCE), crée la session, redirect vers `/dashboard`. Teste avec un
  code simulé/intercepté (mock OAuth) — pas de bouton vide.
- **A11** — Route `/sessions` (Mes comptes) → liste les comptes persistés
  après déconnexion. Un compte est affiché avec son email (pas l'UUID),
  un clic reconnecte en 1 clic sans retaper le mot de passe.
- **A12** — Déconnexion depuis le menu settings → retour à `/auth`,
  compte conservé dans `/sessions`, route protégée `/dashboard` → redirect
  `/auth` (RouteGuard `App.tsx`).
- **A13** — `/` (racine) non connecté → redirect `/splash` → `/auth`.
- **A14** — Accès direct `/dashboard` non connecté → redirect `/auth`
  (RouteGuard), pas d'écran blanc ni d'erreur 404.
- **A15** — Pas de bannière « AuthPage » ni « Onboarding » ni « NotFound »
  affichées (correction `cc750da`) : vérifier l'absence de `IonTitle`
  parasite dans le header des pages d'auth.
- **A16** — Déterminisme : recharger `/auth` à 5 reprises → même rendu,
  aucun « flicker » de login, session stable.

---

## 2. Onboarding & Setup Organisation (`/onboarding`, `/org-setup`)

**Fichiers** : `src/pages/Onboarding.tsx`, `src/pages/OrgSetup.tsx`, `src/pages/InvitationClaim.tsx`.

- **B1** — Charge `/onboarding` : 8 écrans + étape 9 « Comment démarrer ? ».
  Barre de progression, navigation précédent/suivant, pas de bannière.
- **B2** — Choix « Créer une organisation » (creator) → redirect `/org-setup`.
- **B3** — Choix « Rejoindre avec une invitation » (member) →
  `/invitation/claim`.
- **B4** — `/org-setup` : formulaire nom / devise / type / devise,
  validation des champs requis, création d'organisation, redirect
  `/dashboard` admin.
- **B5** — `/org-setup` avec champs vides → validation bloquante,
  pas de création de ligne `organisations` nulle.
- **B6** — `/invitation/claim` : zone « Coller le code d'invitation »
  (pas « JSON brut (débogage) »), le rôle affiché via `getRoleLabel`
  (pas « admin » brut). Rejet d'un code invalide avec message FR.
- **B7** — `/invitation/claim` avec code valide (semé) → acceptation,
  message de succès **sans** « (status: PENDING) », redirect `/dashboard`.
- **B8** — Déterminisme : recharger `/onboarding` → position préservée
  (si state persisté) ou retour écran 1 (si non), comportement cohérent.
- **B9** — Pas de leak « default-org » / « votre organisation » technique :
  le label de contexte affiche « Votre organisation » tant que non résolue
  (correction `cc750da`).

---

## 3. Dashboard & Pages Cœur (`/dashboard`, `/notifications`, `/tutoriel`)

**Fichiers** : `src/pages/Dashboard.tsx`, `Notifications.tsx`, `Tutorial.tsx`.

- **C1** — `/dashboard` connecté : header « Bonjour » + carte solde,
  raccourcis, pastille sync `SyncIndicator`, bottom-bar (4–5 onglets).
  Toleré un état vide (0 transaction) avec un CTA « Ajouter une
  transaction ». Pas d'UUID affiché.
- **C2** — Pastille de sync : état « Synchronisé » / « En cours » /
  « Hors ligne » selon le réseau. Basculer offline (PowerSync
  `offline`) → l'état change, l'app reste utilisable.
- **C3** — Clic raccourci « Transaction » → `/transaction/new`.
- **C4** — `/notifications` : liste des notifications (ou état vide
  illustré `EmptyIllustration`). Filtrage, marquage lu. Pas de crash si 0.
- **C5** — `/tutoriel` : parcours de tutoriel, navigation, bouton
  « Terminer » → retour `/dashboard`. Déterministe à la re-ouverture.
- **C6** — Transitions de pages animées (mode ios, `animated:true`) :
  pas de glitch, contenu bien rendu après animation.
- **C7** — Déterminisme : recharger `/dashboard` 3× → même layout,
  aucun « double-render » de cartes solde.

---

## 4. Finance — Transactions, Solde, Budgets (`/finance`, `/balance`, `/budgets`, `/transaction/*`, `/versement`, `/saisie-rapide`)

**Fichiers** : `src/pages/Finance.tsx`, `Balance.tsx`, `Budgets.tsx`,
`BudgetDetail.tsx`, `TransactionNew.tsx`, `TransactionNewGroup.tsx`,
`TransactionDetail.tsx`, `TransactionEdit.tsx`, `SaisieRapide.tsx`,
`Versement.tsx`, `components/TransactionCard.tsx`.

- **D1** — `/finance` : liste des transactions (`TransactionCard`),
  filtres (type/période), CTA « Nouvelle transaction ». État vide OK.
- **D2** — `/transaction/new` : formulaire montant/libellé/type/date/
  catégorie/comptabilité en double-entry. Validation montant (n>0,
  décimales, devise), soumission → création PowerSync (rejeté si
  hors-ligne → file de sync, pas de crash).
- **D3** — `/transaction/new` avec montant 0/négatif/NaN → bloquant.
- **D4** — `/transaction/:id` (détail) : affichage complet (double-entry),
  boutons modifier/supprimer. ID absent → 404/état non trouvé, pas de crash.
- **D5** — `/transaction/:id/edit` : pré-remplissage, resauve,
  validation des modifications.
- **D6** — `/groups/:id/transaction/new` : transaction groupée —
  sélection du groupe requise.
- **D7** — `/balance` : solde agrégé, par compte/devise. État vide → 0,
  pas de « undefined » affiché.
- **D8** — `/budgets` : liste des budgets, création inline. `/budgets/:id`
  détail avec vs engagé. Budget inconnu → état non trouvé.
- **D9** — `/versement` + `/saisie-rapide/:id` : saisie rapide,
  raccourcis clavier, pré-remplissage.
- **D10** — Card transaction (`TransactionCard`) : montant formaté
  (devise + 2 décimales), icône type, date relative ; hover/press.
  Pas de montant « 0,00 » parasite, pas de leak `org_admins`.
- **D11** — Déterminisme : recharger `/finance` → liste stable, ordre
  stable, aucun « double » de ligne.

---

## 5. Groups & Members (`/groups`, `/groups/:id`, `/culte/:id`, `/members`, `/membre/:id`, `/membres-en-avance`)

**Fichiers** : `src/pages/Groups.tsx`, `GroupDetail.tsx`,
`GroupCotisation.tsx`, `CulteDetail.tsx`, `Members.tsx`, `MembreDetail.tsx`,
`MembresEnAvance.tsx`.

- **E1** — `/groups` : liste des groupes/communautés, CTA création.
  État vide OK.
- **E2** — `/groups/:id` : détail groupe (membres, cotisations,
  transactions). Groupe absent → non trouvé, pas de crash.
- **E3** — `/groups/:id/cotisation` : saisie cotisation du groupe,
  validation montant.
- **E4** — `/members` : liste des membres (cards), recherche/filtre.
  `/membre/:id` détail membre (profil, statut, historique).
- **E5** — `/culte/:id` : détail du culte/événement lié.
- **E6** — `/membres-en-avance` : liste des membres en avance
  (cotisation anticipée). État vide → message clair.
- **E7** — Statuts/roles affichés via libellés FR (pas `admin`/
  `member` bruts, pas `org_admins`) — correction `cc750da`.
- **E8** — Déterminisme : recharger `/members` → liste stable.

---

## 6. Events (`/events`, `/event/:id`, `/event/new`, `/event/:id/edit`)

**Fichiers** : `src/pages/Events.tsx`, `EventNew.tsx`, `EventDetail.tsx`,
`EventEdit.tsx`.

- **F1** — `/events` : liste/évenements (agenda ou cards), CTA « Nouvel
  événement », filtre par période. État vide OK.
- **F2** — `/event/new` : formulaire titre/date/lieu/type, validation
  (date requise, titre non vide), création PowerSync.
- **F3** — `/event/:id` : détail événement, boutons éditer/supprimer.
  ID absent → non trouvé.
- **F4** — `/event/:id/edit` : pré-remplissage, resauve, validation.
- **F5** — Card événement (`DatePicker` si applicable) : date formatée
  FR, pas de `ISO 8601` brut affiché.
- **F6** — Déterminisme : recharger `/events` → ordre agenda stable.

---

## 7. Forms & Reports (`/forms`, `/form/fill/:id`, `/custom-fields`, `/reports`, `/report-builder`, `/archives`, `/cotisations`)

**Fichiers** : `src/pages/FormBuilder.tsx`, `FormFill.tsx`,
`FormSubmissions.tsx`, `CustomFields.tsx`, `Reports.tsx`,
`ReportBuilder.tsx`, `Archives.tsx`, `Cotisations.tsx`.

- **G1** — `/forms` : liste des formulaires (kind FINANCE|FEATURE|AUDIT),
  CTA création, sources features/audit. État vide OK.
- **G2** — `/form/fill/:id` : remplissage du formulaire (FormFill avancé),
  validation par champ, soumission. Formulaire absent → non trouvé.
- **G3** — `/forms/:id/submissions` : liste des soumissions (`FormSubmissions`).
  **Clé des réponses rendue avec `k.replace(/_/g," ")`** (pas `total_amount`
  brut), les objets rendus via `(v)?.label ?? (v)?.name` (pas `JSON.stringify`
  d'un objet entier). Correction `cc750da` — vérifier l'absence de JSON brut.
- **G4** — `/custom-fields` : gestion des champs personnalisés
  (ajout/rename/réorder). Pas de crash si aucun champ.
- **G5** — `/reports` : liste des rapports, filtres. `/report-builder` :
  construction de rapport (sélection source/colonnes/aggrégations).
- **G6** — `/archives` : vues des archives (export CSV). `/cotisations` :
  vue consolidée cotisations. État vide → message clair, pas de crash.
- **G7** — Déterminisme : recharger `/reports` → génération stable,
  pas de « double » de rapport.

---

## 8. Giving, Federation, Cotisations (`/giving`, `/giving/campaigns/:id`, `/admin`, `/admin/federation`, `/admin/federation/tree`, `/admin/units`, `/admin/organizations/:id`)

**Fichiers** : `src/pages/Giving.tsx`, `GivingCampaign.tsx`,
`Federation.tsx`, `FederationTree.tsx`, `CentralAdmin.tsx`, `OrgUnits.tsx`.

- **H1** — `/giving` : vue offrandes/campagnes, cards. `/giving/campaigns/:id`
  détail campagne. Campagne absente → non trouvé.
- **H2** — `/admin` (accès central) : badge « Admin central » (pas
  `CENTRAL_ADMIN` brut), audit log avec `ACTION_LABEL`/`ENTITY_LABEL`
  (pas `action`/`entity_type` bruts). Correction `cc750da`.
- **H3** — `/admin/federation` + `/admin/federation/tree` : arbre de
  fédération, re-parent. **Suppression de la mention de la table
  `org_admins`** et de l'email `admin@mfe-jc.org` — cible de fallback
  « chargement… » (pas un email/tech brut). Correction `cc750da`.
- **H4** — `/admin/units` (`OrgUnits`) : unités organisationnelles,
  `orgName` résolue (pas `<code>{orgId}</code>` brut), « chargement… »
  si non résolue. Correction `cc750da`.
- **H5** — `/admin/organizations/:id` (`OrgDetail` de CentralAdmin) :
  `orgName` via `useOrganizations("central")`, titre `orgName ?? "Organisation"`.
  Pas de `via {centralSource}` badge de debug. Correction `cc750da`.
- **H6** — Droits : un compte non-admin voit `/admin` → accès refusé /
  redirect, pas d'écran admin vide. Vérifier `canAccess`.
- **H7** — Déterminisme : recharger `/admin/federation/tree` → arbre
  stable, pas de cycle infini de rendu.

---

## 9. Invitations (`/invitation/emit`, `/invitation/claim`, `/invitation/manage`)

**Fichiers** : `src/pages/InvitationEmit.tsx`, `InvitationClaim.tsx`,
`InvitationManage.tsx`.

- **I1** — `/invitation/emit` : génération d'un code d'invitation
  (QR + code texte), multi-template (school/enterprise). QR rendu.
- **I2** — `/invitation/claim` : voir B6/B7 (déjà couvert). Ajout :
  copie du code dans le presse-papier → bouton « Copié ».
- **I3** — `/invitation/manage` : liste des invitations émises,
  statuts (PENDING/CLAIMED/REJECTED) **en libellés FR** (pas `PENDING`
  brut), actions annuler/régénérer. Pas de « (status: PENDING) » dans
  les messages de succès. Correction `cc750da`.
- **I4** — Déterminisme : recharger `/invitation/manage` → statuts stables.

---

## 10. Settings & Système (`/settings*`, `/help`, `/history`, `/trace`)

**Fichiers** : `src/pages/Settings.tsx`, `SettingsProfile.tsx`,
`SettingsTheme.tsx`, `SettingsAbout.tsx`, `SettingsFeatures.tsx`,
`SettingsGestion.tsx`, `SettingsNotifications.tsx`,
`SettingsPersonalisation.tsx`, `Help.tsx`, `History.tsx`, `Trace.tsx`.

- **J1** — `/settings` (SettingsShell) : navigation vers les sous-pages
  profil/theme/à-propos/features/gestion/notifications/personnalisation.
- **J2** — `/settings/profil` : édition nom/email, sauvegarde.
- **J3** — `/settings/theme` : `ThemePicker`/`ThemeToggle`, bascule
  clair/sombre, persistance du thème (recharge → thème préservé).
- **J4** — `/settings/about` : version, build, liens. Pas de leak tech.
- **J5** — `/settings/features` : toggles de fonctionnalités,
  état actif, propagation.
- **J6** — `/settings/gestion` : gestion organisation (si admin),
  permissions.
- **J7** — `/settings/notifications` : réglages push (OneSignal),
  opt-in/out.
- **J8** — `/settings/personnalisation` : personnalisation UI,
  aperçu.
- **J9** — `/help` : aide/FAQ, recherche. `/history` : historique
  global. `/trace` : trace d'activité. États vides OK.
- **J10** — Bouton « Déconnexion » (settings) → `/auth`, compte
  conservé dans `/sessions` (voir A11/A12).

---

## 11. Composants Réutilisables (unit atomiques UI/UX)

**Fichiers** : `src/components/*.tsx`.

- **K1** — `Button` : variants (primary/secondary/ghost), états
  disabled/loading (spinner + non-cliquable), hover/press.
- **K2** — `BottomNav` / `BottomDrawer` : navigation bottom-bar stable,
  drawer qui se ferme (drag-to-dismiss), indicateur actif.
- **K3** — `ConfirmModal` : message + boutons Confirmer/Annuler,
  focus-trap, fermeture Échap, pas de « double » de modal.
- **K4** — `DatePicker` : sélection de date, validation plage,
  rendu FR (pas `YYYY-MM-DD` brut).
- **K5** — `SegmentedTabs` : bascule d'onglet, état actif,
  pas de crash si vide.
- **K6** — `StatusBadge` / `SyncIndicator` : états visuels (synchronisé/
  en cours/hors ligne), libellés FR.
- **K7** — `EmptyState` / `EmptyIllustration` : affichage d'un état vide
  avec CTA, pas de page blanche.
- **K8** — `Skeleton` / `Shimmer` / `PageSkeletons` : rendu du chargement,
  pas de flash de contenu final, pas de leak.
- **K9** — `TopHeader` : `Organisation : <nom>` (pas `default-org`),
  « chargement… » si org non résolue. Correction `cc750da`.
- **K10** — `LogoSpinner` / `SplashIllustration` / `LuminaLogo` :
  rendu du logo/splash, pas de distorsion.
- **K11** — `CameraScanner` : scan de QR (permission camera), annulation.
- **K12** — `TransactionCard` : voir D10.
- **K13** — `made-with-dyad` : widget de branding, non bloquant.

---

## 12. Accessibilité & UX (transversal, `a11y`)

**Fichiers** : `src/capabilities/a11y.ts`, `App.tsx` (skip link).

- **L1** — Lien « Aller au contenu principal » (skip link) : focus clavier
  le rend visible (`sr-only focus:not-sr-only`), Tab l'atteint en 1er.
- **L2** — Contraste de texte (ratio), libellés de champ (label htmlFor),
  aria-label sur les boutons icône.
- **L3** — Focus visible sur tous les éléments interactifs (outline).
- **L4** — Parcours clavier complet d'une page (Tab/Shift+Tab/Enter/Échap),
  focus-trap dans les modales (`ConfirmModal`).
- **L5** — `role`/`aria` sur les tableaux, listes de notification,
  menus. Pas de « zone sans libellé ».
- **L6** — Thème clair/sombre : contraste préservé dans les deux modes.

---

## 13. États Globaux, Erreurs & Résilience (determinism/quality)

- **M1** — Toute page 404 inconnue → `NotFound` (pas de bannière
  « NotFound » — correction `cc750da`), CTA retour `/dashboard`.
- **M2** — Erreur réseau (offline) : PowerSync rejette les mutations →
  file de sync, bannière « Hors ligne », reprise auto à la connexion.
- **M3** — Erreur Supabase (5xx simu) : message FR, retry, pas de
  crash de rendu, pas de « JSON brut » affiché.
- **M4** — Erreur de données (champ manquant) : rendu défensif,
  « — » au lieu de `undefined`/`null`, pas de crash.
- **M5** — Déterminisme global : chaque section rechargée 3× → même
  rendu, pas de flicker, pas de double-fetch (React Query cache).
- **M6** — Pas de leak technique sur AUCUNE page : `default-org`,
  `org_admins`, `via LEGACY`, `CENTRAL_ADMIN`, `PENDING`, UUIDs,
  `JSON`, noms de colonnes snake_case — le tout masqué en libellés FR
  (correction `cc750da`). Vérifier globalement.

---

## 14. Performance

- **N1** — Temps de chargement 1re page (`/splash`→`/dashboard`) < 3 s
  (dev), pas de long « blank » (> 500 ms) au 1re rendu.
- **N2** — Lazy loading des routes lourdes (Onboarding, Dashboard,
  Events, Finance, Reports) : chunk chargé à la navigation, pas au boot.
- **N3** — Pas de re-render de masse au changement de thème/network.
- **N4** — Mémoire : navigation aller/retour 20× → pas de fuite de
  session (leak) visible (pas de croissante non bornée).
- **N5** — Images/logos : dimensions respectées, pas de distorsion,
  format web (pas de PNG > 1 Mo au premier rendu).

---

## 15. À exclure de la suite Autonoma (tests Android natifs séparés)

Le planificateur Autonoma testant le **web** (preview `localhost:8080`),
les items suivants **ne font pas partie** de sa suite — ils sont couverts
séparément par le mode debug Android (`pnpm debug` + logcat + téléphone) :

- Flux **Google OAuth natif** (deep-link `lumina://auth/callback` sans
  navigateur) — exige le téléphone + redirect URL Supabase config.
- **Notification push** OneSignal (token natif).
- **Scan caméra** natif (`CameraScanner` en app, pas en web preview).
- **Installation** / compatibilité minSdk 21 / targetSdk 34.

Ces items sont volontairement hors périmètre web d'Autonoma.

---

## 16. Données de test & Semeurs

Pour que les tests de contenu (liste non vide) soient reproductibles,
semer **une fois** (via un seed ou manuellement en Supabase/PowerSync) :

- 1 organisation + 1 admin (compte de test `TEST_EMAIL`/`TEST_PASSWORD`).
- 3 transactions (1 income, 1 expense, 1 transfer), 2 budgets, 1 événement,
  1 membre, 1 groupe, 1 formulaire (kind FINANCE), 1 invitation PENDING,
  1 rapport.
- Ce seed doit être **idempotent** (ré-exécutable) pour que chaque
  exécution Autonoma parte d'un état déterministe (M5).

---

## 17. Commandes exactes pour l'exécution

```bash
# 1. Préparer l'environnement
cd C:/Users/joyda/dyad-apps/lumina
pnpm install --frozen-lockfile

# 2. Lancer le preview (dans un terminal dédié — Autonoma ne le pilote pas)
pnpm dev            # → http://localhost:8080

# 3. Vars d'env Autonoma (PowerShell, dans le terminal du testeur humain)
$env:AUTONOMA_API_URL="https://api.autonoma.app"
$env:AUTONOMA_SHARED_SECRET="<fourni par l'utilisateur — ne pas commiter>"
$env:AUTONOMA_DISTINCT_ID="<fourni>"
$env:AUTONOMA_API_TOKEN="<fourni>"
$env:AUTONOMA_GENERATION_ID="<fourni>"
$env:AUTONOMA_APPLICATION_ID="<fourni>"
npx "@autonoma-ai/planner@latest"
```

> **Sécurité** : les clés Autonoma (`AUTONOMA_API_TOKEN`,
> `AUTONOMA_SHARED_SECRET`) sont des secrets — ne les commuter jamais
> dans le repo. Elles vivent dans le terminal du testeur ou dans les
> secrets GitHub Actions si l'on passe en CI.

---

## 18. Acceptance criteria de la suite Autonoma

La suite est considérée complète et opérationnelle si :

1. Chaque scénario des sections 1–14 a **une spec autonome** (1 action
   + 1 attente), générée par `npx @autonoma-ai/planner`.
2. Les invariants globaux (M6, K9, H3/H4/H5, G3, I3, J badge admin)
   ont **un test dédié** par page concernée (régression du leak technique).
3. Le flux login (A5, A7, A8) passe contre le **vrai Supabase** avec un
   compte de test dédié (pas de mock qui cache un bug réel).
4. Chaque test est **déterministe** : re-exécution 3× → même résultat
   (pas de flake), état de données seedé (section 16).
5. Les tests Android natifs (section 15) sont **explicitement exclus**
   du périmètre web et non marqués « échoués » pour absence.
6. 0 écran blanc, 0 leak technique, 0 crash de rendu sur les 64 routes.
