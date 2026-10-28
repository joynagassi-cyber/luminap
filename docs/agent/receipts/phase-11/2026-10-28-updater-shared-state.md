# Receipt — R124 : état partagé du self-updater (dialogue inerte corrigé)

- **Date** : 2026-10-28
- **Phase** : 11 (exploitation / mise à jour applicative)
- **Branche** : `agent/r124-updater-shared-state`
- **Statut** : ✅ CORRIGÉ

## Défaut

`UpdateDialog` appelle `useUpdater()` lui-même, mais `useUpdater` gardait son
état dans un `useState` local → état **isolé** par appel. Le dialogue ne voyait
jamais la mise à jour détectée par `UpdaterBridge` / `SettingsAbout` :
« Mettre à jour » était inerte (`if (!info) return`) et « Plus tard »
(`onClick={() => undefined}`) ne fermait rien.

## Correctif

1. `src/updater/updaterStore.ts` — store **global** (état module + subscribe,
   `checkUpdate`, `startUpdate`, `dismissUpdater`, `resetUpdaterStore`, garde
   `inFlight`, un seul listener natif).
2. `useUpdater.ts` — enveloppe React sur le store, expose `dismiss`.
3. `UpdateDialog.tsx` — « Plus tard » → `dismiss()` ; désactivé pendant le
   téléchargement.
4. Point de montage **unique** : `UpdaterBridge` (App.tsx) monte le dialogue et
   écrit dans le store ; SettingsAbout n'a plus que le bouton.

## Garde anti-dérive

`src/updater/__tests__/updaterStore.test.ts` (6 tests) : état partagé observé
par un abonné, `dismiss`, `startUpdate` (download+install, idempotent), no-op
sans mise à jour, « Plus tard » branché, montage unique. **Non-vacuité
prouvée**.

## Gates

- `npx vitest run` : **1566/1566** (127 fichiers)
- `npx tsc -b` : 0 erreur
- `npx eslint src` : 0 erreur
