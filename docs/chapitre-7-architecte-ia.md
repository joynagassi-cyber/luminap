# Chapitre 7 — L'Architecte IA : Quand le Codeur Meurt, l'Architecte Naît

> *On ne devient pas architecte parce qu'on sait mieux construire.
> On devient architecte parce qu'on a compris que construire sansArchitecture, c'est ruiner avant même d'avoir posé la première pierre.*

---

## 7.1 Le Grand Renversement

Pendant des décennies, le développement logiciel a obéi à un modèle instinctif :

*« Je vois un problème, j'écris du code, je teste, je corrige. »*

Le développeur était le héros. Celui qui tapait, qui débogulait, qui faisait fonctionner. Sa valeur était mesurée en lignes de code, en heures passées à chercher pourquoi `undefined is not a function`.

Aujourd'hui, ce modèle est mort.

Pas parce que le code a disparu. Mais parce que **écrire du code n'est plus l'activité à plus haute valeur ajoutée**. L'IA peut écrire du code — vite, bien, sans fatigue. Ce qu'elle ne peut pas faire, c'est *décider* quel code écrire, pourquoi, et dans quelle architecture il tiendra quand l'application grandira.

C'est ici que naît un nouveau profil : **l'Architecte IA**.

L'Architecte IA n'est pas un développeur qui a appris à utiliser ChatGPT. C'est un penseur qui utilise l'IA comme bras exécutif. Il ne tappe pas. Il *conçoit*. Il ne corrige pas des bugs. Il *anticipe* les ruptures. Il ne demande pas « comment faire ça ? ». Il demande « devons-nous le faire, et si oui, comment ça tiendra dans dix mois ? ».

Dans ce chapitre, nous allons vivre ce processus complet à travers un projet réel : **Lumina**, une application de gestion financière pour églises et organisations communautaires en Afrique francophone. Nous verrons comment on passe de « j'ai une idée » à « j'ai une architecture que je peux confier à un agent », en passant par l'analyse, la cartographie, le pré-mortem et la décision de migration.

---

## 7.2 Ce Qui S'est Passé (Et Pourquoi J'aurais Pu Arrêter)

Je travaillais sur Lumina. L'application fonctionnait. Les fonctionnalités étaient là. J'avais une session Claude Code en cours, et j'étais à un point où j'aurais pu m'arrêter.

