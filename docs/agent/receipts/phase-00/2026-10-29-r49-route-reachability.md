# Receipt — R49.b : routes montées mais orphelines (reachability)

- **Date** : 2026-10-29
- **Branche** : `agent/r49-route-reachability`
- **Phase** : 0 (réconciliation) · **Classe** : « filet déclaré, jamais câblé »
  (variante : la page existe et l'URL fonctionne, mais **aucun lien** n'y mène).

## Défaut

R49 documentait « les annexes (`org_units`) n'ont pas d'écran dédié ». En
réalité :

- `src/pages/OrgUnits.tsx` **existe** (créer/lister/supprimer des unités via
  `organization.addOrgUnit` / `removeOrgUnit`, lecture `federation.getOrgUnits`) ;
- la route `/admin/units` est **montée** (fix B.8 dans `ionic/routes/admin.tsx`) ;
- **mais aucun lien de navigation** ne pointe vers `/admin/units` →
  l'écran est inatteignable pour l'utilisateur.

Constat annexe de la même classe : `/admin/roles` (`OrgRoles.tsx`, accès & rôles)
n'avait **aucun lien entrant** non plus.

Preuve : `grep -rn "admin/units\|admin/roles" src/` → uniquement les déclarations
de route (et une mention en commentaire), aucun `navigate(...)` / `to=`.

## Correctif

1. `src/pages/CentralAdmin.tsx` → `OrgDetail` : bouton **« Unités internes »**
   → `navigate('/admin/units?org=' + orgId)` (le détail d'organisation est
   l'endroit naturel : on gère une org **et** ses annexes).
2. `src/pages/Settings.tsx` → groupe « Organisation » : option **« Accès &
   rôles »** → `/admin/roles` (l'écran `OrgRoles` gère l'état `forbidden`, donc
   sûr pour tout compte).

## Garde anti-récurrence

`src/lib/__tests__/route-reachability-guard.test.ts` (3 tests) :

- `chaque route montée a un lien entrant OU est justifiée` — collecte les
  `path="…"` de `ionic/routes/*.tsx`, puis cherche une cible correspondante dans
  `src/` (littéraux `navigate()`, `to=`/`href=`/`defaultHref=`, `to:`/`href:`,
  `route:` du registre de features, cibles calculées `navigate(cond ? "/a" : "/b")`).
  Les routes dynamiques (`/x/:id`) sont normalisées par leur préfixe.
- `la collecte n'est pas vide` — non-vacuité du scanning.
- `l'allowlist ne contient pas de route qui n'est plus montée` — anti-obsolescence.

`UNREACHABLE_ALLOWLIST` (justifiée) : `/admin/federation/tree` (redirect
rétro-compat), `/invitation/claim` (lien profond public), `/auth/callback`
(retour OAuth externe `redirect_uri`).

## Gates (mesurés localement)

| Gate | Commande | Sortie |
|---|---|---|
| Types | `npx tsc -b` | **0** |
| Lint | `eslint` (3 fichiers touchés) | **0 erreur** (warnings style existants) |
| Garde reachability | `vitest run route-reachability-guard` | **3 passed** |
| Non-vacuité | mutation : retirer les 2 liens ajoutés | **1 failed** — nomme `/admin/roles`, `/admin/units` ; restauré → **3 passed** |
| Suite complète | `vitest run` | **1674 passed** (149 fichiers) |

## Risque résiduel

- R17 (dérive migrations↔base) et la décision de rôle ADMIN (R109/R16) restent
  ouverts et bloqués par des décisions propriétaire.

---

# R49.c (P0) — lien cassé vers une route inexistante

- **Date** : 2026-10-29
- **Branche** : `agent/r49b-broken-links`

## Défaut

`src/pages/TransactionEdit.tsx:131` (« Retour aux transactions », affiché sur
l'état « transaction introuvable ») appelait `navigate("/transactions")`. Or
aucune route `/transactions` n'a **jamais** existé (vérifié : `git log -S
'path="/transactions"'` → vide ; le grand livre est `/finance`). Le clic menait
donc à un écran noir/404 — défaut de classe **P0 « écran noir »**.

## Correctif

Cible corrigée vers `/finance` (titre « Finance — Grand livre », contient la
liste des transactions).

## Garde (inverse de R49.b)

`route-reachability-guard.test.ts` (+2 tests) : toute **cible de navigation**
doit correspondre à une **route montée** (`:param` et `?query` normalisés).

Piège corrigé : le catch-all `path="*"` faisait correspondre **toute** cible →
la garde était vacuе et ne détectait pas le lien cassé. `*` est désormais
**exclu** de la correspondance (le catch-all affiche un 404, ce n'est pas une
« route » atteignable).

`TARGET_ALLOWLIST` : `/` (redirigé par le résolveur vers `/splash`).

## Preuves

| Gate | Sortie |
|---|---|
| `npx tsc -b` | **0** |
| `eslint` (fichiers touchés) | **0 erreur** |
| `vitest run route-reachability-guard` | **5 passed** |
| Non-vacuité (remettre `/transactions`) | **1 failed** — nomme `/transactions` ; restauré → **5 passed** |
| Suite complète | **1676 passed** (149 fichiers) |
