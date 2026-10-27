# Receipt — Phase 5-6 : preuve post-acceptation (sync filtrée + rôle actif)

- **Date** : 2026-10-27
- **Branche** : `agent/phase-05-06-post-acceptation`
- **Tâche** : PROGRESS « Preuve post-acceptation (sync filtrée + rôle actif) »
  (P1, précédemment **bloquée par E1** — désormais débloquée).
- **Résultat** : la preuve a mis au jour un **défaut grave non documenté (R111)**.

## Ce qui a été prouvé (le flux légitime fonctionne côté serveur)

Scénario réel sur l'instance dev `hhgovvrnalibhgpakswi`, avec un compte Auth
réel (`proof-postaccept@lumina.dev`, créé via l'API admin puis **supprimé**) :

1. `handle_new_user` crée le profil (rôle défaut) → `ACTIVE`.
2. Profil repassé `PENDING` (simule un invité fraîchement invité).
3. Invitation émise par un **gestionnaire** d'`org-1` (`TREASURIER`).
4. Claim `PENDING_SYNC` avec `resulting_user_id` = **l'id Auth réel** →
   règlement : claim `CONFIRMED`, profil `ACTIVE`, `org_memberships` `ACTIVE`.
5. **Sync filtrée post-acceptation** (jeton PowerSync généré pour ce compte) :
   `{"connected":true,"hasSynced":true}` → `events:1` (`org-1`), `profiles:1`,
   `organizations:0` — la bonne organisation, rien de plus.

**Transaction annulée** pour les étapes SQL ; le compte Auth de test a été
supprimé. **0 résidu vérifié** (profils/invitations/claims/memberships/orgs).

## Ce qui a été découvert (R111 — CRITIQUE, non documenté)

Le flux **réel** du client (`claimInvitation`, `src/capabilities/invitation/index.ts:311`)
génère un **UUID aléatoire** pour le profil PENDING :

```ts
const userId = crypto.randomUUID();
const pendingEmail = `pending-${userId.slice(0, 8)}@lumina.local`;
// INSERT INTO profiles (id=userId, …, status='PENDING')
```

Or deux FK interdisent cet id côté serveur :

- `profiles.id → auth.users(id)` (**vérifié**, `ON DELETE CASCADE`) ;
- `org_memberships.user_id → auth.users(id)` (posée par le trigger de règlement).

**Preuves mesurées** :

| Chemin | Résultat |
|---|---|
| Upload du profil PENDING (PostgREST, comme PowerSync) | `23503` — `Key (id)=… is not present in table "users"` |
| Règlement du claim (trigger `settle_invitation_claim`) | `23503` — `org_memberships_user_id_fkey`, ligne 92 |
| Données réelles | `invitation_claims = 0`, profils `pending-*@lumina.local = 0` |

Les deux FK sont **NON deferrable** (vérifié). Le design prévoyait un « bridge
`auth.users` » (edge `bridge-auth.ts`, Vague 3.5) **jamais implémenté** et
« jamais importé par les capabilities ».

**Impact** : le parcours « un invité réclame une invitation » **ne peut pas
aboutir** de bout en bout (ni l'écriture locale, ni le règlement serveur). Le
rôle/organisation du nouvel arrivant ne sont jamais appliqués en base.

**Statut** : **documenté + escaladé (E4)**. Correctif = décision propriétaire
(créer l'utilisateur Auth avant le profil, ou faire porter le claim par l'id
Auth du réclamant) — non implémenté sans arbitrage (intégrité/sécurité).

## Gates

| Gate | Résultat |
|---|---|
| `vitest run` | 1279/1279 (inchangé — aucun code modifié) |
| Résidus en base | 0 |

## Honnêteté (R12)

- **[Prouvé]** : le flux serveur légitime (compte Auth réel) fonctionne ; le
  flux client (UUID aléatoire) échoue en `23503` aux deux étapes.
- **[Limite]** : je n'ai pas exécuté le client PowerSync complet pour l'upload
  du profil ; j'ai reproduit le chemin exact (upsert PostgREST service-role),
  qui est celui de `SupabaseConnector.uploadData`.
- **[Non fait]** : correctif R111 (décision d'architecture requise).
