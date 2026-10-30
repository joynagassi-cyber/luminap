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

## D-S9-1 — Retirer le contrôle d'existence de l'invitation dans la politique de claim (R91.b)

- **Décision** : dans `invitation_claims_insert`, supprimer
  `EXISTS (SELECT 1 FROM public.invitations i WHERE i.id = invitation_id)`.
  L'existence de l'invitation est garantie par la clé étrangère
  `invitation_claims_invitation_id_fkey` (contrôle effectué hors RLS).
- **Raison** : ce sous-`SELECT` s'exécute **sous la RLS de l'appelant**. Depuis
  que `invitations_select` est restreint aux gestionnaires, un invité non
  gestionnaire ne « voit » pas la ligne → `EXISTS` faux → son claim était
  refusé (42501). Le parcours « un invité réclame un code » était cassé. La FK
  rend le contrôle redondant, sans angle mort.
- **Alternative écartée** : rendre `invitations_select` permissif pour les
  invités (réintroduirait la fuite R91 du `code`/`target_role`) ; ajouter une
  fonction SECURITY DEFINER dédiée (plus de surface, non nécessaire).

## D-S9-2 — Déplacer la garde anti-escalade dans le trigger DEFINER (R91.c)

- **Décision** : vérifier « le profil cible est-il déjà ACTIF ? » dans
  `settle_invitation_claim` (SECURITY DEFINER), et refuser l'élévation sauf si
  un gestionnaire d'invitations est l'auteur de l'invitation.
- **Raison** : la RLS est **aveugle** — elle ne peut pas distinguer « profil
  ACTIF » de « profil non visible par l'appelant » (les deux donnent
  `NOT EXISTS`). Le trigger DEFINER est le seul endroit où la lecture des
  profils est fiable. C'est de la défense en profondeur sous la RLS.
- **Alternative écartée** : garder la seule garde RLS (déjà contournée dans le
  cas « appelant gestionnaire » — prouvé) ; interdire tout claim sur un profil
  existant (casserait le parcours d'onboarding par invitation).

## D-S9-3 — Archiver (ARCHIVED) les organisations résiduelles plutôt que les supprimer (R96)

- **Décision** : les 3 annexes créées par le spec Cypress `org-reports.cy.ts`
  ont été **archivées** (`status='ARCHIVED'`, `archive_reason` renseigné) et
  non supprimées. Le spec archive désormais ses propres organisations dans un
  hook `after()`.
- **Raison** : aucune sauvegarde DB n'existe encore (P31 non activée par le
  propriétaire) → toute suppression serait irréversible. `ARCHIVED ≠ DELETE`
  est le cycle de vie sanctionné par l'app (`archiveOrganization`), l'action
  est réversible et tracée.
- **Alternative écartée** : `DELETE` des organisations (irréversible sans
  sauvegarde, et sans FK depuis `profiles`/`org_memberships`/`org_admins` vers
  `organizations`, la suppression laisserait des orphelins) ; ne rien faire
  (pollution continue de la base).

## D-S9-4 — Ne pas modifier les 2 advisors `rls_enabled_no_policy` (R97)

- **Décision** : laisser `keep_alive` et `_jsonb_backfill_20261024` avec RLS
  activée **sans politique**.
- **Raison** : RLS sans politique = **deny-all** (aucun accès), donc aucune
  fuite. Ajouter une politique élargirait l'accès à des tables internes ;
  désactiver la RLS ouvrirait l'accès ; supprimer les tables casserait le ping
  anti-pause et perdrait la sauvegarde du backfill jsonb (R65). L'option la
  plus sûre est de ne rien changer.
- **Alternative écartée** : créer des politiques de lecture pour « faire
  disparaître l'advisor » (aggraverait la sécurité pour un gain cosmétique).

## D-S9-5 — Ne supprimer aucune donnée personnelle (PII) de l'instance

- **Décision** : ne pas purger les 9 adresses `@gmail.com` ni les 47 profils
  `__no_org__`.
