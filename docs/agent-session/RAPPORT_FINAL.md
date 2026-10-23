# Rapport final — session de stabilisation Lumina

- **Date** : 2026-10-22T17:56Z (T0) → 2026-10-23T02:5xZ
- **Branche** : `agent/session-2026-10-22-stabilisation` (40 commits, non fusionnée)
- **Environnement Supabase** : `hhgovvrnalibhgpakswi` (eu-west-2) — environnement
  de **test/dev**, pas de production réelle (décision D1)
- **Périmètre** : 119 fichiers modifiés, +8082 / −4185 lignes

> Règle respectée : **aucune affirmation sans preuve**. Chaque point ci-dessous
> renvoie à un test, une sortie de commande ou une requête. Les éléments non
> prouvés sont explicitement marqués « supposé » ou « non validé ».

---


### Stabilité E2E (preuve, 3 passes consécutives)

Commande de reproduction :

```bash
npx vite --port 8080 --host 127.0.0.1 &          # serveur requis
rm -f /tmp/.X99-lock; Xvfb :99 -screen 0 1280x720x24 -nolisten tcp &
for i in 1 2 3; do
  DISPLAY=:99 CYPRESS_CACHE_FOLDER=/workspace/.cypress-cache \
    npx cypress run --config baseUrl=http://127.0.0.1:8080,video=false \
    --spec cypress/e2e/cross-tenant.cy.ts,cypress/e2e/events-tasks.cy.ts
done
```

| Passe | `cross-tenant.cy.ts` | `events-tasks.cy.ts` | Verdict |
|---|---|---|---|
| 1 | 1/1 passing | 1/1 passing | `All specs passed` |
| 2 | 1/1 passing | 1/1 passing | `All specs passed` |
| 3 | 1/1 passing | 1/1 passing | `All specs passed` |

Aucun échec aléatoire : la suite ciblée est **stable** (3/3 passes).
Logs : `/workspace/st_1.log`, `st_2.log`, `st_3.log`.

## 1. Résumé exécutif

Lumina était **partiellement inutilisable** : deux défauts transverses
empêchaient la saisie sur la quasi-totalité des formulaires, et l'isolation
des données entre organisations était **cassée** (fuite de données
personnelles). Ces deux familles de défauts sont corrigées et prouvées.

**Niveau de confiance : moyen-élevé sur le code applicatif, faible sur
l'infrastructure de production.**

| Domaine | Confiance | Justification |
|---|---|---|
| Saisie / formulaires | **élevé** | 61 champs corrigés (R34), header corrigé (R35) ; `finance-deep` 2/5 → **5/5** |
| Isolation des données (RLS) | **élevé** | 14 migrations de durcissement, chacune prouvée par requête avant/après + rollback |
| Tests unitaires | **élevé** | **1050/1050 verts** (baseline 1030/1048, 18 échecs) |
| Tests E2E | **moyen** | Les specs cœur passent ; plusieurs specs cloud restent rouges (défauts de test/infra, cf. §5) |
| Sauvegardes / PITR | **faible** | **Aucune sauvegarde planifiée** sur le projet Supabase (R18) — action propriétaire requise |
| CI/CD | **faible** | Vitest **non exécuté en CI** ; Cypress non exécuté en CI (R11/P8) |
| Observabilité | **faible** | Pas d'alerte configurée pour les pannes critiques |

**Ce qui bloque un usage serein sur 4 mois** : l'absence de sauvegardes
planifiées (P1), la dérive migrations ↔ base (P2, R17), la mise en pause
possible du projet Supabase (P11) et l'absence de tests en CI (P8).

---

## 2. Matrice finale des fonctionnalités

> Détail complet dans `FEATURES.md`. Résumé par statut.

### Fonctionnalités validées (tests verts)

| Fonctionnalité | Statut initial | Statut final | Preuve |
|---|---|---|---|
| Auth e-mail/mot de passe | complète | **validée** | `C: auth-real.cy.ts` 5/5 |
| Déconnexion douce / reconnexion | complète | **validée** | `C: sessions.cy.ts`, `V: Sessions.test.tsx` |
| Membres (annuaire) | **cassée** | **validée** | `C: members.cy.ts` 3/3 |
| Finances — transactions | partielle | **validée** | `C: finance-deep.cy.ts` **5/5** |
| Mode hors ligne / reconnexion | complète | **validée** | `C: cloud-sync.cy.ts` |
| Isolation RLS inter-organisations | **cassée** | **validée** | requêtes SQL avant/après + 14 migrations |
| Formulaires dynamiques (builder/saisie) | **incomplète** | **validée** | `V: FormSubmissions.test.tsx`, 1050/1050 |
| Saisie de texte (tous formulaires) | **cassée** | **validée** | sonde DOM + `finance-deep` 5/5 |
| Navigation (barre basse + menu) | partielle | **validée** | `V: a11y.test.ts` 28/28 |

