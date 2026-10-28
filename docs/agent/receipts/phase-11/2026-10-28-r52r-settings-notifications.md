# Receipt — R52.r : `/settings/notifications` annonçait « Tout est lu » avant la 1re lecture

- **Phase** : 11
- **Priorité** : P2
- **Branche** : `agent/r52j-trace-orgreport-loading`
- **Date** : 2026-10-28

## Défaut

`useNotifications()` renvoie `isLoading: false` **en dur** (D-R41) et l'écran
n'avait aucun drapeau de disponibilité. Avant le premier sync, il affichait :

- « **Tout est lu** » (fait faux) ;
- « **0 au total** » (fait faux) ;
- « **Aucune notification à vider** » — et le bouton « Tout marquer lu » était
  **désactivé** (`disabled={unread === 0}`), alors que des notifications non
  lues étaient en train d'arriver.

C'est le même patron que R52.l→R52.q : un fait dérivé d'une donnée non encore
lue, présenté comme un état stable.

## Correctif

```ts
const notificationsPending =
  (notifications?.length ?? 0) === 0 && !isPowerSyncReadyNow();
```

Libellés « Chargement… » / « Lecture des notifications en cours » et bouton
désactivé tant que la réplique n'a pas répondu.

## Preuves

- `r52r-settings-notifications-loading.test.tsx` : **2 tests**, non-vacuité
  vérifiée (garde neutralisée → « Tout est lu » réapparaît, 1 échec).
- Garde statique étendue : le motif de verdict vide couvre désormais
  `… à vider` / `… disponible` / `… à afficher`. Mesure : seuls `NotFound.tsx` et
  `Tutorial.tsx` (déjà allowlistés) matchent — extension sans faux positif.
- `npx vitest run` → **1637/1637** (138 fichiers)
- `npx tsc -b --force --noEmit` → **0 erreur** ; `eslint` → **0 erreur**
