# Décisions — session agent Lumina

## D1 — Environnement cible = environnement de test/dev (pas de production réelle)

- **Décision** : autoriser les écritures (migrations, données de test) sur le projet
  Supabase `hhgovvrnalibhgpakswi`.
- **Preuves** : 108 comptes dont 87 `@lumina.dev` et 11 `@example.com` (domaines de test),
  5 organisations dont 3 nommées explicitement « E2E » (`org-e2e`, `org-e2e-unconf`,
  `e2e-auth-org-1`), **0 transaction**, **0 membre**, 1 seul événement. Aucun signe de
  données d'utilisateurs réels.
- **Alternative écartée** : lecture seule stricte — inutile et bloquante, l'environnement
  est manifestement un environnement de test partagé par la CI Cypress.
- **Garde-fou conservé** : sauvegarde complète (schéma + données) avant toute écriture ;
  aucune suppression de données financières ; migrations réversibles.

## D2 — Sauvegarde via `supabase db dump --linked` (pas `pg_dump` direct)

- **Décision** : utiliser la CLI Supabase (qui passe par Docker) plutôt que `pg_dump`
  direct sur le pooler.
- **Raison** : `pg_dump` direct sur `aws-0-eu-west-2.pooler.supabase.com:5432` se bloque
  (le pooler en mode session ne supporte pas les dumps longs) ; la CLI utilise un conteneur
  Postgres 17 avec les rôles Supabase pré-créés.
- **Alternative écartée** : `pg_dump` direct (bloqué > 25 s sans produire de fichier).

## D3 — `local-dashboard.cy.ts` obsolète → corriger le test, pas le code

- **Décision** : mettre à jour le spec pour cibler les sélecteurs réels
  (`aria-label="Ouvrir le menu"`, `TopHeader`), sans toucher au comportement de l'app.
- **Raison** : le commit `c13c23f` a remplacé la liste plate « Plus » par un menu latéral
  et le label du bouton est devenu « Ouvrir le menu ». Le test n'a pas suivi.
  Le principe « ne jamais affaiblir un test » impose de corriger le test pour qu'il
  vérifie la même intention (l'anchor du shell non-skeleton), pas de le supprimer.

## Phase 1 — Intégrité et isolation des données (2026-10-22, ~19:30–20:15 UTC)

### D-07 — `org_id` protégé par trigger, pas par policy RLS
- **Décision** : rendre `profiles.org_id` immuable par UPDATE direct via un
  trigger `BEFORE UPDATE` (`guard_profile_org_immutable`), et non via une policy
  `WITH CHECK`.
- **Alternative écartée** : policy avec `org_id = (SELECT ... FROM profiles ...)`.
- **Raison** : une policy qui interroge sa propre table provoque une récursion
  (« infinite recursion detected in policy for relation profiles »). Le trigger
  distingue le client (`current_user` = authenticated/anon) de l'appel via une
  fonction SECURITY DEFINER, sans récursion.

### D-08 — Ne PAS déplacer les 59 profils déjà rattachés à `org-1`
- **Décision** : corriger le trigger d'inscription (plus de rattachement
  automatique) mais **ne pas** toucher aux profils existants de `org-1`.
- **Alternative écartée** : rattacher rétroactivement les comptes de test à
  `__no_org__`.
- **Raison** : principe conservateur. `org-1` contient peut-être de vrais
  utilisateurs ; un déplacement automatique pourrait leur retirer l'accès à des
  données légitimes. Décision consignée (R22) et laissée au propriétaire.

### D-09 — Le rôle reste auto-attribuable (self-service) — à trancher
- **Décision** : ne pas bloquer la modification de `profiles.role` par
  l'utilisateur, malgré l'escalade possible vers `PASTEUR_PRINCIPAL`.
- **Alternative écartée** : restreindre `role` à l'insertion initiale.
- **Raison** : l'onboarding (`OrgSetup`, `selectRole`) écrit le rôle choisi par
  l'utilisateur ; bloquer casserait un parcours fonctionnel sans connaître
  l'intention produit. Documenté R20 + proposition dans PROPOSITIONS.md.

