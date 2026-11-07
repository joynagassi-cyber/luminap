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
 *
 * NOTE : la configuration COMPLÈTE (style + fond + non surimpression) est
 * pilotée par `StatusBarBridge` (monté dans `App`). `applyStatusBarForMode`
 * n'est qu'une application de style « à chaud » déclenchée par la bascule de
 * thème. Ne jamais réintroduire une seconde source qui surimpressionne la
 * WebView : deux sources divergentes rendaient les icônes invisibles.
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
