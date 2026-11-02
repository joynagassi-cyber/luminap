import { App } from "@capacitor/app";
import { PluginListenerHandle } from "@capacitor/core";
import { ApkUpdater } from "./apkUpdater";
import { checkForUpdate, type UpdateInfo } from "./checkForUpdate";

export type UpdaterStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "readyToInstall"
  | "waitingPermission"
  | "error";

export interface UpdaterState {
  status: UpdaterStatus;
  progress: number; // 0..100
  updateInfo: UpdateInfo | null;
  error: string | null;
}

const INITIAL: UpdaterState = {
  status: "idle",
  progress: 0,
  updateInfo: null,
  error: null,
};

/**
 * Store GLOBAL de l'updater (source de vérité unique, hors React).
 *
 * R124 — l'état vivait auparavant DANS `useUpdater()` (un `useState` par
 * appel). Or `UpdateDialog` appelle `useUpdater()` **lui-même** tout en
 * affirmant que l'état est « global » : le dialogue lisait donc un état
 * **isolé** (toujours `idle`/`updateInfo:null`) au lieu de celui de l'appelant
 * (`UpdaterBridge` / `SettingsAbout`). Conséquences mesurées :
 *   - le dialogue ne voyait jamais la mise à jour → « Mettre à jour »
 *     n'appelait jamais `startUpdate` (bouton inerte) ;
 *   - « Plus tard » (`onClick={() => undefined}`) ne fermait rien, faute d'état
 *     partagé.
 * Un store au niveau module rend l'état réellement partagé par toutes les
 * instances du hook, et `dismiss()` peut le refermer.
 */
let state: UpdaterState = { ...INITIAL };

const listeners = new Set<(s: UpdaterState) => void>();

// Un seul listener natif de progression / retour au premier plan, quel que
// soit le nombre d'appelants du hook.
let progressHandle: PluginListenerHandle | null = null;
let appStateHandle: PluginListenerHandle | null = null;
let inFlight: Promise<void> | null = null;

function emit(): void {
  for (const l of listeners) l(state);
}

function setState(patch: Partial<UpdaterState>): void {
  state = { ...state, ...patch };
  emit();
}

export function subscribeUpdater(listener: (s: UpdaterState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUpdaterState(): UpdaterState {
  return state;
}

/** Réinitialise l'état (tests + retour à un état neutre après fermeture). */
export function resetUpdaterStore(): void {
  state = { ...INITIAL };
  emit();
}

/** Ferme le dialogue sans toucher à l'installation en cours. */
export function dismissUpdater(): void {
  setState({ updateInfo: null, status: "idle", progress: 0, error: null });
}

/** Vérifie une nouvelle version. Retourne l'UpdateInfo (ou null). */
export async function checkUpdate(force: boolean): Promise<UpdateInfo | null> {
  setState({ status: "checking", error: null });
  const info = await checkForUpdate(force);
  if (info) {
    setState({ status: "available", updateInfo: info });
  } else {
    setState({ status: "idle", updateInfo: null });
  }
  return info;
}

/** Télécharge (si besoin) puis installe l'APK. Idempotent (garde `inFlight`). */
export async function startUpdate(): Promise<void> {
  const info = state.updateInfo;
  if (!info) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      // 1. Permission « sources inconnues »
      const { value: canInstall } = await ApkUpdater.canInstall();
      if (!canInstall) {
        setState({ status: "waitingPermission", progress: 0 });
        await ApkUpdater.openInstallSettings();
        // Reprendre automatiquement quand l'app revient au premier plan
        appStateHandle = await App.addListener("appStateChange", async ({ isActive }) => {
          if (isActive) {
            if (appStateHandle) {
              await appStateHandle.remove();
              appStateHandle = null;
            }
            await startUpdate(); // re-vérifie la permission
          }
        });
        return;
      }

      // 2. Télécharger avec progression
      setState({ status: "downloading", progress: 0 });
      progressHandle = await ApkUpdater.addListener("downloadProgress", ({ progress }) => {
        setState({ progress });
      });
      try {
        await ApkUpdater.download({ url: info.downloadUrl, sha256: info.sha256 });
      } catch (e) {
        setState({ status: "error", error: String(e) });
        await progressHandle?.remove();
        progressHandle = null;
        return;
      }

      // 3. Installer (PackageInstaller — écran de confirmation système)
      setState({ status: "readyToInstall", progress: 100 });
      await ApkUpdater.install();
      await progressHandle?.remove();
      progressHandle = null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
