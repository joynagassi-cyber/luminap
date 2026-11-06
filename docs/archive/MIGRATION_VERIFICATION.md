# 🚨 Signalement de Difficulté — Déploiement Migrations Supabase

## Contexte

J'ai implémenté intégralement le système de **cotisations** dans l'application Lumina (fusion du projet Kased). Toute la logique métier, les pages UI, le store, les types et les hooks PowerSync sont codés et fonctionnels en local.

**Objectif du déploiement :** Connecter la base locale PowerSync au backend Supabase cloud afin que les données cotisations soient synchronisées correctement.

## Difficulté rencontrée

| Problème | Détail |
|----------|--------|
| 🔐 Auth Supabase CLI | Le CLI `supabase` retourne une erreur d'authentification — les credentials du fichier `.env` (`mum33#i?*zaFTN`) ne passent pas |
| 📦 Migrations lock | Les migrations 0000-0034 existent déjà sur le cloud, donc `supabase db push --include-all` échoue sur les conflicts |
| 🌐 Pas de psql | L'environnement Windows n'a pas `psql` installé |
| 🎯 Projet cible | `hhgovvrnalibhgpakswi` (lien actuel dans `.env`, PAS `vvcdmqpbwfyhkzalwdli`) |

## Migrations créées

```
supabase/migrations/
├── 0035_add_event_type_to_events.sql          ← ajoute colonne type aux events
├── 0036_create_cotisations_table.sql          ← table cotisations (PK, indexes)
├── 0037_enrich_members_table.sql              ← ajoute total_dons, montant_en_avance
└── 0038_enrich_transactions_table.sql         ← ajoute cotisation_id
```

## Ce que tu dois vérifier

### 1. Alignement code ↔ schéma SQL
Pour chaque migration, vérifier que :
- Les colonnes créées/modifiées correspondent aux champs utilisés dans le code
- Les types de données SQL correspondent aux types TypeScript
- Les indexes SQL correspondent aux requêtes PowerSync

### 2. Vérification point par point

**Migration 0035** (`events.type`) :
- Chercher dans le code toutes les références à `event.type` ou `eventType`
- Vérifier que la valeur par défaut SQL `NOT NULL DEFAULT 'EVENT'` couvre les cas d'usage

**Migration 0036** (`cotisations` table) :
- Comparer les colonnes SQL avec l'interface `PSCotisation` dans `dataLayer.ts`
- Vérifier que les indexes SQL (culte_id, membre_id, statut) sont bien utilisés dans les requêtes PowerSync
- Confirmer que `montantObligatoire` et `montantPaye` sont en cents (integer) comme dans le code

**Migration 0037** (`members` enrichment) :
- Vérifier que `total_dons` et `montant_en_avance` correspondent aux champs `totalDons` et `montantEnAvance` dans le store
- Confirmer que ces champs sont bien initialisés à 0 dans les requêtes d'insertion

**Migration 0038** (`transactions` enrichment) :
- Vérifier que `cotisation_id` correspond au champ `cotisationId` dans `Transaction` type
- Confirmer que c'est une foreign key nullable vers la table cotisations

### 3. Cohérence d'ensemble
- Le schema PowerSync (`src/lib/powersync/schema.ts`) reflète-t-il exactement les colonnes SQL ?
- Les streams PowerSync (`powersync/sync-config.yaml`) incluent-ils la table `cotisations` ?
- Le store Zustand (`src/store/useLocalStore.ts`) utilise-t-il les bons champs SQL dans `executeWrite` ?

## Sortie attendue

Pour chaque migration, produis :
1. ✅ **ALIGNÉ** / ⚠️ **DÉCALAGE** / ❌ **PROBLÈME**
2. Liste des incohérences trouvées (champ manquant, type différent, etc.)
3. Correction proposée si nécessaire

---

## Note importante

Le déploiement final peut se faire via :
- Le Dashboard Supabase → SQL Editor (copier-coller les 4 fichiers)
- Ou la commande CLI si l'auth est résolue : `supabase link --project-ref hhgovvrnalibhgpakswi` puis `supabase db push`
