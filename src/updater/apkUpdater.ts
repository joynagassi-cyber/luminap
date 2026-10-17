import { registerPlugin, PluginListenerHandle } from "@capacitor/core";

export interface ApkUpdaterPlugin {
  canInstall(): Promise<{ value: boolean }>;
  openInstallSettings(): Promise<void>;
  download(opts: { url: string; sha256?: string }): Promise<{ path: string }>;
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