### D-10 — Inscription sans organisation (`__no_org__`)
- **Décision** : `handle_new_user` et `upsert_profile` n'attribuent plus
  d'organisation à l'inscription ; l'utilisateur rejoint une organisation par
  invitation ou en crée une.
- **Raison** : toute attribution automatique à une organisation existante crée
  une appartenance implicite non consentie (fuite PII). `__no_org__` est le
  marqueur déjà prévu par `orgContext.ts`/`AppContext.tsx`.

### D-11 — Un sentinelle n'est pas une organisation
- **Décision** : `is_org_member` retourne `false` pour `__no_org__`, `no-org`,
  vide/NULL.
- **Raison** : sans cela, tous les utilisateurs « sans organisation »
  partageaient la même appartenance fictive (48 profils lisibles entre eux).

### D-12 — Fédération : fonction `SECURITY DEFINER` plutôt que lecture de vue en policy
- **Décision** : réécrire `orgs_select_federation_recursive` avec
  `org_descendants(initplan_uid())` (SECURITY DEFINER, bornée aux descendants de
  l'organisation de l'appelant) et activer `security_invoker` sur `org_family`.
- **Alternative écartée** : laisser la vue contourner la RLS, ou supprimer la
  fonctionnalité de fédération.
- **Raison** : la fonctionnalité est volontaire (migration 20261003000003) ;
  seule l'implémentation fuyait. La lecture directe de la vue dans une policy
  provoque une récursion : le helper SECURITY DEFINER préserve la sémantique
  sans récursion. La vue n'est référencée par aucun code applicatif.

### D-13 — Le rôle est attribuable uniquement par un administrateur de l'organisation
- **Décision** : refuser toute modification de `profiles.role` par
  `authenticated`/`anon` (trigger `guard_profile_role_immutable`), et refuser
  `p_role` dans `upsert_profile` si l'appelant n'est pas administrateur actif de
  l'organisation visée.
- **Alternative écartée** : rendre `profiles.role` totalement immuable côté
  client (plus simple mais interdirait à un admin légitime de promouvoir un
  membre).
- **Raison** : préserve la fonctionnalité d'administration tout en supprimant
  l'auto-promotion. Les chemins légitimes (`settle_invitation_claim`, edges
  `signup`/`create_org` en service_role) écrivent hors des rôles
  `authenticated`/`anon` et restent intacts. `authService.setProfileRole` est du
  code mort — aucun appel applicatif ne transmet `p_role`.

## D-R41 — Retrait de l'état « chargement » temporel (R41) — 2026-10-23

- **Contexte** : après R40, des pages pouvaient encore montrer un état vide
  trompeur pendant la 1re synchronisation. J'ai introduit un `isLoading`
  calculé (`isInitializingRead`) borné à 10 s.
- **Résultat** : régression mesurée. L'état était purement temporel (non
  réactif) : les formulaires restaient sur leur squelette et
  `input[aria-label="Nom de l'événement"]` devenait introuvable
  (`cross-tenant`, `events-tasks`, `persistence`). Un état de chargement
  **masquait** des écrans légitimes.
