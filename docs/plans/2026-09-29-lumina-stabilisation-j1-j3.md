# Lumina — Stabilisation J1-J3 (3 jours)

> Plan agentique sur 3 jours, piloté par **TickTick** (source de vérité du planning).
> Chaque jour = 5-6 étapes atomiques (E0-E14), une PR par étape, un bilan par jour.
> Dates (fuseau Africa/Porto-Novo) : **J1 = 30/09/2026**, **J2 = 01/10/2026**, **J3 = 02/10/2026**.

## Règles non négociables

1. Jamais de suppression de donnée utilisateur (DB/IndexedDB/PowerSync) sans migration réversible documentée.
2. `git` : une branche par étape, une PR par étape, rebase systématique avant merge.
3. Zéro `any` dans le code nouveau ; `type-check` + `vitest run` verts sur chaque PR.
4. Les secrets (`.mcp.json`, `.env`, keystores) sont traités comme compromis : audit (E0) puis régénération, jamais de commit d'une valeur réelle.
5. L'agent **n'exécute jamais** les actions de la section « Actions humaines » : il les prépare (checklist + commandes exactes), l'humain les exécute.
6. Chaque fin de phase = CHECKPOINT : arrêt, rapport écrit, attente de la validation.
   **Mettre aussi TickTick à jour à chaque CHECKPOINT** : coche les sous-tâches réellement terminées, ajoute en commentaire le lien de la PR, crée les tâches « Bug » découvertes. Ne coche pas l'étape E0 tant que tous ses critères de sortie ne sont pas validés.