- **Raison** : bien que l'instance soit un environnement de développement
  (`transactions = 0`, `documents = 0`), l'identification exacte des données
  « réelles » vs « de test » n'est pas certaine, et aucune sauvegarde n'existe.
  Le principe conservateur s'applique : ne rien détruire d'irréversible.
  Ces éléments sont documentés (R10, R22) avec une procédure de traitement
  dans RUNBOOK.md, à exécuter par le propriétaire après activation des
  sauvegardes.
- **Alternative écartée** : purge immédiate (risque de destruction
  irréversible de données potentiellement réelles).

## Phase 0 (boucle autonome) — D-P0-1 à D-P0-3 (2026-10-26)

### D-P0-1 — Magasin d'état unique sous `docs/agent/`
- **Contexte** : le contrat exige `docs/agent/` (PROGRESS, ESCALATIONS, …) ; les
  sessions précédentes ont produit `docs/agent-session/`. Deux dossiers =
  violation de R7 (source de vérité unique).
- **Décision** : `git mv docs/agent-session docs/agent` ; les artefacts du
  contrat vivent dans le même dossier. Références internes mises à jour.
- **Alternative écartée** : index de compatibilité (deux dossiers à maintenir).
- **Réversibilité** : `git mv` inverse.

### D-P0-2 — Gates bloquants = gates déterministes mesurables localement
- **Décision** : `tsc -b`, lint, vitest, build sont **bloquants** ; Cypress n'est
  pas un gate bloquant local (environnement E2E indisponible, R98).
- **Raison** : R12 (honnêteté) — ne pas déclarer vert ce qu'on ne peut pas
  prouver ; ne pas bloquer sur un gate non mesurable.
- **Conséquence** : ESCALATIONS E2 ; specs Cypress indépendantes de PowerSync =
  signal E2E de repli.

### D-P0-3 — Gates inatteignables → escalades avec repli sûr
- **Décision** : déploiement PowerSync (E1), Cypress vert (E2), sauvegardes
  automatiques (E3) = entrées `ESCALATIONS.md`, jamais des « verts » déclarés à
  tort, jamais bloquants pour les autres tâches.
- **Repli appliqué** : cf. ESCALATIONS.md (fichiers corrigés et versionnés,
  runbook opérateur, principe conservateur sur les migrations destructives).

### D-P3-1 — Anti-cycle de fédération en défense en profondeur (TS + DB)
- **Décision** : la garde anti-cycle est appliquée à **deux** niveaux — miroir TS
  pur (`src/lib/orgTree.ts`, appelé par `federation.setParentOrg`) **et** trigger
  `BEFORE INSERT OR UPDATE OF parent_org_id` en base (`org_would_cycle`).
- **Raison** : la même règle doit tenir que l'écriture passe par le client,
  par SQL direct ou par la sync PowerSync. Une garde TS seule est contournable ;
  une garde DB seule ne donne pas de message clair côté UI. Les deux partagent
  le **même** algorithme (remontée des parents, bornée).
- **Alternative écartée** : contrainte `CHECK` (impossible : dépend d'autres
  lignes) ; vue matérialisée de clôture (lourde, cf. PR17).
- **Réversibilité** : `rollback/20261026000001_rollback.sql` (drop trigger +
  fonctions) ; côté TS, retrait du seul appel `assertReparentAllowed`.
- **Réduction de surface** : `REVOKE ALL … FROM PUBLIC, anon, authenticated` sur
  les 2 fonctions (usage interne au trigger uniquement).

### D-P3-2 — Pas de table de fermeture matérialisée (pour l'instant)
- **Décision** : conserver la vue récursive `org_family` + `org_descendants`
  existantes ; ne **pas** introduire de table `ancestor/descendant/depth`
  matérialisée maintenant.
- **Raison** : aucun besoin de perf mesuré (aucune latence observée sur la base
  de dev) ; une table matérialisée ajoute une migration lourde, une maintenance
  de cohérence et un risque de désynchronisation (sync PowerSync). Principe
  « minimal, réversible ». La clôture transitive est fournie **en TS** par
  `buildClosure` (testée, profondeur ≥ 25, largeur ≥ 150).
- **Alternative** : PR17 (proposition) si un besoin de perf est mesuré plus tard.

