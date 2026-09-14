# Plan de deep research — Grandes églises × Lumina

> Objectif : cartographier **tout ce qu'une grande église gère réellement**, vérifier
> si **Lumina** permet de le gérer, et en déduire les **features / capabilities à proposer**.
> Ce document est le *plan* de recherche. Les livrables (constats, matrice d'écart,
> roadmap) seront produits par phases (Phase 1 → 3, ci-dessous).

---

## 0. Hypothèses de cadrage

- **"Grande église"** = congrégations de taille significative : mega-églises (≥ 10 000
  fidèles), grandes églises (1 000–10 000) et structures multi-campuses / dénomination.
  Contexte ancré sur **MFE-JC** (évangélique / Afrique) mais conçu pour un noyau générique
  (églises, ONG, écoles, entreprises).
- Lumina est **local-first** (IndexedDB) + **sync Supabase** + **RBAC multi-org (fédération)**.
  Le noyau actuel est très **finance/tresorerie** ; membres/programmes sont légers.
- Toute proposition doit respecter : montants en centimes, transaction approuvée immuable,
  workflow DRAFT→PENDING→APPROVED|REJECTED, data model Postgres + PowerSync.

---

## 1. Baseline — ce que Lumina sait déjà faire (référence de la matrice d'écart)

| Domaine | Surface Lumina actuelle | Maturité |
|---|---|---|
| Trésorerie / finances | transactions, caisses (principale + groupe), versement, audit immuable, centimes | ✅ solide |
| Catégories | 9 catégories fixes (dîme, offrande, salaire pasteur, mission, aumône…) | ✅ (statique) |
| Budget / bilan | Bilan par période (`/balance`) | ⚠️ partiel (pas de budget par département) |
| Rapports | `/reports` + report builder | ⚠️ inachevé (constat connu) |
| Archives / docs | bucket `documents` (archives, expense_proofs, logos), upload | ✅ |
| Audit / traçabilité | `audit_entries`, `/trace`, workflow immuable | ✅ |
| Groupes | 5 groupes (diacres, jeunesse, dames, messieurs, chorale) + caisse par groupe | ⚠️ statique |
| Membres | `/members`, `/membres-en-avance`, `profiles` (RBAC) | ⚠️ léger (pas de CRM cycle de vie) |
| Cultes / cotisations | `/cotisations` | ⚠️ léger |
| Événements | `/events`, `/event/new`, `/event/:id` | ⚠️ léger |
| Notifications | capability `notification` | ⚠️ sans vue UI |
| Multi-org / fédération | edge `create_org`, RBAC grants, React Flow tree, invitations | ✅ (bootstrap) |
| Formulaires | `/forms` | ⚠️ |
| Workflow / policy / resource / security | capabilities de base | ✅ noyau générique |

---

## 2. Axes de recherche (workstreams)

Chaque axe se termine par : (a) constats sourcés, (b) verdict Lumina
(✅ / ⚠️ / ❌), (c) propositions de features/capabilities avec priorité + modèle de données.

### A. Membres & cycle de vie (CRM)
Famille, assistants **par culte / par campus**, entonnoir (visiteur → inscrit → membre),
baptêmes, mariages, décès, diaconats/conseils, équipes de service, staff/volontaires.
*Sources : Planning Center, Breeze, Gapp, Tithe — modules membres ; études sur le suivi pastora-l.*

### B. Cultes & programmes (ministères)
Multi-campuses, planning des services, **planification liturgique** (versions de chants,
chorus), archivage des prédications/sujets, intervenants invités, programmes spéciaux
(crucifixion, récolte, conférence). *Sources : Planning Center Platform, Proclaim, C2.*

### C. Gouvernance & décisionnel
Conseil presbytéral/synodal, AG, **comptes-rendus & résolutions**, statuts/règlement intérieur,
commissions, registre des décisions. *Sources : statuts de dénominations, bonnes pratiques
gouvernance d'église, logiciel de governance (Concilio).*

### D. Finances avancées
Budget **par département/centre de coût**, prévision de trésorerie, multi-devises,
**salaire staff + cotisations sociales**, comptes à payer/recevoir, **immobilisations**
(biens, véhicules, mobilier), **rapprochement bancaire**, rapports au conseil,
**reçus fiscaux** (déductibilité des dons). *Sources : Churcher, Mergo, QuickBooks Church.*

### E. Donations & campagnes
Campagnes de collecte, **engagements (pledges)**, dons récurrents, gestion des donateurs,
merci, rapport de dons par fonds/campagne/ministère. *Sources : Tithely, Tithe, Giving 360.*

### F. Missions & projets spéciaux
Voyages missionnaires, aide humanitaire, fonds de construction, budgets de projets
(chantier), virements aux missions. *Sources : Gapp/Mergo — grants & special programs.*

### G. Logistique & ressources (assets & facilities)
Capacité des locaux, salles, **inventaire matériel** (audio, instruments, véhicules),
maintenance, réservation. *Sources : outils de facility management, ChurchAssets.*

### H. Communication
Annonces, newsletter, **annuaire membres** (vie privée), messagerie / SMS / Push
(Lumina a `notification` mais pas de vue), contenus réseaux. *Sources : Planning Center,
Cherch, eDministry.*

