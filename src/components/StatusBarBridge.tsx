import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * C-02 (A3) — barre d'état lisible dans les deux thèmes.
 *
 * Sans `@capacitor/status-bar`, ni la couleur ni le style des icônes
 * n'étaient pilotés : en plein écran (targetSdk 35), des icônes claires
 * sur fond clair pouvaient devenir illisibles en thème clair.
 *
 * Ce pont suit le thème APPLIQUÉ (`data-mode` sur <html>, posé par
 * `applyThemeMode` — y compris quand le mode « system » bascule) :
 * - icônes : convention Capacitor `Style.Dark` = texte CLAIR (fond
 *   SOMBRE), `Style.Light` = texte SOMBRE (fond CLAIR). On veut donc des
 *   icônes CLAIRES en mode sombre → `Style.Dark`, et des icônes SOMBRES en
 *   mode clair → `Style.Light`. (Noms contre-intuitifs : le style décrit la
 *   COULEUR DU TEXTE, pas celle du fond. Ne pas inverser — l'ancien code le
 *   faisait et rendait les icônes invisibles en mode sombre.)
 * - fond : valeur calculée du jeton `--surface` (celui d'IonToolbar),
 *   relue à chaque bascule — aucune valeur dupliquée dans le code ;
 * - jamais de surimpression (`overlay: false`) : la WebView reste sous
 *   la barre d'état, conformément au contrat d'insets (C-09, le haut
 *   est géré par IonToolbar / --ion-safe-area-top).
 *
 * Natif uniquement ; sur le web, ne rend rien et n'appelle rien.
 */
export function StatusBarBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const apply = () => {
      const dark = document.documentElement.dataset.mode === "dark";
      const surface = getComputedStyle(document.documentElement)
        .getPropertyValue("--surface")
        .trim();
      void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      void StatusBar.setStyle({
        // `Style.Dark` = texte clair (fond sombre) → mode sombre : icônes
        // claires. Mode clair → `Style.Light` (texte sombre).
        style: dark ? Style.Dark : Style.Light,
      }).catch(() => {});
      if (surface) {
        void StatusBar.setBackgroundColor({ color: surface }).catch(() => {});
      }
    };

    apply();
    // `style` couvre l'application du thème d'organisation (variables
    // poussées en ligne sur <html>) en plus des bascules clair/sombre.
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-mode", "style"],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