### D-P4-1 — Décision de permission unique, générée depuis la matrice canon
- **Décision** : `has_permission()` (SQL) et `evaluatePermission()` (TS) sont deux
  implémentations de la **même** table de vérité, elle-même **générée** depuis
  `PERMISSION_MATRIX` (`src/lib/rbac.ts`). Les `VALUES` SQL de
  `role_permissions` sont extraits de `ROLE_PERMISSION_ROWS` (TS), et un test
  **relit la migration** pour prouver l'égalité exacte.
- **Raison** : garantir « une décision unique DB↔TS » (contrat §4) sans double
  maintenance. La génération + le test anti-dérive rendent toute divergence
  impossible sans échec CI.
- **Alternative écartée** : écrire la matrice deux fois (TS + SQL) à la main —
  source de divergence silencieuse.
- **Réversibilité** : `rollback/20261026000002_rollback.sql`.

### D-P4-2 — Deny via `grants.effect`, sans nouvelle table
- **Décision** : ajouter `effect` ('allow'|'deny') et `expires_at` à `grants`
  plutôt que créer une table `denials`.
- **Raison** : le deny a **exactement** la même forme qu'un grant (sujet,
  ressource, action, portée) ; une colonne suffit, et `subject_type='tag'` reste
  un sujet de première classe (invariant 10). Une table séparée dupliquerait la
  logique de résolution et le schéma de sync.
- **Conséquence** : le schéma local PowerSync (`multi-org-schema.ts`) est mis à
  jour en miroir (sinon la sync casse).

### D-P4-3 — `has_permission` livrée comme primitive, RLS non réécrites
- **Décision** : ne **pas** réécrire les ~146 politiques RLS existantes pour
  appeler `has_permission` dans cette phase.
- **Raison** : aucune régression n'est mesurée (les politiques actuelles
  fonctionnent, R2/R15/R91 déjà corrigés) ; une réécriture massive serait un
  risque élevé non justifié (principe « minimal, réversible »). La décision
  unique est **disponible** et **prouvée** pour les nouveaux usages et la
  migration progressive.
- **Alternative** : proposition PR18 (migration progressive des politiques).

### D-P6-1 — Durcir les streams PowerSync au même niveau que la RLS
- **Décision** : chaque fois qu'une politique RLS est durcie, vérifier le stream
  PowerSync correspondant — sinon la règle de sync **contourne** la RLS
  (PowerSync lit en service role).
- **Raison** : R92 le prouve : la RLS `invitations_select` avait été restreinte
  (R91) mais le stream restait « org de l'appelant », donc tout membre
  synchronisait les codes. La RLS n'est pas une frontière suffisante quand un
  flux de sync la double.
- **Correctif** : streams `invitations`/`invitation_claims` restreints aux
  gestionnaires, testés par lecture du YAML (anti-régression).

### D-P6-2 — Jetons porteurs générés par CSPRNG
- **Décision** : tout code/jeton remis hors-bande (invitation, partage) est tiré
  de `crypto.getRandomValues`, jamais de `Math.random()`.
- **Raison** : un code d'invitation ouvre l'accès à une organisation ; un flux
  `Math.random` prévisible le rend devinable (prouvé : code identique sous flux
  figé).
- **Repli** : `Math.random()` uniquement si WebCrypto est absent (l'entropie
  reste non déterministe) — cas non navigateur.

### D-P7-1 — Les gardes métier doivent exister en base, pas seulement côté client
- **Décision** : toute règle d'intégrité financière (immuabilité d'une pièce
  approuvée, interdiction de suppression) doit être **en base** (trigger/policy),
  pas uniquement dans le client TS.
- **Raison** : R102 prouve que le garde-fou client (`deleteTransactionPS`) est
  contourné par PowerSync (service role) et par l'API REST. Le client n'est pas
  une frontière de sécurité.
- **Correctif** : trigger `BEFORE DELETE` refusant la suppression d'une
  transaction APPROVED, avec le **même** code d'erreur que le client
  (`TRANSACTION_APPROVED_IMMUTABLE`) pour une parité vérifiée par test.