### I. Volontariat & équipes (people-ops)
Planning volontaires, roster des équipes ministérielles, formation, certification,
onboarding de nouveaux responsables, absences, **rotations d'équipe de service**.
*Sources : Planning Center Team Management.*

### J. Jeunesse & familles
Programmes enfants/adolescents (Lumina a « jeunesse »), crèche, événements jeunes,
suivi familles. *Sources : outils youth (i-Connect, eDministry).*

### K. Éducation & discipulat
Études bibliques, discipulat, écoles/seminaires, certifications. *Sources : formations
dénominationnelles.*

### L. Suivi pastoral & santé
Soin pastoral, counseling, aumônerie (Lumina a la catégorie « aumône »), visite malades,
ministère santé. *Sources : études de pastorat.*

### M. Archives & conformité légale
Rétention documentaire, conformité statutaire, déclarations aux autorités (contexte
DRC/Congo si applicable). *Sources : charters dénominationnels.*

### N. Multi-campuses / fédération
Plusieurs campus, associations d'églises, dénomination ; **partage des données** entre
campus. *Lien direct : capability `federation` + React Flow de Lumina.*

---

## 3. Méthodologie d'exécution (avec les outils dispo)

- **Phase 1 — Recherche secondaire** (agents web) : via **Exa** (`web_search_exa` /
  `web_fetch_exa`) — matrice de features des CMS d'églises (Planning Center, Breeze, Gapp,
  Mergo, Tithe, Cherubim, Churcher, Concilio), whitepapers megachurch, rapports publics de
  grandes congrégations. → produit la **matrice d'écart v1** (table §4).
- **Phase 2 — Recherche primaire** (optionnel) : interviews de trésoriers/pasteurs de grandes
  églises (ou proxies : comptes-rendus, forums, études de cas). Affine et pondère la v1.
- **Phase 3 — Conception des propositions** : pour chaque ❌/⚠️ prioritaire : design de
  feature + **modèle de données SQL prêt à exécuter** (Postgres + PowerSync + RLS + grants)
  + **capability** (même structure que `src/capabilities/*`) + estimation d'effort.

Chaque phase dépose ses constats sous `docs/deep-research/findings/<axe>.md` puis met à jour
la matrice maîtresse `docs/deep-research/gap-matrix.md`.

---

## 4. Modèle de la matrice d'écart (gap-matrix)

Colonne par ex. `gap-matrix.md` :

| Domaine | Besoin (grande église) | Statut Lumina | Proposal feature/capability | Priorité | Effort | Modèle de données (tables) |
|---|---|---|---|---|---|---|
| D | Budget par centre de coûts | ❌ | `budgets` (dept, période, prévu/réel) | P0 | M | `budgets`, `budget_lines` |
| E | Engagements de dons (pledges) | ❌ | capability `giving` : pledges + dons récurrents | P0 | L | `pledges`, `giving_campaigns` |
| H | Messagerie / anons | ⚠️ | activer la cap. `notification` + vue UI | P1 | M | `notifications` (locale+sync) |
| I | Rotations équipe de service | ❌ | capability `teams` + planning | P1 | M | `teams`, `team_shifts` |
| B | Planification liturgique | ❌ | module programme + archive prédications | P2 | L | `services`, `worship_items` |

Priorités : **P0** = indispensable pour une grande église ; **P1** = fort à-fort ; **P2** = plus tard.

---

## 5. Livrables attendus

1. `docs/deep-research/findings/<A..N>.md` — constats sourcés par axe.
2. `docs/deep-research/gap-matrix.md` — matrice maîtresse (table §4).
3. **Roadmap priorisée** (P0→P2) dans `docs/deep-research/roadmap.md`.
4. Pour chaque P0/P1 : **SQL prêt à exécuter** (Postgres + PowerSync + RLS + grants) et
   **design de capability** (même squelette que `src/capabilities/*`).
5. Mise à jour de `AI_RULES.md` (nouvelles tables / capabilities) une fois validé.

---

## 6. Séquencement & critères de « suffisant »

- **Maintenant (Phase 0)** : ce plan + verrouillage du périmètre (questions §7).
- **Phase 1** (agents Exa) : couvert au moins les axes **A, B, D, E, H, I, N** (les plus
  discriminants) → matrice v1 complète sur ces axes.
- **Phase 3** : chaque proposition P0 a un design de données + capability ; la roadmap est
  approuvée par l'utilisateur.

**Acceptation** : matrice couvre tous les axes prioritaires ; chaque P0 a design de données
+ capability ; roadmap approuvée.

---

## 7. Choix de périmètre à valider

1. **Ancrage** : mega-églises mondiales, grandes églises évangéliques/africaines, ou le
   contexte précis MFE-JC ? (influe les axes prioritaires)
2. **Profondeur** : recherche **secondaire uniquement** (CMS + études) ou inclure
   **recherche primaire** (interviews) ?
3. **Axes prioritaires Phase 1** : tous (A–N) ou sous-ensemble (ex. Finance+Membres+Programmes) ?
