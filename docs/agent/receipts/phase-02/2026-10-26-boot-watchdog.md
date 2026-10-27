# Receipt — Phase 2 : R108 watchdog de démarrage (filet mort → armé hors React)

- **Date** : 2026-10-26
- **Branche** : `agent/phase-02-boot-watchdog`
- **Classe** : filet de sécurité déclaré mais jamais déclenché (famille
  R105/R106/R107).

## Défaut

`AppReadyBridge` (src/App.tsx) prétendait : « if the shell never becomes ready
within `BOOT_WATCHDOG_MS`, an explicit recovery screen replaces the silent blank
view ». En réalité :

```ts
useEffect(() => {
  document.getElementById("root")?.setAttribute("data-app-ready", "true");
  readyRef.current = true;                       // ← posé AVANT le minuteur
  const timer = window.setTimeout(() => {
    if (!readyRef.current) setBootTimedOut(true); // ← condition TOUJOURS fausse
  }, BOOT_WATCHDOG_MS);
  ...
}, []);
if (bootTimedOut) return <BootRecoveryScreen />;  // ← inatteignable
```

Deux causes : (1) le drapeau est posé avant l'armement → la condition d'échec ne
peut jamais être vraie ; (2) un watchdog **dans** l'arbre React ne peut pas
détecter « React n'a jamais monté ». Résultat : écran noir **silencieux** en cas
d'échec de boot.

## Correctif

- `src/lib/bootWatchdog.ts` (nouveau, sans React) :
  - `armBootWatchdog(ms)` — armé **avant `createRoot`** dans `main.tsx` ;
  - `renderBootRecoveryOverlay()` — surcouche HTML statique
    (`data-screen-state="error"`, bouton de rechargement), fonctionne même sans
    montage React ;
  - `signalAppReady()` — annule le minuteur (appelé par `AppReadyBridge`).
- `src/main.tsx` : `armBootWatchdog()` avant `createRoot`.
- `src/App.tsx` : `AppReadyBridge` ne fait plus que marquer `data-app-ready` et
  appeler `signalAppReady()` (minuteur mort supprimé, import `BootRecoveryScreen`
  et `useRef` retirés).

## Preuve

| Gate | Sortie |
|---|---|
| `vitest run` (boot-watchdog) | **4/4** (jsdom) |
| `npx tsc -b --noEmit` | **0** |
| `vitest run` (suite) | **1242/1242** (84 fichiers) |
| `vite build` | **OK** (exit 0) |
| `eslint` | **0** erreur |

Cas testés : surcouche affichée si la coquille ne signale pas sa disponibilité ;
aucune surcouche si elle signale à temps ; le clic recharge la page.
