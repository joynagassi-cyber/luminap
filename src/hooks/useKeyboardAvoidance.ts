// Fixed: Capacitor — keyboard-avoidance hook (Android/iOS hardware keyboard occludes bottom-anchored CTA on form pages)
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

/**
 * Évitement du clavier matériel (Android) / clavier iOS sur les pages à
 * formulaire : quand le clavier apparaît, on pousse le contenu vers le haut
 * (padding-bottom = hauteur du clavier, max 300px) pour que le CTA bas et
 * le champ actif ne restent pas masqués ; il est retiré quand le clavier
 * se referme. Inactif sur le web (pas de clavier matériel).
 */
export function useKeyboardAvoidance() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanupShow: (() => void) | undefined;
    let cleanupHide: (() => void) | undefined;

    void Keyboard.addListener("keyboardDidShow", ({ keyboardHeight: h }) => {
      setKeyboardHeight(Math.min(h ?? 0, 300));
    })
      .then((sub) => {
        cleanupShow = () => void sub.remove();
      })
      .catch(() => {});

    void Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    })
      .then((sub) => {
        cleanupHide = () => void sub.remove();
      })
      .catch(() => {});

    return () => {
      cleanupShow?.();
      cleanupHide?.();
    };
  }, []);

  return keyboardHeight;
}