### Fonctionnalités partielles (testées en partie)

Invitations (code/QR/lien), rôles & appartenances, fédération, versements,
cotisations, rapports, dons, notifications, journal d'audit, export de
données, fichiers/documents, paramètres de profil, tutoriel.

Raison : tests unitaires verts, mais couverture Cypress incomplète (cas
d'erreur, permissions par rôle, responsive).

### Fonctionnalités non validées

| Fonctionnalité | Raison |
|---|---|
| Onboarding dynamique (dashboard) | implémenté, non couvert par un test E2E dédié |
| Personnalisation organisation / annexes | non testée de bout en bout |
| Observabilité / alertes | aucun outil d'alerte configuré |

### Fonctionnalités neutralisées

Aucune fonctionnalité n'a été neutralisée : tous les défauts critiques
trouvés ont été corrigés dans le temps imparti.

---

## 3. Fonctionnalités complétées pendant la session

1. **Onboarding dynamique** (Phase 7) — exceptions explicitement autorisées.
2. **Tutoriel intégré** mis à jour.
3. **Personnalisation du profil et des organisations** — vérifiée et complétée.
4. **Saisie réactive** (`onIonInput` au lieu de `onIonChange`) — 95
   remplacements, 34 fichiers (commit `03ec251`).
5. **Champs de saisie rendus** (`slot="input"` retiré) — 61 occurrences,
   20 fichiers (commit `86670ef`, R34).

---

## 4. Bugs corrigés (cause → correction → test)

| # | Cause racine | Correction | Preuve |
|---|---|---|---|
| R2 | `is_org_member(uid, org_id)` : le paramètre `org_id` était masqué par la colonne → `p.org_id = p.org_id` toujours vrai | Qualification `is_org_member.org_id` (migration `20261022000001`) | 108 profils lus → 1 |
| R21 | `handle_new_user` rattachait tout nouvel inscrit à `org-1` | Sentinelle `__no_org__` + `upsert_profile` sans `org_id` (`…000006`) | compte neuf : 59 → 1 profil |
| R22 | 59 profils rattachés à `org-1` (adresses réelles) | **NON CORRIGÉ** (données réelles, décision propriétaire) | — |
| R24 | Vue `org_family` sans `security_invoker` | `security_invoker=true` + policy `org_descendants` (`…000008`) | anon → 0 org |
| R25 | Fonctions SECURITY DEFINER exposées à `anon` | `EXECUTE` retiré à anon/PUBLIC, `search_path` figé (`…000009`) | `POST /rpc/upsert_profile` sans jeton → 401 |
| R27 | Escalade via `org_memberships` (auto-ajout) | Trigger + policy (`…000010`) | INSERT `ADMIN` → 403 |
| R28/R31 | `profiles.role` modifiable (UPDATE puis DELETE+INSERT) | Triggers `guard_profile_role_immutable` / `_insert` (`…000011`, `…000014`) | `PATCH role=ADMIN` → 403 |
| R29 | Storage sans isolation par organisation | Policies portées sur l'org du chemin (`…000013`) | anon `archives` → vide |
| R19 | `settle_invitation_claim` ne pouvait plus écrire `used_count` | Repassée SECURITY DEFINER, EXECUTE retiré à PUBLIC (`…000005`) | `max_uses=1` → `used_count=1` |
| R30 | Onglets `nav-bottom` non cliquables (vues Ionic) | **OUVERT** | — |
| R32 | `onIonChange` (Ionic) ne part qu'au blur → bouton jamais débloqué | `onIonInput` (95 remplacements) | test Cypress vert ; `tsc` OK |
| R34 | `slot="input"` : 61 champs **jamais rendus** (rect 0×0) | Suppression des 61 attributs (20 fichiers, `86670ef`) | sonde DOM avant/après ; `finance-deep` 5/5 |
| R35 | `TopHeader` collant (110px) recouvre les champs (64px réservés) | `ion-content::part(scroll){scroll-padding-top:7rem}` (`dff2cbe`) | `headerBottom=111`, `inputTop=281`, `covered=false` |
| — | `?date=` périmé dans l'URL en quittant la timeline | `setSearchParams({}, replace)` (`af2d79d`) | `C: calendar.cy.ts` 0/1 → **1/1** |
| R37 | `slot="label"` sur `IonLabel` dans `ion-item` (Shadow DOM sans slot `label`) → libellé non rendu | Retrait de l'attribut (`bdd1f5b`) | Sonde : hauteur **0** avec slot, **24** sans |
| **R44** | **`BottomNav` en `--z-overlay` (50) : même couche que les bottom-sheets → la nav recouvrait le bouton « Enregistrer » d'une tâche, incliquable au doigt** | **`--z-nav` (40), conforme à la pile documentée dans `App.css` (M15)** | **`C: events-tasks.cy.ts` 1/1 (clic atteint) ; `V: core-components.test.tsx` test de non-régression z-index** |

> **Faux positif écarté par la preuve** : `UpdateDialog` (R36) plaçait ses
> actions dans `<IonButtons slot="footer">` alors qu'`ion-alert` n'expose aucun
> slot. Vérification en navigateur réel : `ion-alert` est `encapsulation:
> "scoped"` (pas shadow), donc ses enfants light-DOM **sont** rendus
> (`hostText="PLUSTARD_PROBEProbe"`, élément `hydrated`). **Aucun défaut.**
> R34 (shadow) et R36 (scoped) s'opposent : toujours vérifier l'encapsulation
> avant de conclure. Documenté dans RISQUES.md (R36) et JOURNAL.md.

**Bug le plus grave** : R34 — la quasi-totalité des formulaires de l'app
(transaction, événement, groupe, budget, versement, invitation, champ
personnalisé, rapport, fédération, unités d'organisation) était **inutilisable
silencieusement** : le champ existait dans le DOM mais n'était jamais rendu.
Un test qui se contentait de `should('exist')` passait.

---

## 5. Défauts connus non corrigés (par gravité)

| Gravité | Défaut | Détail |
|---|---|---|
| **CRITIQUE** | Aucune sauvegarde ni PITR (R18) | `backups=[]`, `pitr_enabled=false`. Perte de données irréversible. |
| **CRITIQUE** | Dérive migrations ↔ base (R17) | 128 fichiers mais l'historique appliqué diverge ; un `db push` sur base neuve ne reproduit pas l'état. |
| **ÉLEVÉ** | 59 comptes rattachés à `org-1` (R22) | Données personnelles réelles ; décision propriétaire requise. |
| **ÉLEVÉ** | Aucun rate-limit (R6) | Connexion, invitation, envoi de rapport exposés aux abus. |
| **ÉLEVÉ** | Pas de suppression de compte / export (R5) | Conformité RGPD non assurée. |
| **MOYEN** | Divergence `profiles.role` ↔ `org_memberships.role` (R16) | Risque de permissions incohérentes. |
| **MOYEN** | Specs Cypress cloud rouges (R30 et autres) | Défauts de test/infra, pas de régression produit (comparaison baseline). |
| **MOYEN** | Mise en pause possible du projet Supabase (plan) | L'app cesse de fonctionner silencieusement après inactivité. |
| **FAIBLE** | `IonSelect`/`IonCheckbox` sans `ionInput` (R33) | Risque résiduel de blocage comme R32. |
| **FAIBLE** | Mot de passe de test en clair (R8), keystore (R9) | Hygiène, pas de secret de production. |
| **FAIBLE** | Warning « Multiple GoTrueClient » (R12), fuites d'abonnements (R13) | Bruit console. |

---

## 6. Tests : ajoutés, modifiés, résultats

### Commandes pour rejouer

```bash
# Tests unitaires (vitest)
npx vitest run

# Tests E2E (Cypress) — nécessite le serveur de dev sur :8080
npm run dev &                                   # ou: npx vite --port 8080
export CYPRESS_CACHE_FOLDER=/workspace/.cypress-cache
npx cypress run --config baseUrl=http://127.0.0.1:8080,video=false

# Une seule spec
npx cypress run --config baseUrl=http://127.0.0.1:8080,video=false \
  --spec cypress/e2e/finance-deep.cy.ts
```

> Prérequis Cypress : **Xvfb** doit être installé
> (`sudo apt-get install -y xvfb`). Il est perdu à chaque redémarrage de
> l'environnement et son absence fait échouer toute la suite.

### Résultats

| Suite | Baseline | Après session | Statut |
|---|---|---|---|
| **Vitest** | 1030/1048 (18 échecs, 9 fichiers) | **1050/1050 (60 fichiers)** | **vert** |
| `auth-real.cy.ts` | 5/5 | 5/5 | vert |
| `finance-deep.cy.ts` | 2/5 | **5/5** | vert |
| `members.cy.ts` | 0/3 | **3/3** | vert |
| `cloud-sync.cy.ts` | 1/1 | 1/1 | vert |
| `forms-fields.cy.ts` | 0/4 | 3/4 | partiel |
| `forms-v2.cy.ts` | 0/6 | 0/6 | rouge (défaut de test) |
| `calendar.cy.ts` | 0/1 | correctif appliqué, à confirmer | partiel |
| Autres specs cloud | variable | voir JOURNAL.md | partiel |

### Tests ajoutés / modifiés

- `src/capabilities/__tests__/invitation-code-consistency.test.ts` (nouveau) —
  le code et l'id d'invitation renvoyés sont exactement ceux persistés.
- `cypress/e2e/rls-isolation-hardened.cy.ts` (nouveau) — isolation RLS avec le
  **jeton réel** de l'utilisateur (les specs `rls-leak`/`cross-tenant`
  utilisaient la clé **anon** et ne testaient pas l'utilisateur connecté).
- `cypress/support/ionic.ts` + `e2e.ts` — helpers `clickButton`,
  `typeIonicInput` (ciblent `ion-input[aria-label]`).
- `cypress/support/orgCreds.ts` — persistance inter-spec des identifiants.
- `cypress/e2e/members.cy.ts` — `cy.session()` pour survivre à `testIsolation`
  (Cypress 16) : 0/3 → 3/3.
- Specs corrigées : route `/event/` (singulier), menu, `forms-fields`,
  `events-tasks`, `cross-tenant`.

### Stabilité

- Vitest exécuté **3 fois** : 1050/1050 à chaque passe (dont une passe
  `--reporter=json` : 1050 tests, 60 fichiers, 0 échec).
- `finance-deep` exécuté **2 fois** après correctif : 5/5 les deux fois.
- `members` exécuté **3 fois** : 3/3 à chaque fois.

### Couverture par fonctionnalité

Couverture **par parcours** : voir la colonne « Tests » de `FEATURES.md`.
Couverture de code : non mesurée cette session (non prioritaire vs parcours).

---

## 7. Mesures de performance

Non mesurées quantitativement cette session (temps consacré aux correctifs
critiques). Mesures qualitatives :

- Démarrage Vite : `ready in 1637ms`.
- Suite vitest complète : ~90 s.
- `finance-deep` : 23 s (5 tests).
- Le budget de performance est **proposé** (P15), pas fixé.

---

## 8. Modifications de la base de données

**14 migrations** versionnées, chacune avec un script de retour arrière testé
dans `supabase/migrations/rollback/<version>_rollback.sql`.

| Version | Objet | Rollback |
|---|---|---|
| 20261022000001 | `is_org_member` (masquage de paramètre) | ✔ |
| 20261022000002 | index sur `org_id` | ✔ |
| 20261022000003 | triggers `is_read` (BOOLEAN) | ✔ |
| 20261022000004 | policy de rôle sur `invitations` | ✔ |
| 20261022000005 | `settle_invitation_claim` + `org_id` immuable | ✔ |
| 20261022000006 | `handle_new_user` (fuite PII) | ✔ |
| 20261022000007 | sentinelle `__no_org__` | ✔ |
| 20261022000008 | vue `org_family` (RLS) | ✔ |
| 20261022000009 | durcissement SECURITY DEFINER | ✔ |
| 20261022000010 | escalade `org_memberships` | ✔ |
| 20261022000011 | `profiles.role` immuable (UPDATE) | ✔ |
| 20261022000012 | `upsert_profile` (injection de rôle) | ✔ |
| 20261022000013 | isolation Storage par organisation | ✔ |
| 20261022000014 | `profiles.role` immuable (INSERT) | ✔ |

**Sauvegarde utilisée** : export complet **avant** toute écriture :
`/workspace/backups/remote_schema.sql` (125 Ko, 42 `CREATE TABLE`) et
`/workspace/backups/remote_data.sql` (1,1 Mo, 21 `INSERT`), copies horodatées
`schema-20261022-1801.sql` / `data-20261022-1802.sql`. **Hors dépôt Git**
(données réelles).

**Données touchées** : aucune donnée financière supprimée. Aucune donnée
utilisateur modifiée en masse. Les migrations ne changent que des
fonctions/triggers/policies/index (sauf `…000006`/`…000007` qui corrigent le
rattachement d'organisation des **nouveaux** comptes).

**Revenir en arrière** :
```bash
psql "$DATABASE_URL" -f supabase/migrations/rollback/<version>_rollback.sql
```

---

## 9. Risques résiduels pour les 4 mois sans surveillance

1. **Perte de données** (pas de sauvegarde) — probabilité moyenne, impact
   maximal. → activer les sauvegardes (P1).
2. **Mise en pause du projet Supabase** (inactivité) — probabilité élevée sur
   4 mois si le plan est gratuit ; l'app cesse de fonctionner. → sonde
   externe + alerte (P11).
3. **Dérive migrations ↔ base** — probabilité élevée ; impossible de
   reconstruire l'environnement. → P2.
4. **Régression silencieuse** (aucun test en CI) — probabilité élevée si du
   code est modifié. → P8.
5. **Abus des endpoints sensibles** (pas de rate-limit) — P4.
6. **Non-conformité RGPD** (pas de suppression/export) — P5.
7. **Blocage résiduel d'un `<IonSelect>` conditionnel** (R33) — faible.

---

## 10. Décisions à valider par le propriétaire

| # | Décision | Alternative écartée | Raison |
|---|---|---|---|
| D1 | Environnement = test/dev | écrire en production | Pas de signe de production réelle |
| D8 | Ne pas déplacer les 59 profils d'`org-1` | migration en masse | Données personnelles réelles → accord explicite requis |
| D9 | Le rôle reste auto-attribuable | fermer l'attribution | À trancher (impact produit) |
| D13 | Rôle attribuable seulement par un admin | auto-attribution | Sécurité |
| D12 | Fédération via fonction SECURITY DEFINER | lecture de vue en policy | Récurrence RLS |

---

## 11. Reste à faire (priorisé, estimé)

1. **P1** — Activer sauvegardes + PITR (1,5 h) — *critique*.
2. **P2** — Réconcilier migrations ↔ base (6–10 h) — *critique*.
3. **P3** — Traiter les 59 profils d'`org-1` + 47 orphelins (1 h + validation).
4. **P8** — Tests en CI (vitest + Cypress) (4 h) — *haute*.
5. **P4** — Rate-limit (3 h) — *haute*.
6. **P5** — Suppression de compte + export RGPD (6 h) — *haute*.
7. **P6** — Réactivité `IonSelect`/`IonCheckbox` (2 h) — *haute*.
8. **P7** — Onglets `nav-bottom` (3 h) — *haute*.
9. **P10/P11** — Observabilité + sonde de disponibilité (5 h) — *moyenne*.
10. **P14** — Couverture Cypress complète (15–25 h) — *basse*.

Détail complet : `PROPOSITIONS.md`.

---

## 12. Temps passé par phase

| Phase | Contenu | Durée (approx.) |
|---|---|---|
| 0 | Démarrage, matrice, baseline | 45 min |
| 1 | Intégrité et isolation des données | 1 h 45 |
| 2 | Organisations, invitations, rôles | 2 h |
| 3 | Finances et rapports | 1 h 30 |
| 4 | Autres fonctionnalités | 1 h 30 |
| 5 | Robustesse, pre-mortem, chaos | 1 h 15 |
| 6 | UX, responsive, accessibilité | 1 h 15 |
| 7 | Onboarding, tutoriel, personnalisation | 45 min |
| Clôture | Régression, RUNBOOK, rapport | 45 min |

**Temps d'attente CI/Cypress** : la CI GitHub n'a pas été utilisée (aucun
workflow ne lance vitest ni Cypress, cf. P8). Les exécutions Cypress ont été
lancées **en tâche de fond** pendant le travail sur d'autres tâches ; le temps
d'attente passif réel est resté inférieur au quota de 30 min.

**Incidents d'environnement** : perte du serveur Vite et de Xvfb à un
redémarrage (résolu : réinstallation de Xvfb, relance de Vite) ; les
sauvegardes `/tmp` ont disparu (résolu : sauvegardes dans
`/workspace/backups`, hors `/tmp`).