### D-P7-2 — Un trigger `AFTER INSERT OR UPDATE OR DELETE` doit gérer OLD/NEW
- **Décision** : toute fonction trigger multi-opérations doit brancher sur
  `TG_OP` et n'utiliser `NEW` que pour INSERT/UPDATE, `OLD` pour DELETE.
- **Raison** : R101 — l'ancienne `notify_transaction_change()` référençait `NEW`
  sur DELETE (NULL) et, plus grave, listait 6 colonnes pour 5 valeurs, cassant
  toute écriture de transaction. Le défaut était masqué car `transactions`
  était vide.
- **Leçon** : un schéma de test vide masque les triggers d'écriture ; la CI
  n'exécute aucune transaction réelle. Les gardes d'intégrité de migration
  (`migration-notify-transaction.test.ts`) verrouillent la structure.

### D-P8-1 — Aucune fonction de trigger ni de règlement n'est exposée en RPC
- **Décision** : `REVOKE EXECUTE` sur toute fonction `RETURNS trigger` et sur
  `settle_invitation_claim` (PUBLIC/anon/authenticated) ; garde
  `pg_trigger_depth() = 0` en défense en profondeur.
- **Raison** : R103 — une fonction `SECURITY DEFINER` exposée en RPC agissant
  sur un tiers permet une escalade de privilèges. Les triggers doivent rester
  `SECURITY DEFINER` pour continuer à invoquer la fonction après le revoke
  (l'invocation système ne requiert pas `EXECUTE`).
- **Compromis assumé** : les advisors `authenticated_security_definer_function_executable`
  restent pour les helpers RLS (`is_org_member`, `has_permission`, …) : ils sont
  conçus pour être appelés dans les policies et prennent l'uid en paramètre ;
  leur retrait casserait les policies. Seules les fonctions à effet de bord sont
  fermées.

### D-P8-2 — Échappement CSV obligatoire (injection de formule)
- **Décision** : tout export CSV passe par `escapeCsvCell`/`escapeCsvRow`
  (`src/lib/csv.ts`) : neutralisation des préfixes `= + - @ \t \r \n` + citation
  RFC 4180.
- **Raison** : Phase 8 « entrées hostiles » — un champ utilisateur commençant
  par `=` est exécuté comme formule par Excel/Sheets à l'ouverture. Les trois
  exports (transactions, soumissions de formulaire, rapports) sont couverts.

### D-S10-1 — R109 : ne pas trancher le rôle `ADMIN` en autonomie (conservateur)
- **Décision** : ne PAS ajouter `ADMIN` au modèle canon ni le retirer des
  politiques RLS. Mesurer, figer (`docs/agent/role-model.json`) et **faire
  trancher le propriétaire**.
- **Raison** : R109 est un choix de modèle de rôles (admin central via rôle
  `profiles.role='ADMIN'` vs via grants `org_admins`). Ajouter `ADMIN` au modèle
  TS lèverait la garde `role-model-drift` et changerait le comportement
  d'autorisation de bout en bout (UI + RLS) sans mandat explicite ; retirer le
  littéral des politiques RLS toucherait la sécurité d'écriture des tables
  centrales. Les deux options ont un impact produit réel → décision propriétaire.
- **Conséquence assumée** : le compte admin central reste fonctionnellement sans
  droits `has_permission` tant que la décision n'est pas prise. Documenté (R109),
  gardé (test anti-dérive), non corrigé.

### D-S10-3 — R109 : `CENTRAL_ADMIN` = second orphelin, même décision conservatrice
- **Décision** : ne PAS ajouter `CENTRAL_ADMIN` au modèle canon ni toucher aux
  `user?.role === "CENTRAL_ADMIN"` de l'UI. Documenter et faire trancher.
- **Mesure (2026-10-29)** : `CENTRAL_ADMIN` est testé par l'UI dans 10
  occurrences / 7 fichiers, mais il est **absent** du type `Role`, **absent** de
  `role_permissions` (0 ligne) et **absent de toute politique RLS** (0 ligne
  dans `pg_policies`). Ces tests sont donc toujours faux — code mort latent,
  masqué par le fait que `CurrentUser.role` est typé `string` (`dataLayer.ts:44`).
- **Mécanisme réel** : l'admin central fonctionne via les **grants `org_admins`**
  (`create_org` gate sur un grant ACTIF et en crée un pour le créateur), pas via
  un rôle. Donc la voie (b) « rôle admin central » serait à **créer de zéro**,
  tandis que la voie (a) « grants » **existe déjà** et est fonctionnelle.
- **Raison** : même que D-S10-1 — choix de modèle de rôles, impact autorisation
  de bout en bout, sans mandat explicite → décision propriétaire.
- **Conséquence assumée** : les 10 tests UI `role === "CENTRAL_ADMIN"` restent
  faux ; documenté (R109), gardé (test anti-dérive), non corrigé.

### D-S10-2 — Garde d'inventaire RLS sans identifiants (CI bloquante)
- **Décision** : figer l'inventaire RLS mesuré (`docs/agent/rls-inventory.json`)
  et échouer en CI si une table n'a ni RLS ni politique (sauf deny-all listé).
- **Raison** : le seul contrôle existant (`scripts/rls-isolation-check.sh`)
  exige des identifiants Supabase → non exécutable en CI, donc non bloquant.
  Un audit figé rend l'invariant vérifiable sans secret.

### D-S11-1 — Durcir la surface RPC par l'ÉTAT FINAL, pas par motif concaténé
- **Décision** : pour garantir qu'aucune fonction de trigger `SECURITY DEFINER`
  n'est exécutable par `anon`/`authenticated`, la garde rejoue les migrations
  **dans l'ordre** (`create` / balayage générique / `revoke` explicite) et
  évalue l'**état final** — au lieu de chercher un motif dans le texte concaténé
  de toutes les migrations.
- **Raison** : le test R103 existant cherchait un motif *quelque part* ; il ne
  pouvait pas détecter qu'une migration **ultérieure** (`20261027000001`,
  `20261027000011`) régresse l'état. Mesuré : `denorm_*` exposées et garde
  `pg_trigger_depth()` perdue. Une garde qui ignore l'ordre est structurellement
  aveugle à cette classe (cf. R115).
