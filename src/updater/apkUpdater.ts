import { registerPlugin, PluginListenerHandle } from "@capacitor/core";

export interface ApkUpdaterPlugin {
  canInstall(): Promise<{ value: boolean }>;
  openInstallSettings(): Promise<void>;
  // sha256 OBLIGATOIRE (A1 / §1.5) : le natif rejette tout téléchargement
  // sans empreinte à vérifier — aucun chemin ne doit pouvoir installer un
  // APK non authentifié.
  download(opts: { url: string; sha256: string }): Promise<{ path: string }>;
  install(): Promise<void>;
  addListener(
    event: "downloadProgress",
    callback: (data: { progress: number }) => void,
  ): Promise<PluginListenerHandle>;
}

/**
 * Pont vers le plugin natif Capacitor « ApkUpdater » (PackageInstaller).
 * Sur web, registerPlugin renvoie des promesses rejetées — toute la logique
 * de checkForUpdate est gardée sous Capacitor.getPlatform() === 'android'.
 */
export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>("ApkUpdater");
