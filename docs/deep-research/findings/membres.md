# Findings — Axe A : Membres & cycle de vie (CRM)

## Ce que gèrent les grandes églises (sourcé)
Sources : Church Central Cloud, Planning Center *People*.

- **Dossier membre enrichi** : profils avec **champs personnalisés**, liens **famille / foyer** (households).
- **Entonnoir visiteur → membre** : *visitor tracking & follow-up automation*, parcours de **discipulat du nouveau converti** (milestones).
- **Présence & planification** : planning des cultes/services, **check-in QR**, **analytics de présence & tendances**, réservation **salles/locaux**.
- **Équipes** : petits groupes & équipes ministérielles, **scheduling volontaires**.
- **Agrégation** : une vue « activité membre » (présence + dons + bénévolat), **listes par règles** (critères all/any/none, refresh auto), suivi communication.

## Verdict Lumina
| Besoin | Statut Lumina |
|---|---|
| Dossier membre + champs custom | ⚠️ `profiles` léger (RBAC only), pas de CRM |
| Famille / foyer | ❌ |
| Entonnoir visiteur → membre + discipulat | ❌ |
| Présence par culte + analytics | ❌ (`/cotisations` léger, pas de check-in) |
| Salles / réservation | ❌ |
| Équipes / volontariat + planning | ❌ (groupes statiques, pas de roster) |

**Global : ❌ manquant.** Lumina n'a pas de module CRM/cycle de vie.

## Propositions
- P0/P1 — capability **`members`** : `members` (statut visitor/connected/member, champs jsonb), `families`, `ministries`+`team_members`.
- P1 — **`attendance`** : `services` + check-in + analytics.
- P1 — **`journey`** : pipeline visiteur + milestones discipulat.
- P2 — **`scheduling`** : rosters volontaires / équipe de service.
