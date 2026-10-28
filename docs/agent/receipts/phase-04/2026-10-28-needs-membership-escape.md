# Receipt — R120 : l'écran « Organisation non rejointe » était un cul-de-sac

- **Date** : 2026-10-28
- **Phase** : 4 (RBAC / garde de route) — suite directe de R107
- **Branche** : `agent/phase-4-needs-membership`
- **Statut** : ✅ CORRIGÉ

## Défaut

Le câblage R107 (`isOrgMember` alimenté par `useOrgMembership`) a rendu la
branche `needs-membership` **atteignable pour la première fois**. Elle a révélé
un défaut de conception de l'écran associé : `NeedsMembershipScreen` proposait
« Retour à l'accueil » → `/dashboard`, or `/dashboard` **n'est pas exempté** de
`needs-membership` (seules `/onboarding` et `/org-setup` le sont). Le bouton
renvoyait donc l'utilisateur **sur le même écran**.

Pire : pour un compte authentifié non membre, **toutes** les routes `app` sont
bloquées, y compris `/settings/profil` — le seul endroit d'où l'on peut se
déconnecter. Aucune échappatoire n'existait : boucle sans issue.

## Preuve du défaut

```
resolveRoute("/dashboard", {isAuthenticated:true, isOrgMember:false})
  → { outcome: "needs-membership" }
```

Ensemble des routes `app` statiques qui rendent la main pour un non-membre :

```
["/onboarding", "/org-setup"]
```

## Correctif

- Bouton secondaire « Retour à l'accueil » **supprimé**.
- Nouveau bouton « Changer de compte » → `authService.signOut()` puis
  `/sessions` (route **publique**), câblé via `onSignOut` depuis `App.tsx`.
- `secondaryLabel` n'est rendu **que si** `onSignOut` est fourni → aucun bouton
  mort par construction.
- CTA principal inchangé (`/invitation/claim`, route publique).

## Garde anti-dérive

`src/components/__tests__/needs-membership-escape.test.tsx` (4 tests) :

1. le CTA principal mène à une route praticable (`/invitation/claim`) ;
2. `/dashboard` est bien bloqué (preuve du défaut) et aucune action ne le vise ;
3. sans `onSignOut`, aucun bouton n'est rendu (pas de bouton mort) ;
4. l'ensemble praticable hors exemptions est exactement `{/onboarding, /org-setup}`.

**Non-vacuité prouvée** : réintroduction du bouton mort → 2 tests échouent ;
restauration → 4/4.

## Gates

- `npx vitest run` : **1550/1550** (124 fichiers)
- `npx tsc -b` : 0 erreur
- `npx eslint` (fichiers touchés) : 0 erreur
