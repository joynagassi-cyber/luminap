// Fixed: Capacitor — keyboard-avoidance hook (Android/iOS hardware keyboard occludes bottom-anchored CTA on form pages)
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

/**
 * Compensation à appliquer (px) quand le clavier est ouvert.
 *
 * C-10 (A3) : la config Capacitor redimensionne la WebView
 * (`Keyboard.resize: 'native'` + `resizeOnFullScreen: true`, requis en
 * plein écran edge-to-edge Android 15). Quand ce redimensionnement a
 * effectivement lieu, la fenêtre de mise en page (`innerHeight`) a déjà
 * rétréci et le viewport VISUEL la couvre entièrement : la partie
 * occluse (`innerHeight − visualViewport.height`) vaut ~0 et il n'y a
 * rien à compenser. Quand le clavier SURVOLE la WebView (pas de
 * redimensionnement : iOS, appareils où le natif ne redimensionne pas),
 * la partie occluse vaut la hauteur du clavier — comportement
 * historique. Mesure sans état (aucune référence « clavier fermé » à
 * capturer, donc aucune course avec l'ordre des événements), bornée
 * par la hauteur du clavier et plafonnée à 300px comme à l'origine.
 * Sans `visualViewport` (WebView ancienne) : compensation historique.
 */
export function computeKeyboardCompensation(
  keyboardHeight: number,
  layoutHeight: number,
  visualHeight: number | null,
): number {
  const capped = (px: number) => Math.min(Math.max(0, px), 300);
  if (visualHeight == null) return capped(keyboardHeight);
  const occluded = Math.max(0, layoutHeight - visualHeight);
  return capped(Math.min(Math.max(0, keyboardHeight), occluded));
}

/**
 * Évitement du clavier matériel (Android) / clavier iOS sur les pages à
 * formulaire : quand le clavier apparaît, on pousse le contenu vers le haut
 * (padding-bottom = partie occluse de la fenêtre, max 300px — voir
 * `computeKeyboardCompensation`) pour que le CTA bas et le champ actif ne
 * restent pas masqués ; il est retiré quand le clavier se referme.
 * Inactif sur le web (pas de clavier matériel).
 */
export function useKeyboardAvoidance() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanupShow: (() => void) | undefined;
    let cleanupHide: (() => void) | undefined;
    let keyboardOpen = false;
    let lastKeyboardHeight = 0;
    const visualViewport = window.visualViewport ?? null;

    const applyCompensation = () => {
      setKeyboardHeight(
        computeKeyboardCompensation(
          lastKeyboardHeight,
          window.innerHeight,
          visualViewport ? visualViewport.height : null,
        ),
      );
    };

    // Le redimensionnement natif (ou son aboutissement) modifie
    // innerHeight / visualViewport PENDANT que le clavier est ouvert :
    // recalculer pour ne jamais compter deux fois.
    const onViewportChange = () => {
      if (keyboardOpen) applyCompensation();
    };
    visualViewport?.addEventListener("resize", onViewportChange);
    window.addEventListener("resize", onViewportChange);

    void Keyboard.addListener("keyboardDidShow", ({ keyboardHeight: h }) => {
      keyboardOpen = true;
      lastKeyboardHeight = h ?? 0;
      applyCompensation();
    })
      .then((sub) => {
        cleanupShow = () => void sub.remove();
      })
      .catch(() => {});

    void Keyboard.addListener("keyboardDidHide", () => {
      keyboardOpen = false;
      lastKeyboardHeight = 0;
      setKeyboardHeight(0);
    })
      .then((sub) => {
        cleanupHide = () => void sub.remove();
      })
      .catch(() => {});

    return () => {
      visualViewport?.removeEventListener("resize", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
      cleanupShow?.();
      cleanupHide?.();
    };
  }, []);

  return keyboardHeight;
}
