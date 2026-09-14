# Findings — Axe E : Dons & campagnes

## Ce que gèrent les grandes églises (sourcé)
Source : Tithely (giving d'églises, US) + retours pasteurs/trésoriers.

- **Don en ligne / mobile / SMS** : Apple Pay & Google Pay, **kiosque** sur place.
- **Campagnes de pledge** : engagements / objectifs par projet (missions, construction).
- **Dons récurrents** : planification automatique (« cover the fees ») ; ~10 % des dons déjà récurrents chez un pasteur sondé.
- **Reçus fiscaux automatiques** + **rapport fiscal annuel par donateur** (déductibilité).
- **Reporting** : dons par fonds/campagne/ministère, taux de transaction < 1 %.

## Verdict Lumina
| Besoin | Statut Lumina |
|---|---|
| Dons en ligne / mobile | ❌ (hors périmètre actuel, pas de PSP) |
| Campagnes de pledge + objectif | ❌ |
| Don récurrent (planifié) | ❌ |
| Reçu fiscal + rapport annuel/donateur | ❌ (audit existe, pas de fiscal) |
| Reporting dons par fonds/campagne | ⚠️ (rapports inachevés) |

**Global : ❌ manquant.** Lumina enregistre la **trésorerie (catégories)** mais n'a **pas de module donneur/campagne** : pas de pledge, pas de récurrent, pas de reçu fiscal, pas de vue par donateur.

## Propositions
- P0 — capability **`giving`** : `giving_campaigns` (but / fonds / objectif), `pledges` (engagement, échéances), `giving_donors`.
- P0 — **reçus fiscaux** : `tax_receipts` + rapport annuel par donateur.
- P1 — **dons récurrents** : planification + rattachement à une transaction (immuable).
- P1 — rattachement des dons existants (`transactions` type entrée/dîme) à un **donateur + campagne** pour les reports par donateur.
- Note : le **PSP (paiement en ligne)** reste hors périmètre produit Lumina (partenaire tiers) ; Lumina gère la **données/traçabilité** autour.