Le système de **cotisations** fonctionnait. Les **transactions** étaient validées. Le **RBAC** (contrôle d'accès par rôle) existait — sous forme de stub, soit dit en passant. Le CRUD des membres, groupes et événements tournait.

Mais j'avais senti un malaise. Un sentiment que j'avais déjà eu avec d'autres projets : *« On a construit beaucoup de choses, mais est-ce que ça tient debout ? Est-ce que ça tient quand on grandit ? Est-ce qu'on sait exactement ce que chaque bout de code fait, et pourquoi il fait ça ? »*

Plutôt que de continuer à empiler des features, j'ai pris une décision contre-intuitive pour un développeur : **j'ai arrêté de coder**.

J'ai lancé quatre agents d'analyse en parallèle. J'ai demandé à chacun de plonger dans une dimension du codebase — le schéma de base de données, la logique métier, les pages frontend, les modèles organisationnels. J'ai demandé qu'on me produise une cartographie complète : quelles tables existent, quelles règles sont codées, quelles fonctionnalités sont implémentées, lesquelles sont incomplètes, lesquelles sont absentes.

Le résultat ? Une analyse de plus de 3 000 lignes qui a révélé des écarts entre ce que le code *disait* faire et ce qu'il *faisait* vraiment.

C'est là que j'ai compris : **l'Architecte IA ne commence pas par coder. Il commence par comprendre.**

---

## 7.3 La Première Leçon : Avant de Créer, Cartographier

### Le piége du « j'ai une idée, codeons »

Quand on demande à une IA de « créer une fonctionnalité », elle code. Elle crée des fichiers, elle écrit des composants, elle connecte des appels API. En quinze minutes, elle a produit plus de code que moi en quinze jours.

Mais le code produit est souvent *superficiellement correct*. Il fait ce qu'on lui a demandé de faire. Il ne fait pas ce qu'on *aurait dû* lui demander.

Dans le cas de Lumina, j'avais identifié cinq problèmes majeurs avant même de toucher une ligne de code :

**Problème 1 — Le RBAC était un stub**

Le fichier `src/lib/rbac.ts` contenait une fonction `checkPermission()` qui retournait **toujours `true`**. C'était un placeholder marqué « phase mono-église ». Mais la matrice de permissions existait déjà dans le code — `PERMISSION_MATRIX` — avec six rôles et leurs droits associés. Le système était *déclaré* mais pas *activé*. C'était comme avoir un plan de maison sans fondations.

**Problème 2 — Le calcul de retards existait mais n'était pas exposé**

La fonction `calculerNombreRetards()` dans `cotisation-logic.ts` calculait correctement le nombre de cultes non payés par un membre. Mais cette fonction n'était utilisée nulle part dans l'interface. La logique métier existait, mais le produit ne la montrait pas. C'était un outil sans visage.

**Problème 3 — « org-1 » était codé en dur partout**

J'ai trouvé `orgId: 'org-1'` répété dans des dizaines d'endroits : le store Zustand, les pages, les migrations, les types. L'application prétendait supporter plusieurs organisations, mais le code ne le pouvait pas. Chaque migration de multi-org aurait nécessité une chasse au trésor dans 40 fichiers.

**Problème 4 — La hiérarchie des groupes était modélisée mais pas visualisée**

La table `groups` avait une colonne `parent_group_id` qui créait une arborescence. La table `group_memberships` liait membres et groupes. Mais l'interface ne montrait qu'une liste plate. La structure existait en base mais pas dans l'expérience utilisateur.

**Problème 5 — Les versements n'avaient pas de workflow d'approbation**

Contrairement aux transactions (qui passent par DRAFT → PENDING → APPROVED), les versements étaient approuvés automatiquement. Il n'y avait aucun contrôle intermédiaire. C'était une incohérence dans un système qui prônait la traçabilité financière.

Chaque problème identifié a exigé une décision architecturale avant toute modification du code. J'aurais pu corriger le RBAC en cinq minutes — remplacer `return true` par un vrai check. Mais j'ai refusé. Parce que changer une ligne sans comprendre l'impact sur les 38 pages, les 22 tables et les 15 types de rôles, c'est risquer de casser quelque chose qu'on ne voit pas.

---

## 7.4 L'Art du Pré-Mortem : Penser la Défaite Avant la Victoire

Le pré-mortem est une technique issue de la gestion de projet et de la psychologie décisionnelle. Au lieu de demander *« Qu'est-ce qui pourrait mal se passer ? »* (ce qui tend à produire des réponses superficielles), on demande :

> *« Imaginons que ce projet a échoué dans six mois. Quelles ont été les causes ? »*

Appliqué à Lumina, le pré-mortem a produit des scénarios que je n'avais pas envisagés :

**Scénario 1 — La migration multi-org détruit les données existantes**

Si je décidais de remplacer `'org-1'` par un vrai système multi-org, chaque transaction, chaque cotisation, chaque événement aurait besoin d'un `org_id` valide. Les données produites en phase mono-org deviendraient instantanément incompatibles. Le pré-mortem m'a forcé à concevoir une migration en deux phases : d'abord ajouter le champ, ensuite peupler les données existantes, et seulement après activer le filtrage.

**Scénario 2 — Le RBAC réel bloque les utilisateurs existants**

Actuellement, `checkPermission()` retourne `true` pour tout le monde. Si je l'active telle quelle avec la matrice existante, tous les utilisateurs deviendront `TREASURIER` par défaut (c'est le rôle par défaut dans le store). Les pasteurs ne pourront rien approuver, les secrétaires ne pourront rien créer. L'application deviendrait *moins* fonctionnelle, pas plus. Le pré-mortem m'a contraint à produire d'abord une migration des rôles existants vers le nouveau système.

**Scénario 3 — L'analyse architecturale elle-même devient un produit secondaire**

En cartographiant le code pour le livre, j'ai produit des documents qui ont révélé des problèmes que personne n'avait signalés. Le véritable livrable n'était pas l'analyse — c'était la *prise de conscience* que le code existant contenait des contradictions internes. Le pré-mortem m'a appris que l'acte même d'analyser un système avant de le modifier est une forme de garantie de qualité.

---

## 7.5 La Cartographie : Voir Avant de Toucher

Ce que j'ai fait avec les quatre agents d'analyse, c'est ce que tout architecte IA devrait faire avant de modifier le moindre fichier : **produire une cartographie des responsabilités**.

### 7.5.1 Ce que la cartographie révèle