7. **TickTick est la source de vérité du planning.** Utilise UNIQUEMENT les outils du MCP TickTick réellement disponibles : liste-les d'abord, n'invente aucun nom d'outil ni de paramètre. Si le MCP n'est pas connecté ou échoue, **STOP et rapporte-le** : ne simule pas la planification dans un fichier à la place.
8. **TickTick : jamais de suppression de tâche ou de projet existant**, jamais de doublon (cherche avant de créer, complète l'existant si le projet est déjà là).
9. **Ne mets une tâche à « terminée » qu'après validation de son critère de sortie**, jamais par anticipation.

---

## PHASE T — Planification TickTick (à faire en premier)

### T.1 Découverte
- Liste les outils du MCP TickTick disponibles (projets, tâches, sous-tâches, checklists, priorités, tags, dates, sections/colonnes).
- Cherche un projet existant nommé « **Lumina — Stabilisation J1-J3** ». S'il existe, **NE le recrée pas** : complète-le.
- Si un élément demandé n'est pas supporté (ex. checklist dans une sous-tâche, sections), dis lequel et applique la solution de repli indiquée en T.2.

### T.2 Structure à créer

**Projet** : « Lumina — Stabilisation J1-J3 ». Fuseau horaire : **Africa/Porto-Novo**. Vue kanban si possible.

**Sections** (colonnes) : « Jour 1 — Fondations », « Jour 2 — Cœur métier », « Jour 3 — Validation », « Actions humaines », « Bugs (BUGS.md) ».

**Dates** : Jour 1 = **2026-09-30**, Jour 2 = **2026-10-01**, Jour 3 = **2026-10-02**. Chaque étape a une durée estimée. Ne fixe pas d'heure de début, sauf si l'outil l'exige.

**Priorités TickTick** : Haute (5), Moyenne (3), Basse (1).

**Tags** : `lumina`, une étape par tag (`e0` à `e14`), `agent` ou `humain`, `bug`, `p0`/`p1`/`p2`.

**Hiérarchie** : 1 étape = 1 tâche ; ses sous-tâches = tâches enfants ; ses critères de sortie = checklist. Repli si les checklists sont impossibles sur les sous-tâches : mets-les sur la tâche parente.

| Étape | Section | Durée | Priorité | Sous-tâches |
|---|---|---|---|---|
| E0 Hygiène et sécurité | J1 | 1 h | Haute | Phase 0 reconnaissance ; Phase 1 audit secrets ; Phase 2 remédiation ; Phase 3 vérification |
| E1 Pipeline Render | J1 | 1 h 30 | Haute | Build et variables `VITE_*` ; redirection SPA ; URLs Supabase (Site URL, Redirect URLs, `/auth/callback`) ; origines PowerSync ; smoke test de l'URL |
| E2 Audit sans modification | J1 | 1 h 30 | Haute | Cartographie des routes ; sources de données (`useLocalStore` vs PowerSync) ; doublons legacy (`caisses`/`accounts`, `org_units`, `budget_items`) ; `org-1` et rôle par défaut ; RBAC stub `checkPermission` ; produire `BUGS.md` P0/P1/P2 |
| E3 Auth et onboarding | J1 | 3 h | Haute | Inscription email ; connexion ; Google OAuth ; session après rechargement ; déconnexion et « Mes comptes » ; onboarding créateur ; onboarding membre ; démarrage hors ligne ; isolation org A/B |
| E4 Bilan J1 | J1 | 1 h | Moyenne | Rapport ; PR fusionnées ; plan J2 confirmé |
| E5 Transactions, versements, budgets | J2 | 3 h | Haute | Saisie ; approbation/rejet ; annulation miroir ; versement atomique ; budget prévu/réel/écart ; cohérence des soldes |
| E6 Cotisations et cultes | J2 | 1 h 30 | Haute | Création d'un culte ; payé/absent/avance ; verrou 30 jours ; membres en avance |
| E7 Membres, groupes, RBAC/RLS | J2 | 1 h 30 | Moyenne | CRUD membres ; archive/restore ; groupes et caisses ; test rôle MEMBRE vs TRÉSORIER ; audit des mutations |
| E8 Invitations | J2 | 1 h 30 | Moyenne | Émission QR/code/fichier ; claim (4 transports) ; settlement serveur ; gestion/révocation |
| E9 Bilan J2 | J2 | 30 min | Basse | Rapport ; non-régression ; plan J3 confirmé |
| E10 Événements, rapports, exports | J3 | 2 h | Moyenne | Événements et budgets ; report-builder ; bilan ; exports PDF/Excel/CSV |
| E11 Audit, notifications, archives | J3 | 1 h 30 | Moyenne | Trace/timeline ; notifications in-app ; upload documents |
| E12 Parcours A→Z | J3 | 2 h | Haute | Parcours Trésorier ; parcours Secrétaire ; hors ligne ; téléphone réel |
| E13 Test APK | J3 | 1 h | Moyenne | Build APK unique ; push OneSignal ; retour OAuth `lumina://` ; bouton retour ; caméra QR |
| E14 Correctifs et gel | J3 | 1 h 30 | Haute | Derniers bugs ; tag Git ; bugs P2 documentés ; notes de version |

**Checklist standard à ajouter à CHAQUE étape** (tâche parente) :
- [ ] Branche créée
- [ ] PR ouverte
- [ ] Déploiement Render OK
- [ ] Checklist de test passée sur l'URL
- [ ] Critères de sortie validés
- [ ] Verdict noté, PR fusionnée

**Section « Actions humaines »** (tag `humain`, échéance J1, priorité Haute) :
1. Générer un nouveau keystore et le stocker dans les secrets GitHub.
2. Vérifier si l'app est déjà sur Google Play (si oui, demander le reset de la clé d'upload).
3. Régénérer toute clé signalée par l'audit (`.mcp.json`, `.env`).
4. Ajouter l'URL Render dans Supabase et dans les origines PowerSync.
5. Choisir la source de vérité (dossier local ou dépôt distant).

**Section « Bugs »** : vide au départ. Après E2, chaque entrée de `BUGS.md` devient une tâche (tags `bug` + `p0`/`p1`/`p2` + étape liée). Priorité : P0 = Haute (5), P1 = Moyenne (3), P2 = Basse (1). La description contient : route, rôle, attendu, obtenu, cause probable.

### T.3 Validation avant création
Affiche l'arbre complet (projet, sections, tâches, sous-tâches, checklists, priorités, dates, tags) en markdown, puis **CHECKPOINT T : STOP, attends mon « GO »**.

### T.4 Création et contrôle
Après le GO : crée la structure, puis **RELIS-la depuis TickTick** et vérifie les comptes (nombre de tâches, sous-tâches, checklists, priorités, dates). Rapporte les écarts sans les masquer. Donne la liste finale (titre, priorité, échéance) et signale toute limite de l'outil qui a forcé un repli.

---

## PHASE 0 — Reconnaissance et sécurité (avant de toucher quoi que ce soit)

