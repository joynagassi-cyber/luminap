# Gap matrix — Grandes églises × Lumina (v1)

Références : `plan-grandes-eglises.md`, `findings/{membres,finances,dons}.md`.
Verdict : ✅ couvert · ⚠️ partiel · ❌ manquant. Priorités : **P0** indispensable grande
église · **P1** fort-à-fort · **P2** plus tard.

## Membres & cycle de vie (A)
| Besoin | Lumina | Capability / feature | Prio | Effort | Tables (Postgres + PowerSync) |
|---|---|---|---|---|---|
| Dossier membre + champs custom | ⚠️ | `members` | P1 | M | `members`, `member_fields`(jsonb) |
| Famille / foyer | ❌ | `members` | P1 | S | `families`, `family_members` |
| Entonnoir visiteur→membre + discipulat | ❌ | `journey` | P1 | M | `visitors`, `discipleship_milestones` |
| Présence par culte + analytics | ❌ | `attendance` | P1 | M | `services`, `attendance_records` |
| Équipes / volontariat + planning | ❌ | `teams` | P2 | L | `ministries`, `team_members`, `rosters` |

## Finances avancées (D)
| Besoin | Lumina | Capability / feature | Prio | Effort | Tables |
|---|---|---|---|---|---|
| Budget par centre de coûts + écart | ❌ | `budgets` | **P0** | M | `budgets`, `budget_lines` |
| Rapport conseil trimestriel multi-fonds | ⚠️ | `budgets`/reports | **P0** | M | vues SQL sur `transactions` |
| Fonds restreints vs libres | ❌ | `funds` | P1 | M | `funds`, `fund_designations` |
| Payroll staff + social | ⚠️ | `payroll` | P1 | L | `staff`, `payroll_items` |
| Rapprochement bancaire | ❌ | `reconciliation` | P1 | M | `bank_statements`, `reconciliation_entries` |
| Immobilisations + dépréciation | ❌ | `assets` | P2 | L | `assets`, `asset_depreciation` |
| Cash-flow prévisionnel | ❌ | `budgets` | P2 | M | projections |

## Dons & campagnes (E)
| Besoin | Lumina | Capability / feature | Prio | Effort | Tables |
|---|---|---|---|---|---|
| Campagnes de pledge + objectif | ❌ | `giving` | **P0** | L | `giving_campaigns`, `pledges` |
| Reçu fiscal + rapport/donateur | ❌ | `giving` | **P0** | M | `giving_donors`, `tax_receipts` |
| Don récurrent planifié | ❌ | `giving` | P1 | M | `recurring_gives` |
| Report dons par donateur/fonds | ⚠️ | `giving`+reports | P1 | M | `transaction_giving`(lien) |
| PSP en ligne | ❌ (hors périmètre) | — (tiers) | — | — | — |

## Multi-campus / fédération (N)
| Besoin | Lumina | Capability / feature | Prio | Effort | Tables |
|---|---|---|---|---|---|
| Segment coding (dimension campus sur transactions) | ⚠️ (caisses/groupe) | `federation`+`transactions` | P1 | M | `org_units.campus`, `transactions.campus_id` |
| Transferts inter-campus (versement généré) | ✅ | étendre `versement` | P1 | S | `versements`(existant, généraliser) |
| Consolidation HQ + drill-down par campus | ⚠️ | reports | P1 | L | vues consolidées |

## Lecture
- **Lumina excelle** sur la **trésorerie immuable / audit / versement / fédération**.
- **Trous P0** (vitaux pour une grande église) : **budget par centre de coûts** + **module dons/campagnes
  (pledge + reçu fiscal)**. Ce sont les deux à faire en premier.
- **Trous P1** : CRM membres (famille/visiteur/présence), funds, payroll, reconciliation, dons récurrents,
  multi-campus consolidé.
- **Trous P2** : assets, cash-flow, volontariat, planification liturgique.