En analysant les 39 migrations Supabase, j'ai découvert que Lumina comportait **22 tables** mais **deux modèles organisationnels coexistants** :

- L'ancien modèle (`org_units` + `caisses`)
- Le nouveau modèle canonique (`groups` + `accounts` + `group_memberships`)

Les deux coexistaient parce que la migration canonique (migration 0023) avait été ajoutée *après* que le code utilisait déjà les anciennes tables. Le code frontend faisait des requêtes sur les deux. Les deux schémas Pointaient vers la même donnée.

Cela signifiait que toute modification du modèle organisationnel devait toucher **deux fois plus d'endroits** que prévu. Sans la cartographie, j'aurais modifié `groups` et oublié `org_units`, créant une incohérence silencieuse.

### 7.5.2 Ce que la cartographie cache

La cartographie a aussi révélé des **incohérences entre les types TypeScript et la réalité runtime** :

- Le type `Role` dans `src/types/index.ts` définissait 6 rôles
- La matrice `PERMISSION_MATRIX` dans `rbac.ts` utilisait les mêmes 6 rôles
- Mais la page `RoleSelection.tsx` en affichait 6 aussi
- Et la page `Login.tsx` en affichait encore 6... mais différents (pas toujours les mêmes labels)

Les types, la logique et l'interface n'étaient pas synchronisés. Changer un rôle dans l'un des trois endroits cassait les deux autres. Sans cartographie, cette dérive est invisible jusqu'au moment où l'utilisateur clique sur un bouton qui n'existe pas.

### 7.5.3 Le principe fondateur

> *Avant de modifier le code, produire une cartographie des responsabilités.
> Chaque ligne de code doit avoir un propriétaire sémantique clair.
> S'il n'y a pas de propriétaire, le code est déjà mort — il attend juste qu'on le sache.*

---

## 7.6 Le Choix Architectural : RBAC ou Nothing

Revenons au problème central. Le RBAC de Lumina était un stub. J'avais deux options :

**Option A — Implémenter le RBAC tel quel**

Remplacer `return true` par un vrai check utilisant `PERMISSION_MATRIX`. Cinq lignes de code. Quinze minutes.

Mais la matrice couvrait 6 rôles. L'interface utilisait 6 rôles. Le type `Role` en définit 6. Mais l'église *réelle* a beaucoup plus de rôles : pasteurs associés, pasteurs de jeunesse, anciens, diacres, responsables de départements, responsables de groupe, bénévoles, membres simples.

Implémenter le RBAC avec seulement 6 rôles, c'était construire les fondations d'une maison avec seulement 6 pièces alors que la famille en a 20.

**Option B — Redéfinir le système de rôles avant de coder**

Analyser quels rôles une église fonctionne réellement. Mapper chaque rôle aux permissions réelles. Déterminer la hiérarchie. Produire un nouveau type `Role` complet. Ensuite, seulement, implémenter le RBAC.

J'ai choisi l'Option B. Pas parce que c'était plus « pur ». Parce que c'était **moins risqué**.

Implémenter un RBAC incomplet, c'est créer l'illusion de sécurité. Les développeurs croiraient que les permissions sont contrôlées alors qu'elles le sont partiellement. Un secretaria adjoint pourrait accéder à des données qu'il ne devrait pas voir. Un membre pourrait modifier des transactions. L'application semblerait sécurisée alors qu'elle ne l'est pas.

### La décision architecturale

J'ai défini 14 rôles, organisés en 4 niveaux hiérarchiques :

**Niveau Spirituel (100-70)**
- Pasteur Principal : accès total, y compris admin
- Ancien : approuve les transactions, gère les groupes
- Pasteur Associé : lit et approuve, pas de suppression
- Pasteur Jeunesse : lecture et validation limitée
- Diacre : lecture et approbation, pas de gestion

**Niveau Administratif (45-40)**
- Secrétaire : CRUD événements, gestion membres
- Secrétaire Adjoint : création et lecture seulement

**Niveau Financier (55-35)**
- Trésorier : contrôle total des finances
- Trésorier Adjoint : création et approbation
- Comptable : lecture seule, rapports et exports

**Niveau Communautaire (30-10)**
- Responsable Département : gestion de son département
- Responsable Groupe : gestion de son groupe
- Bénévole : lecture seulement
- Membre : lecture des événements uniquement

Chaque rôle a une matrice de permissions explicite. Chaque permission est un string (`resource:action`). Chaque action est testable individuellement.

