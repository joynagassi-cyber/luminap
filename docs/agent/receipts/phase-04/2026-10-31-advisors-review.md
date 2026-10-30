# Receipt — Revue complète des advisors Supabase (sécurité + performance)

- **Date** : 2026-10-31
- **Branche** : `agent/r140-audit-append-only`
- **Nature** : audit + documentation (aucune modification de code/DB sauf l'index FK)

## Sécurité (`supabase_get_advisors security`)

| Advisor | Verdict | Réf. |
|---|---|---|
| `rls_enabled_no_policy` (3 : `keep_alive`, `_jsonb_backfill_20261024`, `_jsonb_null_literal_20261027`) | Faux positif (RLS sans politique = deny-all) | R97 |
| `anon_security_definer_function_executable` (`keep_alive_ping`) | Intentionnel (anti-pause, sans paramètre, aucune donnée métier) | R97.b |
| `authenticated_security_definer_function_executable` (7 : helpers RLS + `upsert_profile`) | Helpers = usage RLS ; `upsert_profile` **gardé** (`p_user_id=auth.uid()` + `is_org_admin` pour le rôle) → aucune auto-escalade | R97.c |
| `auth_leaked_password_protection` | **Action propriétaire** (réglage dashboard Auth, non activable via SQL) | R97.d |

**Correction d'exactitude** : R97 annonçait `_jsonb_backfill_20261024` = 213
lignes et 2 tables. Mesure 2026-10-31 : **0** ligne, **3** tables (ajout de
`_jsonb_null_literal_20261027`, migration `20261027000012`). R97 mis à jour.

## Performance (`supabase_get_advisors performance`)

| Advisor | Verdict | Action |
|---|---|---|
| `unindexed_foreign_keys` (2) | **Défaut réel** | **Corrigé** — migration `20261031000005` (2 index mono-colonne) ; lint disparu |
| `unused_index` (48) | Base dev sans trafic (un index « inutilisé » peut être critique en prod) | Aucune (ne pas supprimer) |
| `multiple_permissive_policies` (7) | Redondance permissive (coût minime, aucune faille) | Aucune (fusion = changement RLS sensible) |

## Preuve

- `unindexed_foreign_keys` : présent **avant**, **absent après** l'application de `20261031000005`.
- Contenu des tables reliquats : `keep_alive`=1, les 2 `_jsonb_*`=0.

## Gates

- `npx tsc -b` → **0** ; `npx vitest run` → **1752/1752** (160 fichiers)
