# Receipt — Phase 5-6 (Auth / invitations)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-05-06-auth-invitations`
- **Périmètre** : parcours d'invitation (Phase 6) + deux défauts de sécurité
  réels trouvés par audit live.

## Défaut 1 — R92 : le stream PowerSync `invitations` court-circuite la RLS

**Constat** : la RLS `invitations_select` avait été durcie (R91) pour que seuls
les gestionnaires voient `code`/`grants_payload`. Mais le stream PowerSync
`invitations` filtrait sur
`org_id IN (SELECT org_id FROM profiles WHERE id = auth.user_id())` : **tout**
membre synchronisait **toutes** les invitations (codes inclus) sur son appareil.
PowerSync lit en service role → **la RLS est contournée** (même faille que R91,
par une autre porte). Le commentaire du fichier annonçait pourtant l'inverse.

**Correctif** : `powersync/sync-config.yaml` — `invitations` et
`invitation_claims` restreints aux **gestionnaires** (`org_memberships.role`
ACTIVE ∈ {PASTEUR_PRINCIPAL, ANCIEN, TREASURIER}, ou `profiles.role` idem),
c.-à-d. les mêmes rôles que `can_manage_invitations()` et la RLS R91.

**Preuve** : `src/lib/__tests__/sync-config-invitations.test.ts` (3 cas) lit le
YAML et exige le filtre gestionnaire (rouge → vert). **Limite E1** : le
redéploiement du sync-config exige `PS_ADMIN_TOKEN` (absent) ; le correctif est
dans le dépôt et prend effet au prochain `powersync deploy sync-config`.

## Défaut 2 — R100 : code d'invitation généré par `Math.random()`

**Constat** : `generateCode()` tirait les 6 caractères via `Math.random()`
(non cryptographique, flux prévisible). Le code est un **jeton porteur** qui
ouvre l'accès à une organisation (rôle + grants).

**Preuve (rouge)** : en figeant `Math.random`, deux appels successifs produisent
le **même** code (`LUM-PPPPPP`) — le code est entièrement déterminé par le flux.

**Correctif** : tirage via `crypto.getRandomValues` (CSPRNG), repli `Math.random`
seulement si WebCrypto est absent. Format `LUM-XXXXXX` et alphabet sans
ambiguïté conservés.

## Tests (rouge → vert, R3)

| Fichier | Cas | Objet |
|---|---|---|
| `src/capabilities/__tests__/invitation-code-entropy.test.ts` **(nouveau)** | 3 | CSPRNG, format, non-collision |
| `src/lib/__tests__/sync-config-invitations.test.ts` **(nouveau)** | 3 | streams restreints aux gestionnaires |

## Gates (codes de sortie mesurés)

| Gate | Commande | Sortie |
|---|---|---|
| Typecheck | `npx tsc -b --noEmit` | **0** |
| Unitaires | `pnpm exec vitest run` | **0** — **1188/1188** (1182 → +6) |
| Lint | `pnpm run lint` | **0** — 0 erreur |
| Build | `pnpm run build` | **0** |

## Honnêteté (R12) / limites

- **[Prouvé]** : les deux tests échouent avant correctif, passent après ; gates.
- **[Limite E1]** : l'effet réel du durcissement du stream n'est pas observable
  sans déploiement PowerSync (`PS_ADMIN_TOKEN` absent) ; l'impact reste
  théorique tant qu'aucun client ne synchronise.
- **[Non traité dans cette phase]** : la preuve post-acceptation complète
  (membership + sync filtrée + rôle actif) exige PowerSync déployé (E1) ; le
  reste du parcours QR/lien est déjà couvert par les tests existants
  (`invitation-code-consistency`, `invitation-scope`, `invitation-rls-hardening`).