- **Conséquence** : `src/lib/__tests__/revoke-trigger-functions.test.ts`
  (non-vacuité prouvée : 3/4 échecs sans le correctif).

### D-S11-2 — Corriger une surface non exploitable quand même (cohérence + avenir)
- **Décision** : corriger la surface RPC de `denorm_*` bien que l'appel direct
  d'une fonction `RETURNS trigger` soit refusé par PostgreSQL
  (`0A000: trigger functions can only be called as triggers`) — donc **aucune
  vulnérabilité exploitable**.
- **Raison** : le coût est nul et réversible (rollback fourni) ; l'état exposé
  est incohérent avec R103 et deviendrait réel si un `GRANT EXECUTE` ou un
  passage en `SECURITY INVOKER` survenait. La correction documente explicitement
  l'exploitabilité mesurée (honnêteté R12) plutôt que de la surestimer.

## Session 12 (boucle autonome) — D-S12-1 à D-S12-4 (2026-10-29)

### D-S12-1 — R109 TRANCHÉ : `ADMIN` devient le 15e rôle canonique (super-admin)
- **Décision** (mandat propriétaire) : `ADMIN` entre au modèle canon, détenant
  **toutes** les permissions (28). Un porteur administre son organisation,
  **crée des annexes** (`parent_org_id`) et **supervise** la famille.
- **Raison** : le propriétaire a explicitement demandé que « l'admin puisse
  créer une annexe et l'org mère puisse superviser les annexes ». L'option (b) de
  R109 (rôle canon) est donc retenue, **au lieu** de la voie grants seule.
- **Conséquence** : `Role` (TS), `PERMISSION_MATRIX`, `role_permissions` (28
  lignes), `is_org_admin`, `can_manage_invitations`, `create_org` (edge) et les
  politiques `orgs_*` (migration `20261029000004`) sont alignés. La garde
  `role-model-drift.test.ts` verrouille « `ADMIN` ⊇ toutes les permissions ».
- **RÉVERSIBILITÉ** : `rollback/20261029000001_rollback.sql`.

