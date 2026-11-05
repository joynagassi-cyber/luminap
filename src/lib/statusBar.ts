/**
 * Barre d'état Android — icônes lisibles dans les DEUX modes.
 *
 * Constat C-02 : `@capacitor/status-bar` n'était pas installé ; avec
 * `targetSdk 35` (edge-to-edge), des icônes claires sur fond clair devenaient
 * illisibles en thème clair. On pilote donc le style des icônes depuis le mode
 * courant, à chaque changement de thème (`applyThemeMode` → `applyIonicThemeMode`).
 *
 * Convention Capacitor : `Style.Dark` = texte CLAIR (pour fond sombre),
 * `Style.Light` = texte SOMBRE (pour fond clair). Ne pas inverser.
 */
import { Capacitor } from "@capacitor/core";
import { Style, StatusBar } from "@capacitor/status-bar";

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Applique le style de barre d'état correspondant au mode résolu. */
export function applyStatusBarForMode(mode: "dark" | "light"): void {
  if (!isNative()) return;
  const style = mode === "dark" ? Style.Dark : Style.Light;
  // Fire-and-forget : une barre d'état mal stylée ne doit pas casser le boot.
  void StatusBar.setStyle({ style }).catch(() => {});
}

/**
 * Couleur de fond de la barre d'état (edge-to-edge : transparente en pratique,
 * on la laisse au canvas) + overlays WebView non intrusifs.
 */
export function initStatusBar(): void {
  if (!isNative()) return;
  void (async () => {
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      const mode =
        typeof document !== "undefined" && document.documentElement.dataset.mode === "light"
          ? "light"
          : "dark";
      applyStatusBarForMode(mode);
    } catch {
      /* plugin absent (web) : sans effet */
    }
  })();
}