---

## 7.7 La Suppression des Retards : Quand Moins est Plus

Un des résultats de l'analyse a été la découverte du système de **calcul de retards**. La fonction `calculerNombreRetards()` existait dans `cotisation-logic.ts`. Elle était importée dans `MembreDetail.tsx`. Elle affichait un compteur « Retards » à côté des « Cultes », « Absences » et « Dons ».

L'utilisateur a demandé sa suppression. Pas parce qu'elle était buggy. Pas parce qu'elle consommait trop de ressources. Mais parce que **ce concept n'avait pas sa place dans le produit**.

C'est une leçon importante pour l'Architecte IA : **savoir supprimer est aussi important que savoir créer**.

La suppression a requis :

1. Identifier tous les appels à `calculerNombreRetards()` et `calculerMontantDu()`
2. Supprimer les fonctions de `cotisation-logic.ts`
3. Retirer l'import et l'affichage dans `MembreDetail.tsx`
4. Réorganiser la grille de stats de 4 colonnes à 3 colonnes
5. Vérifier qu'aucune autre référence n'existait ailleurs

En tout, 5 fichiers touchés. 3 fonctions supprimées. 12 lignes d'interface retirées. Le résultat : un produit plus simple, plus focalisé, sans fonctionnalité « zombie » qui traîne.

---

## 7.8 La Migration Progressive : La Philosophie Capability-First

Avant de terminer, je dois aborder la décision la plus importante du projet : la migration vers une architecture **Capability-First**.

L'idée est simple : au lieu de refondre Lumina d'un coup, on extrait progressivement chaque domaine en une **Capability** — une brique autonome avec un contrat clair, un adapter qui réutilise le code existant, et des tests de caractérisation qui garantissent que rien ne change.

### Les Capability Cibles Identifiées

| Capability | Domaine | Adapter existant | Risque |
|---|---|---|---|
| **Identity** | Membres, authentification | `members` table | Faible — table existante, pas de relations critiques |
| **Organization** | Groupes, hiérarchie | `groups` + `org_units` | Moyen — double modèle à consolider |
| **Resource** | Transactions, comptes | `transactions` + `accounts` | Faible — règles métier bien isolées |
| **Workflow** | Approbations, versements | `transactions` + `versements` | Moyen — workflow critique à préserver |
| **Policy** | RBAC, permissions | `rbac.ts` (stub) | Élevé — actuellement inopérant |
| **Notification** | Alertes, push | `notifications` table | Faible — découplé du core |
| **Reporting** | Rapports, exports | `reporting.ts` + `export.ts` | Faible — logique pure, sans état |
| **Audit** | Traçabilité | `audit_entries` table | Faible — lecture seule |
| **Cotisation** | Cultes, paiements | `cotisations` + `events` | Moyen — règle métier complexe (30j, avances) |
| **Forms** | Champs personnalisés | `form_definitions` + `custom_fields` | Faible — domaine autonome |

### La Règle d'Or de la Migration

> *Ne crée aucune capability tant que tu n'as pas produit :
> 1. Un contrat d'interface minimal
> 2. Un adapter qui réutilise l'implémentation existante
> 3. Un test de caractérisation qui prouve que le comportement ne change pas
> 4. Une décision documentée sur ce qui reste legacy et pourquoi*

Chaque capability commence par un **contrat**, pas par une implémentation. Le contrat dit *« ceci est ce que je fais »*. L'adapter dit *« voici comment je fais avec le code existant »*. Le test dit *« voici la preuve que je ne casse rien »*.

---

## 7.9 Le Rôle de l'Architecte IA dans la Pratique

Revenons à l'essentiel. Qu'est-ce qu'un Architecte IA fait, concrètement, dans une session de développement ?

Voici le processus que j'ai suivi pour Lumina, étape par étape :

### Étape 1 — Questions, pas commandes

J'ai commencé par poser des questions, pas par donner des ordres :
- *« Quels types d'organisations Lumina supporte-t-elle ? »*
- *« Quelles sont les règles métier critiques qui ne doivent jamais être rompues ? »*
- *« Quelles fonctionnalités sont complètes, lesquelles sont partielles, lesquelles sont absentes ? »*

Chaque question a déclenché une analyse approfondie. Chaque réponse a révélé un nouvel écart entre le code et la réalité.

### Étape 2 — Cartographie en parallèle

