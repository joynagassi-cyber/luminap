# Receipt — Phase 8 (Isolation & sécurité)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-08-isolation`
- **Périmètre** : escalade de privilèges via RPC ; advisors SECURITY DEFINER ;
  entrées hostiles (injection de formule CSV).

## Défaut 1 — R103 : escalade via `settle_invitation_claim` (CRITIQUE)

`settle_invitation_claim(uuid)` est `SECURITY DEFINER` et était `EXECUTE`-able
par `authenticated` en RPC. Elle agit sur `resulting_user_id` (un tiers) sans
vérifier l'appelant → n'importe quel utilisateur authentifié peut élever un
tiers.

**Preuve** (annulée) : un appelant (trésorier) a fait passer un profil
`PENDING`/`MEMBRE` à **`ADMIN`/`ACTIVE`** (`claim_status = CONFIRMED`).

**Correctif** (`20261026000005`) :

| Volet | Effet |
|---|---|
| Garde `pg_trigger_depth() = 0` | tout appel direct (RPC) refusé |
| `REVOKE EXECUTE` (settle + fonctions trigger) | plus de surface RPC |
| Wrappers re-basculés `SECURITY DEFINER` | le flux légitime continue |

**Vérifié** : appel RPC direct → `42501 permission denied` ; flux légitime
(claim inséré par un gestionnaire) → `CONFIRMED` + profil `ACTIVE`/`MEMBRE`.

## Advisors (avant → après)

| Advisor | Avant | Après |
|---|---|---|
| `anon_security_definer_function_executable` | 1 | **0** |
| `authenticated_security_definer_function_executable` | 9 | **7** |
| `rls_enabled_no_policy` | 2 | 2 (faux positifs deny-all, cf. R97) |
| `auth_leaked_password_protection` | 1 | 1 (**R104**, escalade plan Pro) |

Les 7 WARN restants sont des helpers RLS (`is_org_member`, `has_permission`,
`can_manage_invitations`, `is_org_admin`, `current_org_id`, `org_descendants`,
`upsert_profile`) : appelés dans les policies, prennent l'uid en paramètre,
aucun effet de bord de privilège. Les retirer casserait les policies (cf.
D-P8-1).

## Défaut 2 — Injection de formule CSV (OWASP, entrées hostiles)

Les trois exports CSV (transactions `export.ts`, soumissions `formSystem.ts`,
rapports `ReportBuilder.tsx`) ne neutralisaient pas les préfixes de formule :
un champ commençant par `=` est exécuté par Excel/Sheets à l'ouverture.

**Correctif** : `src/lib/csv.ts` (`escapeCsvCell`/`escapeCsvRow`) — neutralise
`= + - @ \t \r \n` (préfixe apostrophe) + citation RFC 4180. Câblé dans les
trois exports.

## Tests (rouge → vert)

| Fichier | Cas | Objet |
|---|---|---|
| `src/capabilities/__tests__/settle-claim-rpc-hardening.test.ts` **(nouveau)** | 4 | garde trigger, revokes, wrappers DEFINER |
| `src/lib/__tests__/csv-escape.test.ts` **(nouveau)** | 7 | préfixes formule/contrôle, citation RFC 4180 |

Rouge prouvé pour les deux en retirant temporairement le correctif.

## Gates (codes de sortie mesurés)

| Gate | Commande | Sortie |
|---|---|---|
| Typecheck | `npx tsc -b --noEmit` | **0** |
| Unitaires | `pnpm exec vitest run` | **0** — **1204/1204** |
| Lint | `pnpm run lint` | **0** — 0 erreur |
| Build | `pnpm run build` | **0** |

## Migrations appliquées à la base dev

- `20261026000005_revoke_rpc_on_trigger_functions` ✔ (+ rollback)

## Honnêteté (R12) / limites

- **[Prouvé]** : reproduction live de l'escalade avant correctif, refus après,
  flux légitime préservé, advisors mesurés avant/après.
- **[Escalade]** : R104 (leaked-password) exige un plan Pro — non activable ici.
- **[Limite E1]** : les tests d'intrusion inter-org Cypress restent dépendants
  de PowerSync déployé (E1) ; la preuve R103 est au niveau base (frontière
  réelle).
