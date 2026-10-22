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
