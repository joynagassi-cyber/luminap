# Plan de fixage et d'amélioration premium

Précédé de : `audit/phase0.md` (baseline mesurée). Branche : `audit/pre-prod`.

> **ARRÊT — j'attends « GO » (ou « GO AUTO ») avant d'implémenter.**
> Toutes les mesures ci-dessous viennent de `audit/phase0.json` /
> `audit/phase0-admin.json` (harnais Playwright reproductible), jamais de l'œil.

## 0. Décisions bloquantes (à trancher avant de coder)

| # | Décision | Pourquoi bloquant | Défaut proposé |
|---|---|---|---|
| D1 | **Thème par défaut** : « Système » (annexe B) vs « Sombre » (aujourd'hui) | Change le rendu des 64 écrans et le PDF | **Système** (annexe B) — je m'y tiens si tu ne réponds pas |
| D2 | **Fixture `docs/tutoriel/donnees-reelles.yaml` absente** | Phase 10 (tutoriel PDF) **ne peut pas démarrer** : je ne dois rien inventer | Fournir le fichier, ou autoriser des données fictives cohérentes |
| D3 | **Maquette `dashboard-MF` absente** (annexe B) | Je ne peux pas reproduire jetons/dimensions « à l'identique » sans la référence | Fournir le PNG/export, ou valider les jetons du tableau B1 seuls |
| D4 | **Écrans à grant serveur** (rôles, invitation emit/manage, units) | Non observables en local (Accès refusé) → F-09 non évaluable | Autoriser un seed avec `org_admins`, ou laisser hors périmètre |
| D5 | **Preuve visuelle** | Je n'ai **aucun outil de vision** | Accepter des preuves DOM/mesures, ou confier la relecture visuelle à un humain |

## 1. Tickets P0 — corrections bloquantes (Release A)

### P0-01 · L0 · F-01 · ID technique dans l'en-tête
- **Écrans** : ~45 (tous ceux avec bandeau d'organisation).
- **Problème mesuré** : `default-org` rendu dans le bandeau (`audit/baseline*/dashboard.txt` l.7). Cause : `organization-context.ts:95` renvoie `label: orgId` ; `TopHeader.tsx:160` rend `ctx.label`.
- **Solution** : `currentContext()` doit renvoyer le **nom** de l'organisation (résolu depuis `lumina-orgs`/`orgData`) ou un libellé neutre (« Votre organisation ») — **jamais** un id. `TopHeader` n'affiche le bandeau que si un nom est résolu.
- **Acceptation (testable)** : sur toutes les routes, le texte du bandeau ne matche ni `default-org`, ni un UUID, ni `__no_org__`. Test unitaire `organization-context.test.ts` + assertion Playwright dans la garde phase 6.
- **Effort** S · **Impact** élevé · **Dép.** D5 · **Risque** faible (le nom est déjà chargé via `useOrganizations`).

### P0-02 · L3 · F-04 · Crash de `/transaction/:id/edit`
- **Écran** : `/transaction/:id/edit` (transaction APPROVED).
- **Problème mesuré** : « Impossible d'afficher cette page » (error boundary) au lieu d'une redirection. `audit/baseline-admin/transaction_demo_tx_1_edit.txt`.
- **Solution** : rendre la garde « APPROVED ⇒ redirection vers `/transaction/:id` » **avant** tout accès qui lève ; ne jamais monter le formulaire pour une transaction non modifiable ; ajouter un état « Cette transaction est approuvée et ne peut plus être modifiée » avec action « Voir le détail ».
- **Acceptation** : visiter `/transaction/:id/edit` d'une APPROVED ne produit **aucune** erreur boundary et affiche soit la redirection, soit le message ; test Playwright.
- **Effort** S · **Impact** élevé · **Dép.** — · **Risque** faible.

### P0-03 · L3/L4 · F-03 · « Groupe introuvable » / « Culte introuvable »
- **Écrans** : `/groups/:id`, `/saisie-rapide/:id`, `/culte/:id` (par extension).
- **Problème mesuré** : « Groupe introuvable » alors que la ligne existe (2 groupes en base). `groups_demo_group_jeunesse.txt`, `saisie_rapide_*.txt`.
- **Solution** : diagnostiquer la requête de lecture (filtre `org_id` / `id` / état de la réplique). Ne pas afficher « introuvable » tant que la réplique n'est pas prête (squelette). Corriger le filtre.
- **Acceptation** : `/groups/demo-group-jeunesse` affiche « Jeunesse » (pas « introuvable ») ; idem culte/saisie-rapide ; test Playwright.
- **Effort** M · **Impact** élevé · **Dép.** — · **Risque** moyen (lecture partagée).

## 2. Tickets P1 — premium à fort impact / faible effort

### P1-01 · L0 · F-02 · Enums bruts
- **Problème mesuré** : `PASTEUR_PRINCIPAL`, `PUBLISHED`, `MONTHLY`, `PENDING` en clair.
- **Cause** : `getRoleLabel()` (`utils.ts:175`) carte dupliquée incomplète ; `Giving.tsx:212`/`GivingCampaign.tsx:280` rendent `p.schedule` brut ; statuts formulaire/campagne sans table.
- **Solution (kit Lane 0)** : **une seule** source `ROLE_LABELS` (`rbac.ts`) ; `getRoleLabel` la réutilise (ou est supprimé) ; ajouter `SCHEDULE_LABELS`, `FORM_STATUS_LABELS`, `CAMPAIGN_STATUS_LABELS`, `INVITATION_STATUS_LABELS`. Lint : interdire le rendu direct d'un `UPPER_SNAKE`.
- **Acceptation** : aucun `[A-Z]{3,}_[A-Z_]+` dans le texte rendu des 64 routes (garde phase 6) ; tests unitaires des tables.
- **Effort** S · **Impact** élevé · **Risque** faible.

### P1-02 · L0 · F-30 · Layout de page unique
- **Problème mesuré** : gap négatif (−44…−126) sur ~40 routes ; **pas de layout partagé** (37 pages ont leur propre `IonHeader`).
- **Solution** : un composant `PageShell` (en-tête 56, bandeau conditionnel, marge 20, padding haut ≤ 16) adopté par toutes les pages ; suppression des `IonHeader` locaux dupliqués.
- **Acceptation** : `0 ≤ gap ≤ 16` sur toutes les routes hors plein cadre, **identique** entre écrans du même type, en 390×844 **et** 360×640 ; garde phase 6 échoue si > 24 px.
- **Effort** L · **Impact** élevé · **Dép.** P0-01 · **Risque** élevé (touche 64 écrans) → à faire en L0 **gelé**.

### P1-03 · L6 · F-22 · Double en-tête
- **Écrans** : `/admin/reports`, `/membre/:id`.
- **Problème mesuré** : 2 `ion-header` (`phase0-admin.json`).
- **Solution** : une seule en-tête par écran (le second est probablement un `IonHeader` local en plus du shell).
- **Acceptation** : `document.querySelectorAll('ion-header, header').length === 1` sur ces routes ; garde phase 6.
- **Effort** S · **Impact** moyen · **Risque** faible.

### P1-04 · L1 · F-11 · « Offline » en anglais
- **Écran** : `/splash`.
- **Solution** : « Hors ligne » (FR) — `Splash.tsx:127`. Vérifier qu'aucun autre libellé EN ne subsiste (`Features & navigation` sur `/settings*`).
- **Acceptation** : aucun `Offline`/`Back`/`Features & navigation` dans le texte rendu ; garde phase 6.
- **Effort** S · **Impact** moyen · **Risque** faible.

### P1-05 · L7 · F-08 · Version applicative absente
- **Écran** : `/settings/about`.
- **Solution** : injecter la version au build (Vite `define` depuis `package.json`) et l'afficher ; jamais « unknown ».
- **Acceptation** : `/settings/about` affiche une version non vide ; test unitaire de l'injection.
- **Effort** S · **Impact** moyen · **Risque** faible.

### P1-06 · L0/L7 · F-01 · Fuites techniques résiduelles
- **Écrans** : `/help`, `/settings/about`, `/settings/health` (`PowerSync`), `/settings/personnalisation` (`bucket « logos »`).
- **Solution** : remplacer par du vocabulaire utilisateur (« mise à jour entre appareils », « vos images »). Lint anti-jargon.
- **Acceptation** : aucun des motifs interdits ; garde phase 6.
- **Effort** S · **Impact** moyen · **Risque** faible.

### P1-07 · L3 · F-05 · Transaction approuvée : affordance
- **Solution** : sur le détail d'une APPROVED, masquer/désactiver l'action « Modifier » et expliquer pourquoi ; l'accès direct à `/edit` redirige (cf. P0-02).
- **Acceptation** : test Playwright : le bouton « Modifier » est absent pour une APPROVED.
- **Effort** S · **Impact** moyen · **Risque** faible.

## 3. Tickets P2 — le reste

| ID | L | Écrans | Problème mesuré | Solution | Acceptation |
|---|---|---|---|---|---|
| P2-01 | L0 | cotisation de groupe | `1 membre(s)` | helper de pluriels | « 1 membre » / « N membres » |
| P2-02 | L3 | `/history` | montants sans devise (`9500000`) | composant `<Money>` | devise sur chaque montant |
| P2-03 | L2 | `/notifications` | « 2 non lus », « il y a environ 5 heures » | helper pluriel + date relative FR | textes corrects |
| P2-04 | L5 | `/forms` | formulaire 0 champ propose « Remplir » | désactiver si 0 champ | bouton désactivé + message |
| P2-05 | L0 | toutes | cibles tactiles < 44 px | jeton d'espacement | mesure script ≥ 44×44 |
| P2-06 | L0 | toutes | squelettes > 150 ms | squelette aux dimensions du bloc | pas de décalage |
| P2-07 | L0 | toutes | thème clair + jetons B1 | fichier de jetons unique | axe-core AA |

## 4. Premium (Phase 9) — validé contre la baseline

- **Jetons de couleur/typo/espacement uniques** (annexe B1) — remplace les couleurs en dur ; lint anti-couleur-en-dur.
- **Thème clair** (annexe B2/B5) — décision D1.
- **Inter embarquée** (`@fontsource`, woff2) — interdit Google Fonts à l'exécution.
- **États par écran** : normal / chargement / vide / erreur / hors ligne (baseline : plusieurs écrans sans état vide).
- **Confirmation ou « Annuler » 5 s** pour suppression/action lourde.
- **Indicateur de synchro par élément** (en attente / synchronisé / conflit).
- **Premiers pas** du dashboard : chaque étape mène à l'écran et se coche seule.

## 5. Idées écartées (sans objet ici)

- Alimenter le Tutoriel intégré depuis le PDF (P2 annexe B) : dépend de D2/D3, reporté.
- Haptique Capacitor : non testable dans cet environnement (pas d'appareil) → laissé en « non vérifié ».

## 6. Ordre d'exécution proposé (si GO)

1. **Lane 0 FONDATIONS** (un seul flux, avant tout parallèle) : kit = `PageShell` (F-30/F-22),
   champ (F-20), formateurs + `<Money>` (F-24/F-25), pluriels (F-26), logo fallback (F-27),
   jetons (F-28), enums→libellés (F-29/F-02), version (F-08), purge fuites (F-01),
   seed réaliste + garde Playwright (phase 6). **Gelé** ensuite.
2. **Lanes 1–7** : je les exécute **séquentiellement** (pas de vrais sous-agents —
   voir §7 de `phase0.md`), une branche `lane/Lx` par lane, `audit/lanes/Lx-rapport.md`.
3. Intégration dans `integration/prod-ready` (L0 puis L1…L7), suite complète après chaque fusion.
4. Phases 6/7 sur l'ensemble → tag **Release A**.
5. Phase 9 (premium) → tag **Release B**.
6. Phase 10 (tutoriel PDF) — **bloquée** par D2/D3.

## 7. Rappel des limites (répété volontairement)

- **Pas de vision** → preuves DOM/mesures, pas de « capture relue ».
- **Pas de sous-agents** → lanes séquentielles, branches listées, jamais « 6 agents lancés ».
- **Fixtures maquette + yaml manquantes** → annexe B « à l'identique » et Phase 10 impossibles tant que non fournies.
