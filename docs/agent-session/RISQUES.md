# Risques et défauts — Lumina

> Session agent 2026-10-22. Classement par gravité décroissante.
> Chaque entrée indique : gravité, statut, preuve, action.

## Gravité CRITIQUE

### R1 — Relais de notification non authentifié (`onesignal-notify`) — CORRIGÉ
- **Défaut** : `verify_jwt:false` et vérification JWT « au mieux » (échec =
  simple `console.warn`, l'envoi continuait). Un appel anonyme atteignait
  OneSignal avec la clé REST serveur ; un corps sans ciblage diffusait à
  `included_segments:["All"]` → **tous les appareils de toutes les
  organisations**. Un attaquant pouvait spammer/effacer la confiance des
  utilisateurs de tous les tenants.
- **Preuve** : appel anonyme avant correctif → 200 + envoi OneSignal ; après →
  `HTTP 401 {"error":"Non authentifié"}`.
- **Correctif** : JWT obligatoire (401), diffusion non ciblée réservée à un
  admin central (403). Commit `39474da`, fonction déployée (v10).
- **Statut** : corrigé, vérifié par appel HTTP réel.

### R2 — Fuite RLS inter-organisations (`is_org_member`) — CORRIGÉ
- **Défaut** : dans `is_org_member(uid uuid, org_id text)`, l'expression
  `p.org_id = org_id` était ambiguë — PostgreSQL résolvait `org_id` vers la
  **colonne** au lieu du paramètre → `p.org_id = p.org_id` → toujours TRUE.
  127 policies RLS dépendaient de cette fonction.
- **Preuve** : avant, un compte de `org-e2e` lisait 108 profils / 5
  organisations ; après, 1 profil / 1 organisation (`scripts/rls-isolation-check.sh`).
- **Statut** : corrigé (qualification `is_org_member.org_id`), test de
  non-régression pérennisé.

## Gravité HAUTE

### R3 — Streams PowerSync non filtrés par organisation — CORRIGÉ FICHIER, DÉPLOIEMENT CLOUD À CONFIRMER
- **Défaut** : `categories`, `org_units`, `caisses` en `SELECT *` sans filtre
  `org_id` dans `powersync/sync-config.yaml` → chaque client synchronisait les
  données de **toutes** les organisations sur son appareil.
- **Statut** : le fichier local est corrigé ; le déploiement Cloud
  (`powersync deploy sync-config`) reste à confirmer. Tant qu'il n'est pas
  déployé, le défaut persiste en production.
- **Vérification** : voir RUNBOOK.md (procédure de déploiement + contrôle).

### R4 — Notifications ciblées jamais délivrées (`filter` vs `filters`) — CORRIGÉ
- **Défaut** : le payload envoyait `filter` (chaîne) au lieu de `filters`
  (tableau). OneSignal répondait 400 → 502 systématique. Toute notification
  ciblée (trésorier, membre) échouait **silencieusement** côté utilisateur.
- **Preuve** : journal edge `OneSignal API error 400 "You must include which
  players, segments, or tags you wish to send this notification to"` ; après
  correctif, envoi ciblé → 200.
- **Statut** : corrigé (commit `39474da`, v10).

## Gravité MOYENNE

### R5 — Aucune suppression de compte ni export de données (RGPD)
- **Défaut** : aucun parcours de suppression de compte, aucun export des
  données personnelles. Un utilisateur ne peut pas exercer ses droits.
- **Statut** : non corrigé (hors périmètre 45 min). Proposé : PROPOSITIONS.md
  P1. Consigné pour le propriétaire.

### R6 — Pas de limitation de débit sur les endpoints sensibles
- **Défaut** : les edge `signup`, `login` et la connexion Supabase directe
  n'ont aucun rate-limit applicatif. Le brute-force de mot de passe dépend
  uniquement des protections Supabase (présentes mais non paramétrées ici).
- **Statut** : non corrigé. Proposé : PROPOSITIONS.md P2.

### R7 — 13 tables sans index sur `org_id` — CORRIGÉ
- **Défaut** : chaque policy RLS et chaque stream PowerSync filtre par
  `org_id` ; sans index, PostgreSQL faisait un Seq Scan complet par requête.
- **Preuve** : `Seq Scan on transactions Filter: (org_id = ...)` avant ;
  `Index Scan using idx_transactions_org_id` après.
- **Statut** : corrigé (migration `20261022000002`, rollback fourni).

## Gravité FAIBLE

### R8 — Mot de passe de test en clair dans le dépôt
- **Défaut** : `cypress/support/orgCreds.ts` contient `E2e-Lumina!1` en clair.
- **Analyse** : comptes de test sur un environnement de test ; risque limité
  mais à ne pas confondre avec un secret de production.
- **Statut** : documenté, non modifié (changement de mot de passe invaliderait
  les specs). Proposé : PROPOSITIONS.md P3.

### R9 — Mot de passe de keystore Android codé en dur (`lumina1234`)
- **Défaut** : `scripts/generate-keystore*.{sh,js,py}` codent le mot de passe
  du keystore de signature Android en clair.
- **Analyse** : aucun keystore n'est suivi par git ; les scripts sont des
  générateurs. Si un keystore de release est un jour généré avec ce mot de
  passe, la clé de signature est compromise.
- **Statut** : documenté. Proposé : PROPOSITIONS.md P4.

### R10 — 47 profils orphelins (`org_id = '__no_org__'`)
- **Défaut** : 47 profils portent la sentinelle `__no_org__` (avant onboarding),
  sans FK vers `organizations`.
- **Analyse** : **pas une fuite** — `profiles_select` exige
  `initplan_uid() = id OR is_org_member(uid, org_id)` ; les orphelins ne sont
  pas lisibles entre eux. Artefact d'onboarding (pas de FK volontaire).
- **Statut** : documenté, aucun correctif nécessaire. À surveiller (croissance).

### R11 — Suite Cypress obsolète (sélecteurs pré-Ionic)
- **Défaut** : 108 usages de `cy.contains('button', …)` alors que l'app rend
  `IonButton` (custom element, texte dans le light DOM slotté). Les specs
  échouent massivement alors que **l'app fonctionne** (vérifié manuellement :
  création d'événement de bout en bout OK).
- **Impact** : la CI ne protège plus rien ; les régressions réelles passent
  inaperçues.
- **Statut** : en cours de correction (voir JOURNAL.md).

### R12 — Warning « Multiple GoTrueClient instances » au chargement
- **Défaut** : plusieurs instances `GoTrueClient` partagent la clé de session
  `sb-…-auth-token` → comportement non défini en concurrence.
- **Statut** : documenté. Proposé : PROPOSITIONS.md P5.

### R13 — Fuites d'abonnements PowerSync (« subscription leaked »)
- **Défaut** : de nombreux avertissements `[PowerSync]: A subscription to <table>
  with params null leaked!` au fil de la navigation → abonnements non
  `unsubscribe()` → fuite mémoire progressive sur une session longue.
- **Statut** : documenté. Proposé : PROPOSITIONS.md P6.
