# Findings — Axe D : Finances avancées

## Ce que gèrent les grandes églises (sourcé)
Source : *Manual of Business Methods in Church Affairs* (Episcopal) + bonnes pratiques not-for-profit.

- **Budget par programme / centre de coûts** : chaque chair de programme compile un **budget programme** (objet, services, objectifs, montant, coûts/bénéfices d'un changement) ; **zéro-budget** périodique (pas annuel).
- **Rapports financiers au conseil (Vestry)** : **trimestriels**, sur **tous les fonds y compris restreints**, avec détail vs budget pour la **responsabilité fiduciaire**.
- **États (norme not-for-profit)** :
  - *Statement of Activities* : variation du patrimoine net.
  - *Functional Expenses* : croisement **fonctionnel (programme/soutien) × naturel (salaires, loyer, électricité, intérêts, **dépréciation**)**.
  - *Cash Flows* : exploitation / investissement / financement (fin d'année).
- **Comptabilité de fonds** : **fonds restreints** vs non restreints, traçabilité de l'affectation.

## Verdict Lumina
| Besoin | Statut Lumina |
|---|---|
| Budget par centre de coûts + écart prévu/réel | ❌ (`/balance` = bilan par période seulement) |
| Rapport conseil trimestriel multi-fonds | ⚠️ (bilan existant, pas multi-fonds) |
| Fonctionnel × nature (programmes/soutien) | ❌ (9 catégories statiques) |
| Fonds restreints vs libres (fund accounting) | ❌ |
| Cash-flow prévisionnel | ❌ |
| Payroll staff + cotisations sociales | ⚠️ (catégorie « salaire pasteur » seule) |
| Immobilisations + dépréciation | ❌ |
| Rapprochement bancaire | ❌ |

**Global : ⚠️/❌.** Cœur finance solide (transactions immuables, caisses, versement, audit) mais **pas de budgeting ni accounting avancé**.

## Propositions
- P0 — capability **`budgets`** : `budgets` (org, période, centre de coûts) + `budget_lines` (prévu/réel, écart) ; rapports conseil trimestriels.
- P1 — **`funds`** : fonds restreints vs libres (affectation, traçabilité).
- P1 — **`payroll`** : staff récurrent + cotisations sociales + bulletin.
- P1 — **`reconciliation`** : import bancaire ↔ transactions.
- P2 — **`assets`** : registre + dépréciation ; **cash-flow prévisionnel**.