J'ai lancé quatre agents d'analyse simultanément, chacun sur une dimension différente :
- Schéma de base de données (39 migrations, 22 tables)
- Logique métier (11 fichiers lib)
- Pages et features (38 pages)
- Modèles organisationnels (13 migrations ciblées)

Le parallélisme n'était pas une optimisation — c'était une **nécessité épistémique**. Aucune analyse individuelle n'aurait donné une vue complète. C'est la superposition des quatre perspectives qui a révélé les incohérences.

### Étape 3 — Synthèse et prise de décision

À partir de la cartographie, j'ai produit un rapport structuré en quatre parties :
1. **Ce qui existe** — inventory complet
2. **Ce qui manque** — gaps identifiés
3. **Ce qui est cassé** — incohérences trouvées
4. **Ce qu'il faut faire** — Priorités avec justification

Ce rapport a servi de base à toutes les décisions suivantes.

### Étape 4 — Exécution ciblée

Seulement après la cartographie et la synthèse, j'ai commencé à modifier le code. Et les modifications ont été **minimales et ciblées** :
- Suppression de 2 fonctions de retard (cotisation-logic.ts)
- Retrait de l'affichage des retards (MembreDetail.tsx)
- Extension du type `Role` (types/index.ts)

Rien de plus. Pas de réécriture. Pas de refactor global. Juste les changements strictement nécessaires, validés par la cartographie.

---

## 7.10 Ce Que l'IA Ne Remplace Pas

Je termine ce chapitre avec ce que je considère comme la vérité la plus importante :

**L'IA ne remplace pas la pensée architecturale. Elle la rend plus critique que jamais.**

Quand un développeur écrvait du code, sa valeur était dans sa capacité à *produire*. Aujourd'hui, produire du code ne vaut plus rien — l'IA le fait mieux, plus vite, sans erreur.

La valeur humaine réside dans ce que l'IA ne peut pas faire :
- **Dé cider** quel problème mérite d'être résolu
- **Anticiper** les conséquences d'une décision sur l'ensemble du système
- **Préférer** la simplicité à la sophistication
- **Renoncer** à une fonctionnalité parce qu'elle ne sert pas le produit
- **Voir** l'architecture comme un tout, pas comme une somme de morceaux

L'Architecte IA est celui qui demande *« pourquoi ? »* avant *« comment ? »*. Celui qui produit une cartographie avant de toucher au code. Celui qui comprend que le meilleur code est celui qu'on n'a pas écrit.

Dans le cas de Lumina, la décision d'arrêter de coder pour analyser d'abord a sauvé le projet de plusieurs erreurs coûteuses. La suppression du système de retards, bien que simple, a exigé une analyse préalable pour comprendre son impact. La refonte du RBAC, bien que technique, a nécessité une vision des rôles ecclésiaux réels.

Chacune de ces décisions aurait été mauvaise prise en mode « code d'abord, réfléchis ensuite ». Prise en mode « réfléchis d'abord, code ensuite », elles sont devenues des améliorations réelles.

---

## 7.11 Les Cinq Commandements de l'Architecte IA

Voici les principes que j'ai tirés de cette expérience, et que je propose comme fondements d'une nouvelle pratique :

### I. Cartographie avant modification

Avant de toucher une ligne de code, produire une cartographie complète du système existant. Connaître chaque table, chaque fonction, chaque import. Sans cartographie, on modifie dans l'aveugle.

### II. Pré-mortem avant production

Avant de déployer, imaginer l'échec. Qu'est-ce qui pourrait casser ? Quels sont les scénarios de défaite ? Le pré-mortem transforme l'anxiété vague en risques identifiables et gérables.

### III. Contrat avant implémentation

Chaque capability, chaque module, chaque service doit commencer par un contrat clair : *« ceci est ce que je fais, voici mes entrées, voici mes sorties »* — avant même de savoir comment je le fais.

### IV. Migration progressive, jamais révolution

Ne jamais tout refondre d'un coup. Extraire par brique, adapter l'ancien vers le nouveau, valider à chaque étape. La migration est un processus, pas un événement.

### V. Suppression comme acte architectural

Retirer du code est aussi important que d'en ajouter. Une fonctionnalité zombie, un hardcode oublié, un type non synchronisé — tout cela est de la dette architecturale. La nettoyer est un acte de discipline, pas de modestie.

---

*Le prochain chapitre explorera en détail la construction des Capability Contracts — comment écrire des interfaces minimales qui permettent la migration progressive sans casser l'existant.*
