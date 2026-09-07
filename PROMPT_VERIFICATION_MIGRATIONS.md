# 🚨 Signalement de Difficulté — Déploiement Migrations Supabase

## Contexte du projet

J'ai implémenté intégralement le système de **cotisations** dans l'application Lumina (fusion du projet Kased). Toute la logique métier, les pages UI, le store Zustand, les types TypeScript et les hooks PowerSync sont codés et fonctionnels localement.

**Objectif du déploiement :** Connecter la base locale PowerSync au backend Supabase cloud afin que les données cotisations soient synchronisées correctement entre les appareils.

## Difficultés rencontrées

| Problème | Détail technique |
|----------|------------------|
| 🔐 **Auth Supabase CLI** | Le CLI `supabase` retourne une erreur d'authentification — les credentials du fichier `.env` (`mum33#i?*zaFTN`) ne passent pas lors de la connexion |
| 📦 **Migrations lock** | Les migrations 0000-0034 existent déjà sur le cloud, donc `supabase db push --include-all` échoue sur les conflicts de noms |
| 🌐 **Pas de psql** | L'environnement Windows n'a pas `psql` installé dans le PATH |
| 🎯 **Projet cible** | `hhgovvrnalibhgpakswi` (lié dans `.env`, PAS `vvcdmqpbwfyhkzalwdli` comme mentionné dans le plan initial) |

## Migrations SQL créées

Quatre fichiers de migration ont été créés dans `supabase/migrations/` :

```
supabase/migrations/
├── 0035_add_event_type_to_events.sql          ← Ajoute colonne type aux events (EVENT/CULTE)
├── 0036_create_cotisations_table.sql          ← Crée la table cotisations (PK, indexes)
├── 0037_enrich_members_table.sql              ← Ajoute total_dons, montant_en_avance
└── 0038_enrich_transactions_table.sql         ← Ajoute cotisation_id
```

## Ce que l'agent doit vérifier

### 1. Alignement code ↔ schéma SQL

Pour chaque migration, vérifier que :
- Les colonnes créées/modifiées correspondent aux champs utilisés dans le code TypeScript
- Les types de données SQL (`text`, `integer`, `timestamp`) correspondent aux types TypeScript
- Les indexes SQL créés correspondent aux requêtes PowerSync utilisées dans `dataLayer.ts`

### 2. Vérification point par point

**Migration 0035** (`events.type`) :
- Chercher dans le code toutes les références à `event.type` ou `eventType`
- Vérifier que la valeur par défaut SQL `NOT NULL DEFAULT 'EVENT'` couvre tous les cas d'usage
- Confirmer que les cultes existants recevront le type 'EVENT' par défaut

**Migration 0036** (`cotisations` table) :
- Comparer les colonnes SQL avec l'interface `PSCotisation` dans `src/lib/dataLayer.ts`
- Vérifier que les indexes SQL (`culte_id`, `membre_id`, `statut`) sont bien utilisés dans les requêtes PowerSync
- Confirmer que `montant_obligatoire` et `montant_paye` sont en cents (integer) comme dans le code
- Vérifier que le statut par défaut est bien 'NON_PAYE'

**Migration 0037** (`members` enrichment) :
- Vérifier que `total_dons` et `montant_en_avance` correspondent aux champs `totalDons` et `montantEnAvance` dans le store
- Confirmer que ces champs sont bien initialisés à 0 dans les requêtes d'insertion de membres
- Vérifier que le type `integer` est cohérent avec les calculs en cents

**Migration 0038** (`transactions` enrichment) :
- Vérifier que `cotisation_id` correspond au champ `cotisationId` dans le type `Transaction`
- Confirmer que c'est une foreign key nullable vers la table `cotisations`
- Vérifier que la cascade de suppression est correcte (SET NULL)

### 3. Cohérence d'ensemble

- Le schema PowerSync (`src/lib/powersync/schema.ts`) reflète-t-il exactement les colonnes SQL créées ?
- Les streams PowerSync (`powersync/sync-config.yaml`) incluent-ils la table `cotisations` avec la bonne query ?
- Le store Zustand (`src/store/useLocalStore.ts`) utilise-t-il les bons champs SQL dans `executeWrite` ?
- Les pages UI utilisent-elles bien les hooks `useCotisations`, `createCulte`, `markCotisationPaid` ?

## Sortie attendue

Pour chaque migration, produire :
1. ✅ **ALIGNÉ** / ⚠️ **DÉCALAGE** / ❌ **PROBLÈME**
2. Liste des incohérences trouvées (champ manquant, type différent, index absent, etc.)
3. Correction proposée si nécessaire

Format de sortie recommandé :
```
## Migration 0035: events.type
✅ ALIGNÉ
- Colonne `type` créée avec DEFAULT 'EVENT'
- Index créé sur `type` pour les requêtes PowerSync
- Type TypeScript `Event.type` correspond à `text` SQL

## Migration 0036: cotisations
⚠️ DÉCALAGE
- Champ `statut` SQL vs `statut` TypeScript : vérifier la casse
- L'index sur `membre_id` manque dans le schema PowerSync
```

## Méthodes de déploiement alternatives

Le déploiement final peut se faire via :
1. **Dashboard Supabase** → SQL Editor (copier-coller les 4 fichiers SQL dans l'ordre)
2. **CLI si auth résolue** : `supabase link --project-ref hhgovvrnalibhgpakswi` puis `supabase db push --include-all`
3. **psql direct** (si installé) : `psql "postgresql://postgres.vvcdmqpbwfyhkzalwdli:mum33#i?*zaFTN@db.vvcdmqpbwfyhkzalwdli.supabase.co:5432/postgres" -f supabase/migrations/0035_add_event_type_to_events.sql`

## Fichiers de référence

- Plan d'intégration : `docs/plans/2025-09-06-kased-integration.md`
- Prompt de vérification : `docs/MIGRATION_VERIFICATION.md`
- Migrations : `supabase/migrations/0035-0038_*.sql`
- Code implémenté : `src/lib/dataLayer.ts`, `src/store/useLocalStore.ts`, `src/lib/cotisation-logic.ts`
- Pages UI : `src/pages/Cotisations.tsx`, `SaisieRapide.tsx`, `CulteDetail.tsx`, `MembresEnAvance.tsx`, `MembreDetail.tsx`
