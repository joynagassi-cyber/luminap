# Roadmap — features/capabilities proposées pour Lumina (grandes églises)

Basé sur `gap-matrix.md`. Séquence P0 → P1 → P2. Chaque brique = capability
(`src/capabilities/*`) + feature (route) + SQL (Postgres + PowerSync + RLS + grants).

## P0 — « Indispensable grande église » (à faire d'abord)

### 1. capability `budgets` (budget par centre de coûts + rapports conseil)
- **Feature** `/budgets` : budgets annuel/trim par centre de coûts, **écart prévu/réel**
  croisé avec les transactions immuables.
- **SQL** : `budgets(org_id, period, cost_center, amount)`, `budget_lines(budget_id, category_id, planned, actual_view)` ;
  vues SQL d'agrégation sur `transactions` ; grants `service_role` + RLS par `org_id`.
- **Effort** : M. **Valeur** : gouvernance + visibilité du conseil (fiducary).

### 2. capability `giving` (dons, campagnes, pledge, reçu fiscal)
- **Feature** `/giving` : campagnes (but/fonds/objectif), **pledges** (échelonnement),
  **reçus fiscaux** + rapport annuel/donateur ; rattachement des `transactions` entrée/dîme à un donateur + campagne.
- **SQL** : `giving_donors`, `giving_campaigns`, `pledges`, `tax_receipts`, `transaction_giving` (lien).
- **PSP hors périmètre** (tiers) — Lumina garde la **traçabilité**.
- **Effort** : L. **Valeur** : gestion des donateurs + conformité fiscale.

## P1 — « Fort-à-fort »

- capability **`members`** (+ families/visitors) — CRM cycle de vie. [P1, M–L]
- capability **`attendance`** (services + check-in + analytics). [P1, M]
- capability **`funds`** (fonds restreints vs libres). [P1, M]
- capability **`payroll`** (staff récurrent + cotisations sociales + bulletin). [P1, L]
- capability **`reconciliation`** (import bancaire ↔ transactions). [P1, M]
- **`giving`** : dons récurrents + reports par donateur/fonds. [P1, M]
- **`federation`** : dimension campus sur transactions + consolidation HQ/drill-down +
  généralisation de `versement` en transfert inter-campus. [P1, M–L]

## P2 — « Plus tard »

- capability **`teams`** (équipes/volontariat + rosters/rotations équipe de service). [P2, L]
- capability **`assets`** (immobilisations + dépréciation) + **cash-flow prévisionnel**. [P2, L]
- Planification liturgique (chorus, versions de chants, archive prédications). [P2, L]
- Activer la capability **`notification`** (vue UI + messagerie/anons). [P2, M]

## Critères de validation (par P0/P1)
1. Capability créée sous `src/capabilities/<nom>/` (structure existante).
2. **SQL prêt à exécuter** (Postgres + PowerSync + RLS + grants `service_role`/`authenticated`).
3. Feature routée + accessible dans le menu « Plus ».
4. `AI_RULES.md` mis à jour (nouvelles tables/capabilities).
5. Spec e2e happy-path sous `e2e-tests/`.

## Ordre de construction suggéré
`budgets` → `giving` → `members`/`attendance` → `funds`/`payroll`/`reconciliation` → `federation` (campus) → P2.
