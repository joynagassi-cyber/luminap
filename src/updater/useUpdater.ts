import { useCallback, useEffect, useRef, useState } from "react";
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

/**
 * Hook pilotant le self-updater.
 *  - check(force) : interroge GitHub, renvoie l'UpdateInfo|null (pour afficher
 *    « Vous êtes à jour ») et met à jour l'état.
 *  - startUpdate() : vérifie la permission, télécharge (avec progression),
 *    puis installe via PackageInstaller.
 * Sur web/non-Android, l'état reste `idle` et aucune erreur n'est levée.
 */
export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    status: "idle",
    progress: 0,
    updateInfo: null,
    error: null,
  });

  const progressHandleRef = useRef<PluginListenerHandle | null>(null);
  const appStateHandleRef = useRef<PluginListenerHandle | null>(null);
  const updateInfoRef = useRef<UpdateInfo | null>(null);

  const set = (patch: Partial<UpdaterState>) =>
    setState((s) => ({ ...s, ...patch }));

  /** Vérifie une nouvelle version. Retourne l'UpdateInfo (ou null). */
  const check = useCallback(
    async (force: boolean): Promise<UpdateInfo | null> => {
      set({ status: "checking", error: null });
      const info = await checkForUpdate(force);
      if (info) {
        updateInfoRef.current = info;
        set({ status: "available", updateInfo: info });
      } else {
        updateInfoRef.current = null;
        set({ status: "idle", updateInfo: null });
      }
      return info;
    },
    [],
  );

  /** Télécharge (si besoin) puis installe l'APK. */
  const startUpdate = useCallback(async () => {
    const info = updateInfoRef.current;
    if (!info) return;

    // 1. Permission « sources inconnues »
    const { value: canInstall } = await ApkUpdater.canInstall();
    if (!canInstall) {
      set({ status: "waitingPermission", progress: 0 });
      await ApkUpdater.openInstallSettings();
      // Reprendre automatiquement quand l'app revient au premier plan
      appStateHandleRef.current = await App.addListener(
        "appStateChange",
        async ({ isActive }) => {
          if (isActive) {
            if (appStateHandleRef.current) {
              await appStateHandleRef.current.remove();
              appStateHandleRef.current = null;
            }
            await startUpdate(); // re-vérifie la permission
          }
        },
      );
      return;
    }

    // 2. Télécharger avec progression
    set({ status: "downloading", progress: 0 });
    progressHandleRef.current = await ApkUpdater.addListener(
      "downloadProgress",
      ({ progress }) => {
        set({ progress });
      },
    );
    try {
      await ApkUpdater.download({ url: info.downloadUrl, sha256: info.sha256 });
    } catch (e) {
      set({ status: "error", error: String(e) });
      await progressHandleRef.current?.remove();
      progressHandleRef.current = null;
      return;
    }

    // 3. Installer (PackageInstaller — écran de confirmation système)
    set({ status: "readyToInstall", progress: 100 });
    await ApkUpdater.install();
    await progressHandleRef.current?.remove();
    progressHandleRef.current = null;
  }, []);

  // Nettoyage des listeners au démontage
  useEffect(() => {
    return () => {
      progressHandleRef.current?.remove();
      appStateHandleRef.current?.remove();
    };
  }, []);

  return { ...state, check, startUpdate };
}