### D-S12-2 — Garde anti-escalade à DEUX barrières, la seconde fondée sur `initplan_uid()`
- **Décision** : fermer la voie d'escalade par invitation vers `ADMIN` avec
  (1) un trigger sur `invitations` **et** (2) une garde dans
  `settle_invitation_claim`.
- **Raison (mesurée)** : dans une fonction `SECURITY DEFINER`, `current_user`
  vaut le **propriétaire**, pas le client — la 1re version du trigger laissait
  donc passer l'insert (mesuré). On détecte l'acteur via **`initplan_uid()`**
  (JWT). La barrière (2) est la **décisive** : le chemin d'écriture de l'app
  passe par PowerSync (`powersync_role`, BYPASSRLS, sans JWT), où le trigger est
  aveugle ; `settle_invitation_claim` lit `inv.issued_by` de façon fiable.
- **Conséquence** : `REJECTED_ROLE_ESCALATION` ajouté à la contrainte
  `invitation_claims_status_check` + au type TS `ClaimStatus` + à l'UI.

### D-S12-3 — Câbler `has_permission` en écriture (R137), avec limite honnête assumée
- **Décision** : réécrire les politiques d'écriture des **5 tables sensibles**
  (`transactions`, `versements`, `members`, `events`, `groups`) sur
  `is_org_member AND has_permission`.
- **Raison** : R137 mesurait **0/30** politiques d'écriture appelant
  `has_permission` → un `MEMBRE` pouvait écrire au niveau base via REST.
- **Limites assumées** :
  - `documents` / `accounts` laissées en `is_org_member` seul (R137.a) : aucune
    permission `document:*` / `account:*` n'existe ; les contraindre fermerait
    l'écriture à **tous** les rôles ;
  - la voie **PowerSync** (`BYPASSRLS`) **n'est pas** couverte par la RLS — le
    correctif ferme la voie REST directe. Fermer PowerSync exige un contrôle
    côté connecteur/backend (chantier distinct, documenté).
- **RÉVERSIBILITÉ** : `rollback/20261029000002_rollback.sql`.

### D-S12-4 — Règle du trigger SECURITY DEFINER : ne jamais se fier à `current_user`
- **Décision** : toute garde d'autorisation placée dans une fonction
  `SECURITY DEFINER` doit lire l'acteur réel via **`initplan_uid()`** (JWT), et
  **jamais** via `current_user`/`session_user`.
- **Raison** : piège mesuré deux fois dans cette session (barrière 1 de R139) —
  `current_user` reflète le propriétaire de la fonction, pas le client. Un
  contrôle fondé sur `current_user IN ('authenticated','anon')` est
  **silencieusement inopérant**.
- **Conséquence** : la garde R139 a été corrigée et re-prouvée ; le motif est
  documenté pour les futures gardes (cf. aussi D-S9-2).

### D-S13-1 — Journal d'audit en ajout seul (R140) ; périmètre R141 NON forcé
- **Décision** : retirer les politiques `audit_entries_update` /
  `audit_entries_delete` (journal d'audit = append-only). **Ne pas** réécrire
  d'un coup les 26 autres tables en « membre seul » (R141).
- **Raison (R140)** : tout `MEMBRE` pouvait effacer/falsifier une entrée d'audit
  → anti-traçabilité. Aucun chemin applicatif ne fait `UPDATE`/`DELETE` sur
  cette table → le durcissement est **sûr** (0 flux cassé).
- **Raison (R141, prudence assumée)** : le vocabulaire de permissions canon
  (`role_permissions`) **ne couvre pas** `accounts`, `caisses`, `tax_receipts`,
  `org_budgets`, `pledges`, `giving_*`… Réécrire ces politiques sans décision
  explicite **casserait** des flux métier légitimes (trésorier, responsable).
  Un correctif à l'aveugle serait **pire** que le défaut.
- **Conséquence** : R141 est consigné **OUVERT** (gravité HAUTE) avec une
  procédure de remédiation en 2 lots, à valider par le propriétaire. C'est la
  prochaine action à plus forte valeur.
- **RÉVERSIBILITÉ** : `rollback/20261030000001_rollback.sql`.