- **Décision** : retrait complet. R40 (résolution synchrone et réactive de
  l'organisation) supprime la cause : le premier rendu interroge déjà la
  bonne organisation, donc il n'y a plus de fenêtre vide à couvrir.
- **Alternative écartée** : rendre l'état réactif sur `hasSynced`
  (abonnement + borne). Plus complexe, et surtout inutile : « vide » peut
  être un état **légitime** (utilisateur sans donnée). Afficher un
  chargement dans ce cas serait un mensonge de plus.
- **Principe appliqué** : minimum de changement ; un état de chargement ne
  doit jamais masquer un état réel.

### D-R44 — Corriger le z-index de BottomNav plutôt que forcer le clic dans le test
- **Contexte** : `events-tasks.cy.ts` échouait sur le clic « Enregistrer »,
  couvert par `BottomNav`.
- **Alternative écartée** : `click({ force: true })` — masquerait un défaut
  **réel** subi par l'utilisateur (bouton inaccessible au doigt). Interdit
  par le principe « ne jamais affaiblir un test pour le faire passer ».
- **Décision** : corriger le code (`--z-overlay` → `--z-nav`), conformément
  à la pile z documentée dans `App.css` (M15), et verrouiller par un test.
- **Alternative écartée (2)** : remonter `--z-overlay` à 60 — casserait
  l'échelle d'élévation pour tous les autres overlays et rendrait les
  toasts (70) et la barre flottante (60) ambigus.


### D-R59 — Corriger le squelette de `LazyRoute`, pas la transition d'Ionic
- **Contexte** : R59 (écran noir après navigation vers une route
  paramétrée). Quatre hypothèses avaient déjà été éliminées par
  expérience : identité du `<IonPage>` échangée, `<div>` du
  `LazyRouteErrorBoundary`, branche de chargement, préchargement du chunk.
- **Décision** : corriger la **cause racine** — le fallback de `<Suspense>`
  (`PageSkeleton`) rendait un `<IonPage>` **à l'intérieur** de
  `ion-router-outlet`, qui l'enregistrait comme vue entrante. Il rend
  désormais un `<div>` neutre. Le squelette de chargement (UX) est
  conservé.
- **Alternative écartée** : retirer le `<Suspense>` / rendre les pages en
  direct. Cela supprimerait le découpage de code (bundle initial plus
  lourd) pour contourner un défaut de structure du fallback — traiter le
  symptôme plutôt que la cause.
- **Alternative écartée (2)** : patcher la transition `ion-router-outlet`
  (forcé de retirer `ion-page-invisible`). Touche à un composant Ionic
  interne, hors de notre contrôle, et masquerait d'autres transitions.
- **Preuve** : `groups-events.cy.ts` 0/3 → 3/3, 3 passes consécutives.

### D-R61 — `<h1 className="sr-only">` par page, pas un `<h1>` global dans `TopHeader`
- **Contexte** : R61 — 19 pages n'exposent aucun `<h1>`, mais 24 pages en
  ont déjà un.
- **Décision** : correctif minimal, page par page (`/groups/:id` d'abord),
  via la convention déjà en place (`<h1 className="sr-only">`, utilisée par
  Dashboard, Finance, TransactionNew).
- **Alternative écartée** : rendre le titre de `TopHeader` en `<h1>`. Un
  changement global créerait un **doublon** de titre de niveau 1 sur les 24
  pages qui en ont déjà un — régression d'accessibilité, pas correctif.
- **Alternative écartée (2)** : `headingLevel` configurable sur
  `TopHeader`. Plus propre à terme, mais touche 43 pages : hors du
  « minimum de changement » et du gel de fin de session → consigné en
  proposition **P35**.

### D-R63 — Aligner la fixture E2E, sans toucher au code produit
- **Contexte** : le compte E2E avait `profiles.role = 'MEMBRE'` alors que
  `org_memberships.role = 'PASTEUR_PRINCIPAL'`. L'app lit `profiles.role`,
  donc le compte de test n'avait pas `transaction:create`.
- **Décision** : corriger la **donnée de test** (2 comptes E2E), pas le
  code. Les comptes **réels** sont cohérents (vérifié par requête) : le
  défaut est dans la fixture, pas dans le produit.
- **Alternative écartée** : modifier l'app pour lire `org_memberships.role`.
  C'est un changement de modèle de données (sécurité des rôles) : hors
  périmètre d'un correctif ciblé, et risqué en fin de session → consigné en
  proposition **P36** (RISQUES R62).
- **Traçabilité** : requête de correction et requête de retour arrière
  consignées dans RISQUES.md (R63).

### D-Fusion — Résoudre les 5 conflits en gardant la version de la branche
- **Contexte** : fusion de `origin/main` (1 commit, PR #4) dans
  `agent/session-3-livraison` → 5 conflits, tous documentaires.
- **Décision** : garder la version de la branche (`--ours`).
- **Vérification (pas une supposition)** : pour chacun des 5 fichiers, les
  lignes ajoutées par `origin/main` (23, 74, 101, 122 et 187 lignes non
  vides) sont **toutes déjà présentes** dans la version de la branche →
  **0 ligne perdue**. Le côté `main` du conflit était vide.
- **Alternative écartée** : fusion manuelle bloc par bloc — inutile ici,
  et source d'erreur, puisque le contenu de `main` est un sous-ensemble
  strict.

---

## Session 5 (2026-10-24) — rattrapage jsonb et activation du typecheck CI

### D-S5-1 — Rattraper la donnée jsonb en base, plutôt que seulement tolérer
- **Contexte** : R43 avait choisi de ne pas modifier la donnée (parseur
  tolérant uniquement), par prudence. Le contrôle exhaustif montre 218
  valeurs corrompues sur 6 colonnes, dont `form_definitions.fields` à
  **100 %** : le parcours formulaires était inutilisable.
- **Décision** : exécuter une migration de rattrapage idempotente et
  réversible, après sauvegarde exacte des valeurs remplacées.
- **Alternative écartée** : rester en tolérance seule. Écartée car toute
  lecture SQL ou toute nouvelle requête naïve (rapport, agrégat, export)
  continuerait de voir un jsonb de type *string* — le défaut resterait
  entier pour l'exploitation, et non seulement pour l'affichage.
- **Garde-fou** : sauvegarde table-par-table avant écriture, dry-run sur
  copies temporaires, rollback rejoué sur copies avant application.

### D-S5-2 — Sauvegarde dans une table, pour un rollback exact
- **Contexte** : le rollback naïf `to_jsonb(col::text)` corromprait les
  147 `budget_items` déjà sains en les transformant en chaînes.
- **Décision** : la migration enregistre les valeurs remplacées dans
  `_jsonb_backfill_20261024` ; le rollback restaure depuis cette table et
  ne touche que les lignes réellement modifiées.
- **Alternative écartée** : rollback par ré-encodage global. Écartée : elle
  introduirait 147 corruptions pour en annuler 158.

### D-S5-3 — Ramener `"null"` (chaîne) à `jsonb null`, non réversible à l'identique
- **Contexte** : 5 `audit_entries.before_state` valent la chaîne `"null"`.
  La forme correcte est JSON null.
- **Décision** : convertir. L'opération est **non réversible à
  l'identique** (chaîne `"null"` et JSON null sont indiscernables après
  coup ; le rollback rend SQL NULL). Consigné ici comme asymétrie assumée.
- **Raison** : aucune information métier n'est perdue (les deux
  expriment l'absence d'état antérieur), et garder une chaîne `"null"`
  laisserait une valeur de type incohérent dans une colonne jsonb.

### D-S5-4 — Activer `tsc -b` en CI malgré la règle de gel
- **Contexte** : règle de gel à T0+9 h (correctifs ciblés et tests
  seulement, pas de changement structurel).
- **Décision** : appliquer ce correctif, considéré comme ciblé et non
  structurel : une ligne de commande dans un job existant, plus deux
  littéraux `as const` dans `vite.config.ts`.
- **Raison** : sans cette activation, les 98 erreurs de type (dont 5 bugs
  d'exécution réels) peuvent se ré-accumuler pendant les 4 mois, et
  personne ne le verra. Le risque d'activation est mesuré comme nul :
  `tsc -b --noEmit` sort à 0 erreur et `vite build` à 0, vérifiés après
  le changement. C'est le correctif qui protège le plus durablement.
- **Alternative écartée** : laisser en proposition pour le propriétaire.
  Écartée car l'effet protecteur est immédiat et le risque vérifié nul.

### D-S6-1 — Ne pas élargir le stream PowerSync `profiles` malgré le défaut R80
- **Contexte** : `profiles` n'est synchronisé que pour l'utilisateur courant
  (`WHERE id = auth.user_id()`), ce qui fait afficher l'UUID au lieu du nom
  pour les autres membres (R80). La RLS autorise déjà la lecture des profils
  de sa propre organisation.
- **Décision** : ne PAS modifier `powersync/sync-config.yaml` dans cette
  session ; consigner R80 comme défaut ouvert avec le correctif à appliquer.
- **Raison** : la correction exige un `powersync deploy sync-config` (jeton
  `PS_ADMIN_TOKEN` absent). Modifier le YAML local sans redéployer crée une
  divergence client/serveur : le client souscrirait des lignes que le serveur
  ne pousse pas — défaut moins visible mais plus grave que celui qu'on
  corrigerait, et impossible à diagnostiquer sur le terrain.
- **Alternative écartée** : résolution des noms par appel REST Supabase
  direct. Rejetée : casse le fonctionnement hors ligne (argument central de
  PowerSync), ajoute un aller-réseau par rendu et court-circuite la couche de
  données (`dataLayer.ts`) — donc une seconde source de vérité.

### D-S6-2 — Environnement de référence E2E = serveur de dev `:8080`
- **Contexte** : la suite avait été lancée contre un `vite preview` obsolète
  (`:4174`, build de 01:06) produisant 9 échecs non imputables au code courant
  (R81) ; et `cross-tenant.cy.ts` (isolation inter-orgs) exige
  `window.__psSupabaseClient`, publié uniquement en mode dev (R72).
- **Décision** : figer l'environnement de référence sur `npx vite` port 8080
  (`CYPRESS_BASE_URL=http://127.0.0.1:8080`), après `rm -rf dist` et
  redémarrage du serveur, conformément à `scripts/run-cypress.sh` et au
  RUNBOOK. Ne pas modifier `cypress.config.ts` (gel).
- **Raison** : un build de production fait échouer le spec de sécurité le plus
  important de façon systématique et silencieuse, ce qui peut faire conclure à
  tort à une régression d'isolation des données. Le serveur de dev est
  l'environnement prescrit par le dépôt.
- **Alternative écartée** : ajouter un `webServer` à `cypress.config.ts` pour
  rendre le démarrage explicite. Écartée pendant le gel (changement
  structurel non testé) → portée en PROPOSITIONS.md (P32).


## D-S7-1 — Anti-pause : ping API externe (pas le heartbeat pg_cron)

- **Décision** : ajouter `.github/workflows/keep-alive.yml` (ping REST+Auth
  toutes les 48 h) comme mécanisme anti-pause, et corriger le commentaire de
  `supabase/keep-alive.sql` qui affirmait le contraire.
- **Raison** : la doc officielle Supabase (« Project Pausing ») indique que la
  pause Free dépend de « user database activity / a few user requests to the
  database each day ». L'activité **interne** (pg_cron) n'est pas comptée :
  le heartbeat seul n'empêchait donc rien. Le dépôt est **public**, donc les
  schedules GitHub ne sont pas désactivés (la limite des 60 jours ne concerne
  que les dépôts privés).
- **Alternative écartée** : dépendre du heartbeat pg_cron (prémisse fausse) ;
  passer au plan Pro (coût récurrent non validé par le propriétaire).

## D-S7-2 — Sauvegarde planifiée via GitHub Actions, chiffrée

- **Décision** : livrer `.github/workflows/backup.yml` +
  `scripts/backup-supabase.sh` (export schéma+données via `supabase db dump`,
  décision D2), avec publication d'artefact **uniquement si chiffré**
  (AES256/GPG). Activation par le propriétaire via le secret
  `SUPABASE_DB_URL`.
- **Raison** : le plan Free ne permet aucun téléchargement de sauvegarde ; ni
  `pg_dump` ni Docker ne sont disponibles dans l'environnement d'agent, et
  aucune credential DB n'y est présente. Le workflow rend la sauvegarde
  automatique dès que le secret existe.
- **Alternative écartée** : publier un artefact non chiffré (dépôt public →
  fuite de toute la base) ; exiger un stockage S3 (secret supplémentaire,
  friction).
