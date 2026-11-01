import { App } from "@capacitor/app";
import { PluginListenerHandle } from "@capacitor/core";
import { ApkUpdater } from "./apkUpdater";
import { checkForUpdate, type UpdateInfo } from "./checkForUpdate";
import { reportError } from "@/lib/observability/errorReporter";

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

// Un seul listener natif de retour au premier plan, quel que soit le nombre
// d'appelants du hook (le listener de progression est local à chaque
// `startUpdate()` et retiré dans son `finally`).
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

/** Signale un échec de mise à jour à l'observabilité (jamais de panne muette). */
function reportUpdateFailure(stage: string, err: unknown, extra?: Record<string, string>): void {
  reportError(err instanceof Error ? err : new Error(String(err)), {
    type: "functional",
    source: "self-update",
    context: { stage, ...(extra ?? {}) },
  });
}

/** Télécharge (si besoin) puis installe l'APK. Idempotent (garde `inFlight`). */
export async function startUpdate(): Promise<void> {
  const info = state.updateInfo;
  if (!info) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    let handle: PluginListenerHandle | null = null;
    try {
      // 1. Permission « sources inconnues ». Un échec ici ne doit PAS bloquer
      //    en silence : on le remonte et on affiche une erreur actionnable.
      let canInstall = false;
      try {
        ({ value: canInstall } = await ApkUpdater.canInstall());
      } catch (e) {
        setState({ status: "error", error: `Vérification de permission impossible : ${String(e)}` });
        reportUpdateFailure("canInstall", e);
        return;
      }
      if (!canInstall) {
        setState({ status: "waitingPermission", progress: 0 });
        try {
          await ApkUpdater.openInstallSettings();
        } catch (e) {
          setState({ status: "error", error: `Ouverture des paramètres impossible : ${String(e)}` });
          reportUpdateFailure("openInstallSettings", e);
          return;
        }
        // Reprendre automatiquement quand l'app revient au premier plan.
        // Le handle précédent est retiré AVANT d'en créer un nouveau (sinon
        // empilement de listeners à chaque aller-retour dans les réglages).
        if (appStateHandle) {
          await appStateHandle.remove();
          appStateHandle = null;
        }
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

      // 2. Télécharger avec progression.
      setState({ status: "downloading", progress: 0 });
      handle = await ApkUpdater.addListener("downloadProgress", ({ progress }) => {
        setState({ progress });
      });
      try {
        await ApkUpdater.download({ url: info.downloadUrl, sha256: info.sha256 });
      } catch (e) {
        setState({ status: "error", error: `Téléchargement échoué : ${String(e)}` });
        reportUpdateFailure("download", e, { version: info.versionName });
        return;
      } finally {
        await handle?.remove();
        handle = null;
      }

      // 3. Installer (PackageInstaller — écran de confirmation système).
      setState({ status: "readyToInstall", progress: 100 });
      try {
        await ApkUpdater.install();
      } catch (e) {
        setState({ status: "error", error: `Installation refusée ou échouée : ${String(e)}` });
        reportUpdateFailure("install", e, { version: info.versionName });
        return;
      }
    } finally {
      await handle?.remove();
      inFlight = null;
    }
  })();

  return inFlight;
}
