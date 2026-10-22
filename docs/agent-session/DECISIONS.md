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