- [ ] État de la branche `main` (ou de travail) : dernière PR merge, tag, version
- [ ] Lecture des docs canoniques : `docs/00-canonical/`, `docs/plans/` récents
- [ ] `git status` propre, build CI verte de référence (baseline à geler)
- [ ] Repérage du `BUGS.md` existant (créer à la racine s'il n'existe pas)

### Audit secrets (règle 4)
- [ ] Grep des secrets dans l'arbre (`*.json`, `*.env*`, keystores, tokens) ; aucun n'est committé réel
- [ ] `.gitignore` couvre `.env.local`, `.mcp.json` (valeurs réelles), `*.keystore`
- [ ] Valeurs compromises → liste de régénération (action humaine n°3)

### CRITÈRES DE SORTIE E0
- [ ] `type-check` + `vitest run` = baseline documentée (0 faille bloquante connue)
- [ ] Baseline CI verte gelée (commit de référence)
- [ ] `BUGS.md` créé/à jour
- [ ] Liste des secrets à régénérer (actions humaines)
- [ ] **Projet TickTick complet, relu et vérifié** (E0 à E14, Actions humaines, dates du 30/09 au 02/10)

## PHASE 1 — Jour 1 : Fondations (E1, E2, E3, E4)

### E1 Pipeline Render (1 h 30)
- Build + variables `VITE_*` ; redirection SPA ; URLs Supabase (Site URL, Redirect URLs, `/auth/callback`) ; origines PowerSync ; smoke test de l'URL déployée.

### E2 Audit sans modification (1 h 30)
- Cartographie des routes ; sources de données (`useLocalStore` vs PowerSync) ; doublons legacy (`caisses`/`accounts`, `org_units`, `budget_items`) ; `org-1` et rôle par défaut ; RBAC stub `checkPermission` ; **produire `BUGS.md` P0/P1/P2**.

### E3 Auth et onboarding (3 h)
- Inscription email ; connexion ; Google OAuth ; session après rechargement ; déconnexion et « Mes comptes » ; onboarding créateur ; onboarding membre ; démarrage hors ligne ; isolation org A/B.

### E4 Bilan J1 (1 h)
- Rapport ; PR fusionnées ; plan J2 confirmé.

## PHASE 2 — Jour 2 : Cœur métier (E5, E6, E7, E8, E9)

### E5 Transactions, versements, budgets (3 h)
- Saisie ; approbation/rejet ; annulation miroir ; versement atomique ; budget prévu/réel/écart ; cohérence des soldes.

### E6 Cotisations et cultes (1 h 30)
- Création d'un culte ; payé/absent/avance ; verrou 30 jours ; membres en avance.

### E7 Membres, groupes, RBAC/RLS (1 h 30)
- CRUD membres ; archive/restore ; groupes et caisses ; test rôle MEMBRE vs TRÉSORIER ; audit des mutations.

### E8 Invitations (1 h 30)
- Émission QR/code/fichier ; claim (4 transports) ; settlement serveur ; gestion/révocation.

### E9 Bilan J2 (30 min)
- Rapport ; non-régression ; plan J3 confirmé.

## PHASE 3 — Jour 3 : Validation (E10, E11, E12, E13, E14)

### E10 Événements, rapports, exports (2 h)
- Événements et budgets ; report-builder ; bilan ; exports PDF/Excel/CSV.

### E11 Audit, notifications, archives (1 h 30)
- Trace/timeline ; notifications in-app ; upload documents.

### E12 Parcours A→Z (2 h)
- Parcours Trésorier ; parcours Secrétaire ; hors ligne ; téléphone réel.

### E13 Test APK (1 h)
- Build APK unique ; push OneSignal ; retour OAuth `lumina://` ; bouton retour ; caméra QR.

### E14 Correctifs et gel (1 h 30)
- Derniers bugs ; tag Git ; bugs P2 documentés ; notes de version.

---

## FORMAT DU RAPPORT FINAL

```
# Lumina J1-J3 — Rapport final
- Date / version / tag
- P0/P1 corrigés (liste, liens de PR)
- P2 documentés (liste, liens)
- Non-régressions: type-check / tests / parcours A→Z
- Limites connues et recommandations
## TickTick : tâches créées/mises à jour/terminées, écarts, limites de l'outil
```
