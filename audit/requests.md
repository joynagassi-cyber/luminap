# Demandes à l'intégrateur / au propriétaire

## R1 — Fichier de données réelles du tutoriel (BLOQUANT Phase 10)
`docs/tutoriel/donnees-reelles.yaml` est **absent**. L'annexe 2 interdit d'inventer
catégories, montants ou noms. Sans ce fichier, la Phase 10 (tutoriel PDF) **ne
peut pas démarrer**. → Fournir le fichier, ou autoriser explicitement des données
fictives cohérentes (déjà proposées dans `e2e-audit/demoSeed.mjs`).

## R2 — Maquette `dashboard-MF` (BLOQUANT annexe B)
L'export PNG de la maquette est **absent**. L'annexe B demande de reproduire
« structure, jetons, dimensions et états » et de comparer aux captures. Sans la
référence, je ne peux appliquer que le tableau de jetons B1. → Fournir la maquette,
ou valider que B1 seul fait foi.

## R3 — Accès aux écrans à grant serveur
`/admin/roles`, `/invitation/emit`, `/invitation/manage`, `/admin/units` renvoient
« Accès refusé » en local (le gating dépend d'un grant `org_admins` serveur que le
seed local ne fournit pas). → Autoriser un seed avec grant (hors production), ou
classer ces écrans « non vérifiables localement » et confier leur contrôle à un
environnement de préproduction.

## R4 — Preuve visuelle
Aucun outil de vision dans mon environnement. → Confier la relecture visuelle des
captures à un humain / agent doté de vision, ou accepter des preuves DOM/mesures.

## R5 — Changements sur fichiers partagés demandés par les lanes
(aucun pour l'instant — sera alimenté pendant les lanes)
