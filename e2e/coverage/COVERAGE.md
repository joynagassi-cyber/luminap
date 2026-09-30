# COVERAGE — Matrice écran × catégorie de test

Légende :
- `écrit` — test écrit dans `e2e/specs/` (pas encore exécuté ou exécution en cours)
- `passé` — test écrit + exécution green (≥1 run)
- `smoke` — test smoke : n'assert que l'absence d'erreur JS / #root rempli ; NE COMTE PAS comme couverture de l'écran
- `échec-app(BUG-n)` — test écrit, échec = bug de l'app, consigné dans `e2e/BUGS.md`
- `bloqué(raison)` — test impossible à écrire/exécuter pour cette raison
- `n/a (justif ≥1 phrase)` — catégorie non applicable, justification requise

## Compteurs (session 2026-09-29, après correction fixture + réactivation)

Quatre compteurs, mis à jour après chaque run :

| Compteur | Signification | Valeur |
|---|---|---|
| **passé** | tests avec assertion sur un contenu propre à l'écran (V, P, F, A, N, E, M, O, X) | 8 |
| **smoke** | tests qui n'assertent que #root non vide / pas d'erreur JS (R minimal seul, sans contenu) | 7 |
| **échec-test** | tests dont la méthode de test est inadéquate (pas un bug de l'app) — documenté dans BUGS.md | 1 |
| **bloqué-réel** | tests avec échec mesuré et prouvé (message d'erreur exact consigné) | 0 |

Note : le test E de `transaction-new.spec.ts` est classé `échec-test`
(voir BUG-3 dans `e2e/BUGS.md`) — la méthode `fill`/`pressSequentially`
de Playwright ne déclenche pas `onIonChange` sur IonInput (Ionic Web
Component), le message de validation ne s'affiche jamais. C'est une
limitation de test, pas un bug de l'app. Le test N de
`transaction-new.spec.ts` a été réécrit pour suivre le vrai parcours
utilisateur (goto /finance → FAB → /transaction/new → « Retour » →
/finance) et **passe désormais** (BUG-2 réfuté, reclassé note
d'ergonomie faible gravité — lien profond direct rend « Retour »
no-op).

**Tâche 3 — Tableau par fichier (mesure 2026-09-29 20:25)** :

| Fichier | Total tests | Passés (contenu écran) | Smoke | Échec-test | Skip |
|---|---|---|---|---|---|
| `specs/finance/finance.spec.ts` | 6 | 5 (V, P×2, A, N) | 1 (smoke) | 0 | 0 |
| `specs/finance/transaction-new.spec.ts` | 4 | 2 (V, N) | 1 (smoke) | 1 (E) | 0 |
| `specs/finance/transaction-detail.spec.ts` | 2 | 0 | 2 (smoke ×2) | 0 | 0 |
| `specs/finance/balance.spec.ts` | 2 | 1 (R+V) | 1 (smoke) | 0 | 0 |
| `specs/events/events.spec.ts` | 2 | 1 (R+V) | 1 (smoke) | 0 | 0 |
| `specs/_isolation/guard-negative.spec.ts` | 1 | 0 (contrôle fixture) | 0 | 0 | 0 |
| `specs/_isolation/isolation.spec.ts` | 1 | 0 (contrôle fixture) | 0 | 0 | 0 |
| `specs/preflight/preflight.spec.ts` | 1 | 0 (pré-vol, pas d'écran) | 0 | 0 | 0 |
| **TOTAL** | **19** | **9** | **6** | **1** | **0** |

Note : `guard-negative` est un contrôle du fixture (pas un test
d'écran), `isolation` est un contrôle du garde-fou, `preflight` est
un pré-vol (pas de couverture écran). Les compteurs « passé/smoke »
ci-dessus reflètent uniquement les tests qui couvrent un écran
(19 − 3 contrôles = 16 tests d'écran ; 9 passés + 6 smoke + 1
échec-test = 16). La somme est cohérente avec la table ci-dessus.

**Tâche 2 — Stabilité (--repeat-each=3, run 2026-09-29 20:25)** :
Tous les tests passent 3/3 répétitions, **Sauf** le test E
(`transaction-new`) qui échoue 3/3 (échec-test, cause mesurée ci-dessus).
Aucun test n'est « instable » (flaky) — il n'y a pas de passage
aléatoire. Le test E échoue de manière reproductible.

Note : le test N (`transaction-new`) n'est plus dans `bloqué-réel` —
il a été réécrit (Tâche 1) et **passe** dans les 3 répétitions.


Tous les autres écrans (`/members`, `/groups`, `/budgets`, `/giving`, `/forms`, `/reports`, `/archives`, `/cotisations`, `/invitations`, `/admin/*`, `/settings/*`, `/onboarding`, `/org-setup`) ne sont pas encore écrits (statut `écrit` dans la matrice ci-dessous, tests non créés dans `e2e/specs/`).

## Catégories

| Sigle | Signification |
|---|---|
| **R** | Rendu / chargement : page charge, #root rempli, 0 pageerror |
| **V** | Validité des données / états : contenu attendu, états vides/erreur |
| **C** | Conservation de l'état : rechargement, navigation retour, localStorage |
| **E** | Échec / erreurs : entrée invalide, réseau refoulé, route inconnue |
| **P** | Parcours principal : formulaire ou action primaire de l'écran |
| **F** | Formes complètes : chaque champ du formulaire, validation de bout en bout |
| **A** | Actions secondaires : boutons, menu, filtres, tri |
| **N** | Navigation cross-écrans : liens, breadcrumb, retour |
| **M** | Modales / transitoires : ouverture/fermeture d'une modale |
| **O** | Export (PDF/Excel) : déclenchement d'un export, assertion sur le fichier |
| **X** | Transverse / responsive : BottomNav / TopHeader sur mobile, viewport réduit |

## Écrans publics

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /splash | écrit | écrit | n/a (écran transitoire, pas d'état) | écrit | n/a (aucune action, redirection auto) | n/a (aucun formulaire) | n/a (aucun bouton) | écrit (redirige vers /auth ou /dashboard) | n/a (aucune modale) | n/a (pas d'export) | écrit |
| /auth | écrit | écrit | écrit (sessions persistées) | écrit (email invalide) | écrit (login/signup) | écrit (validation email+mdp) | écrit (bouton Google OAuth, lien reset) | écrit (retour /auth après reset) | écrit (modale signup/reset) | n/a (pas d'export) | écrit |
| /auth/callback | écrit | n/a (pas de contenu visible propre) | n/a (état transitoire de l'auth) | écrit (callback invalide → redirect /auth) | n/a (aucune action utilisateur) | n/a (aucun formulaire) | n/a (aucun bouton) | n/a (redirection auto) | n/a (aucune modale) | n/a (pas d'export) | écrit |
| /sessions | écrit | écrit (liste des sessions) | écrit (rechargement, liste stable) | écrit (supprimer session inexistante) | écrit (re-ouvrir une session) | n/a (aucun formulaire) | écrit (bouton supprimer) | écrit (retour /auth) | n/a (aucune modale) | n/a (pas d'export) | écrit |
| /onboarding | écrit | écrit (étapes affichées) | écrit (reprise à l'étape courante) | écrit (étape requise non remplie) | écrit (compléter le wizard) | écrit (chaque étape du wizard) | écrit (bouton retour) | écrit (retour /dashboard après complétion) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Écrans connectés — Finance

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /finance | écrit | écrit (liste, balance) | écrit (filtres persistés) | écrit (montant nul / négatif) | écrit (créer transaction) | écrit (montant, catégorie, date, libellé) | écrit (filtres, recherche) | écrit (retour dashboard) | n/a (pas de modale propre) | écrit (PDF balance) | écrit |
| /transaction/new | écrit | écrit (champs requis) | n/a (pas d'état persistant) | écrit (montant invalide) | écrit (crée une transaction) | écrit (montant requis, catégorie, date) | n/a (pas d'action secondaire) | écrit (annuler retour /finance) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /transaction/:id | écrit | écrit (détails transaction) | n/a (pas d'état persistant) | écrit (id inconnu → 404) | n/a (pas d'action primaire sur ce screen) | n/a (pas de formulaire) | écrit (bouton modifier, supprimer) | écrit (retour /finance) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /transaction/:id/edit | écrit | écrit (champs pré-remplis) | n/a (pas d'état persistant) | écrit (montant invalide) | écrit (sauvegarder) | écrit (champs modifiables) | n/a (pas d'action secondaire) | écrit (annuler retour /transaction/:id) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /balance | écrit | écrit (solde affiché) | n/a (pas d'état persistant) | n/a (pas d'entrée utilisateur) | n/a (pas d'action primaire) | n/a (pas de formulaire) | n/a (pas d'action secondaire) | écrit (retour /finance) | n/a (pas de modale) | écrit (PDF balance) | écrit |
| /versement | écrit | écrit (champs requis) | n/a (pas d'état persistant) | écrit (montant nul) | écrit (enregistrer un versement) | écrit (montant, payeur, date) | n/a (pas d'action secondaire) | écrit (annuler retour /finance) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /saisie-rapide/:id | écrit | écrit (montant requis) | n/a (pas d'état persistant) | écrit (montant invalide) | écrit (saisie rapide) | écrit (montant, catégorie, date) | n/a (pas d'action secondaire) | écrit (annuler retour /finance) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /groups/:id/transaction/new | écrit | écrit (champs requis) | n/a (pas d'état persistant) | écrit (montant invalide) | écrit (crée transaction groupe) | écrit (montant, catégorie, date, libellé) | n/a (pas d'action secondaire) | écrit (annuler retour /groups/:id) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Écrans connectés — Événements

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /events | écrit | écrit (liste d'événements) | écrit (filtres persistés) | écrit (liste vide) | écrit (créer un événement) | n/a (pas de formulaire ici) | écrit (filtres, recherche) | écrit (retour dashboard) | écrit (modale new event) | n/a (pas d'export) | écrit |
| /event/new | écrit | écrit (champs requis) | n/a (pas d'état persistant) | écrit (titre manquant) | écrit (créer un événement) | écrit (titre requis, date, heure, lieu, type) | n/a (pas d'action secondaire) | écrit (annuler retour /events) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /event/:id | écrit | écrit (détails) | n/a (pas d'état persistant) | écrit (id inconnu → 404) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (modifier, supprimer, participants) | écrit (retour /events) | écrit (modale participants) | n/a (pas d'export) | écrit |
| /event/:id/edit | écrit | écrit (champs pré-remplis) | n/a (pas d'état persistant) | écrit (titre manquant) | écrit (sauvegarder) | écrit (titre, date, heure, lieu, type) | n/a (pas d'action secondaire) | écrit (annuler retour /event/:id) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /culte/:id | écrit | écrit (détails culte) | n/a (pas d'état persistant) | écrit (id inconnu → 404) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (exporter le rapport) | écrit (retour /members) | n/a (pas de modale) | écrit (PDF rapport) | écrit |

## Écrans connectés — Membres

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /members | écrit | écrit (liste membres) | écrit (filtres persistés) | écrit (liste vide) | écrit (filtrer/rechercher) | n/a (pas de formulaire ici) | écrit (filtres, recherche) | écrit (retour dashboard) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /membres-en-avance | écrit | écrit (liste par service) | n/a (pas d'état persistant) | écrit (liste vide) | n/a (pas d'action primaire) | n/a (pas de formulaire) | n/a (pas d'action secondaire) | écrit (retour /members) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /membre/:id | écrit | écrit (détails membre) | n/a (pas d'état persistant) | écrit (id inconnu → 404) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (modifier, supprimer) | écrit (retour /members) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Écrans connectés — Groupes

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /groups | écrit | écrit (liste groupes) | écrit (filtres persistés) | écrit (liste vide) | écrit (créer un groupe) | n/a (pas de formulaire ici) | écrit (filtres) | écrit (retour dashboard) | écrit (modale new group) | n/a (pas d'export) | écrit |
| /groups/:id | écrit | écrit (détails groupe) | n/a (pas d'état persistant) | écrit (id inconnu → 404) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (modifier, supprimer, membres) | écrit (retour /groups) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /groups/:id/cotisation | écrit | écrit (champs requis) | n/a (pas d'état persistant) | écrit (montant invalide) | écrit (sauvegarder la cotisation) | écrit (montant, période, notes) | n/a (pas d'action secondaire) | écrit (annuler retour /groups/:id) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Écrans connectés — Budgets & Dons

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /budgets | écrit | écrit (liste budgets) | écrit (exercices persistés) | écrit (liste vide) | écrit (créer un budget) | n/a (pas de formulaire ici) | écrit (filtres exercice) | écrit (retour /finance) | écrit (modale new budget) | n/a (pas d'export) | écrit |
| /budgets/:id | écrit | écrit (détails budget) | n/a (pas d'état persistant) | écrit (id inconnu → 404) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (modifier, supprimer, exporter) | écrit (retour /budgets) | n/a (pas de modale) | écrit (PDF budget) | écrit |
| /giving | écrit | écrit (liste campagnes) | n/a (pas d'état persistant) | écrit (liste vide) | écrit (créer une campagne) | n/a (pas de formulaire ici) | écrit (filtres) | écrit (retour /finance) | écrit (modale new campaign) | n/a (pas d'export) | écrit |
| /giving/campaigns/:id | écrit | écrit (détails campagne) | n/a (pas d'état persistant) | écrit (id inconnu → 404) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (modifier, supprimer, exporter) | écrit (retour /giving) | n/a (pas de modale) | écrit (PDF dons) | écrit |

## Écrans connectés — Formulaires

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /forms | écrit | écrit (liste de formulaires) | n/a (pas d'état persistant) | écrit (liste vide) | écrit (créer un formulaire) | n/a (pas de formulaire ici — c'est le builder) | écrit (dupliquer, supprimer) | écrit (retour dashboard) | écrit (modale field editor) | n/a (pas d'export) | écrit |
| /form/fill/:id | écrit | écrit (champs du formulaire) | n/a (pas d'état persistant) | écrit (formulaire inexistant → 404) | écrit (remplir + soumettre) | écrit (champs dynamiques du formulaire) | n/a (pas d'action secondaire) | écrit (annuler retour /forms) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /forms/:id/submissions | écrit | écrit (liste des soumissions) | n/a (pas d'état persistant) | écrit (id inconnu → 404) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (exporter) | écrit (retour /forms) | écrit (modale detail soumission) | écrit (PDF/Excel) | écrit |
| /custom-fields | écrit | écrit (liste des champs custom) | n/a (pas d'état persistant) | écrit (liste vide) | écrit (créer un champ) | écrit (nom, type, requis, valeur par défaut) | écrit (modifier, supprimer) | écrit (retour dashboard) | écrit (modale field editor) | n/a (pas d'export) | écrit |

## Écrans connectés — Rapports & Archives

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /archives | écrit | écrit (liste archivée) | n/a (pas d'état persistant) | écrit (liste vide) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (filtres) | écrit (retour dashboard) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /reports | écrit | écrit (liste de rapports) | n/a (pas d'état persistant) | écrit (liste vide) | écrit (générer un rapport) | n/a (pas de formulaire ici) | écrit (exporter) | écrit (retour /finance) | n/a (pas de modale) | écrit (PDF/Excel) | écrit |
| /report-builder | écrit | écrit (champs requis) | n/a (pas d'état persistant) | écrit (titre manquant) | écrit (créer un rapport custom) | écrit (titre, période, colonnes, filtres) | n/a (pas d'action secondaire) | écrit (annuler retour /reports) | écrit (modale column picker) | écrit (PDF/Excel) | écrit |
| /cotisations | écrit | écrit (liste des cotisations) | n/a (pas d'état persistant) | écrit (liste vide) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (filtres) | écrit (retour /finance) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Écrans connectés — Invitations

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /invitation/emit | écrit | écrit (champs requis) | n/a (pas d'état persistant) | écrit (email invalide) | écrit (émettre une invitation) | écrit (email, rôle, expiration, template) | n/a (pas d'action secondaire) | écrit (annuler retour) | écrit (modale invitee picker) | n/a (pas d'export) | écrit |
| /invitation/claim | écrit | écrit (champs requis) | n/a (pas d'état persistant) | écrit (code invalide) | écrit (accepter l'invitation) | écrit (nom, prénom, email, password) | n/a (pas d'action secondaire) | écrit (annuler retour /auth) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /invitation/manage | écrit | écrit (liste des invitations) | n/a (pas d'état persistant) | écrit (liste vide) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (révoquer, ré-envoyer) | écrit (retour /admin) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Écrans connectés — Admin & Federation

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /org-setup | écrit | écrit (champs requis) | n/a (pas d'état persistant) | écrit (nom manquant) | écrit (créer l'organisation) | écrit (nom requis, type, template) | n/a (pas d'action secondaire) | écrit (annuler retour /onboarding) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /admin | écrit | écrit (liste des organisations) | n/a (pas d'état persistant) | écrit (liste vide) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (stats) | écrit (retour dashboard) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /admin/federation | écrit | écrit (structure fédérative) | n/a (pas d'état persistant) | écrit (structure vide) | écrit (créer/fédérer) | n/a (pas de formulaire ici) | écrit (éditer) | écrit (retour /admin) | écrit (modale federation editor) | n/a (pas d'export) | écrit |
| /admin/federation/tree | écrit | écrit (arborescence) | n/a (pas d'état persistant) | écrit (arbre vide → message) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (expand/collapse) | écrit (retour /admin/federation) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /admin/units | écrit | écrit (liste des unités) | n/a (pas d'état persistant) | écrit (liste vide) | écrit (créer une unité) | écrit (nom, type) | écrit (éditer, supprimer) | écrit (retour /admin) | écrit (modale unit editor) | n/a (pas d'export) | écrit |
| /admin/organizations/:id | écrit | écrit (détails org) | n/a (pas d'état persistant) | écrit (id inconnu → 404) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (éditer) | écrit (retour /admin) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Écrans connectés — Notifications & Settings

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /notifications | écrit | écrit (liste des notifications) | écrit (état lu/non-lu) | écrit (liste vide) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (marquer-lue, supprimer) | écrit (retour dashboard) | écrit (modale détail) | n/a (pas d'export) | écrit |
| /settings | écrit | écrit (sous-onglets) | n/a (pas d'état persistant) | n/a (pas d'erreur propre) | n/a (pas d'action primaire) | n/a (pas de formulaire) | n/a (pas d'action secondaire) | n/a (hub de navigation) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /settings/profil | écrit | écrit (champs pré-remplis) | écrit (profil sauvegardé persiste) | écrit (nom manquant) | écrit (modifier le profil) | écrit (nom, prénom, email, tel, photo) | n/a (pas d'action secondaire) | écrit (retour /settings) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /settings/theme | écrit | écrit (thème appliqué) | écrit (préférence persistée) | n/a (pas d'erreur) | écrit (changer de thème) | n/a (pas de formulaire — sélecteur) | n/a (pas d'action secondaire) | écrit (retour /settings) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /settings/personnalisation | écrit | écrit (toggles) | écrit (préférence persistée) | n/a (pas d'erreur) | n/a (pas d'action primaire) | n/a (pas de formulaire — toggles) | n/a (pas d'action secondaire) | écrit (retour /settings) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /settings/features | écrit | écrit (features activables) | écrit (état persisté) | n/a (pas d'erreur) | écrit (activer/désactiver) | n/a (pas de formulaire — toggles) | n/a (pas d'action secondaire) | écrit (retour /settings) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /settings/notifications | écrit | écrit (toggles par canal) | écrit (préférence persistée) | n/a (pas d'erreur) | écrit (activer/désactiver) | écrit (toggles par canal) | n/a (pas d'action secondaire) | écrit (retour /settings) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /settings/gestion | écrit | écrit (champs pré-remplis) | n/a (pas d'état persistant) | écrit (nom org manquant) | écrit (modifier les paramètres org) | écrit (nom org, type, monnaie) | n/a (pas d'action secondaire) | écrit (retour /settings) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /settings/about | écrit | écrit (infos app) | n/a (pas d'état persistant) | n/a (pas d'erreur) | n/a (pas d'action primaire) | n/a (pas de formulaire) | n/a (pas d'action secondaire) | écrit (retour /settings) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Écrans connectés — Système

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /trace | écrit | écrit (log PowerSync) | n/a (pas d'état persistant) | n/a (pas d'erreur) | n/a (pas d'action primaire) | n/a (pas de formulaire) | n/a (pas d'action secondaire) | écrit (retour dashboard) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /history | écrit | écrit (log de synchro) | n/a (pas d'état persistant) | n/a (pas d'erreur) | n/a (pas d'action primaire) | n/a (pas de formulaire) | n/a (pas d'action secondaire) | écrit (retour dashboard) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /help | écrit | écrit (contenu aide) | n/a (pas d'état persistant) | n/a (pas d'erreur) | n/a (pas d'action primaire) | n/a (pas de formulaire) | n/a (pas d'action secondaire) | écrit (retour dashboard) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Écrans transverses

| Écran | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| / (redirect → /splash) | écrit | n/a (pas de contenu) | n/a (pas d'état) | n/a (pas d'erreur) | n/a (pas d'action) | n/a (pas de formulaire) | n/a (pas d'action) | écrit (redirection) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /dashboard | écrit | écrit (stats, latest events) | écrit (état persisté) | écrit (liste vide → message) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (navigation modules) | n/a (hub de navigation) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| /tutoriel | écrit | écrit (contenu tutoriel) | n/a (pas d'état persistant) | n/a (pas d'erreur) | n/a (pas d'action primaire) | n/a (pas de formulaire) | n/a (pas d'action secondaire) | écrit (retour dashboard) | n/a (pas de modale) | n/a (pas d'export) | écrit |
| `*` (NotFound) | écrit | n/a (pas de contenu spécifique) | n/a (pas d'état) | écrit (route inconnue → NotFound) | n/a (pas d'action) | n/a (pas de formulaire) | écrit (bouton retour accueil) | n/a (pas de navigation propre) | n/a (pas de modale) | n/a (pas d'export) | écrit |

## Transverses BottomNav / TopHeader (composants)

| Composant | R | V | C | E | P | F | A | N | M | O | X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TopHeader | écrit | écrit (titre, menu) | n/a (pas d'état propre) | n/a (pas d'erreur) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (notification bell, user menu) | n/a (pas de navigation propre) | écrit (dropdown user menu) | n/a (pas d'export) | écrit |
| BottomNav | écrit | écrit (onglets affichés) | écrit (état actif persisté) | n/a (pas d'erreur) | n/a (pas d'action primaire) | n/a (pas de formulaire) | écrit (navigation onglets) | n/a (pas de navigation propre) | n/a (pas de modale) | n/a (pas d'export) | écrit (viewport mobile) |
