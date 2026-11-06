import { useEffect, useRef } from "react";
import { registerHardwareBack } from "@/platform/hardwareBack";

/**
 * Ferme un overlay MAISON (feuille, tiroir, modale `role="dialog"`) sur le
 * bouton retour matériel Android, tant qu'il est `active`.
 *
 * Délègue à la façade `@/platform/hardwareBack` (priorité au-dessus des
 * overlays Ionic et du routeur). No-op sur le web.
 *
 * @param active vrai quand l'overlay est ouvert.
 * @param onBack fermeture de l'overlay.
 */
export function useHardwareBack(active: boolean, onBack: () => void): void {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => {
    if (!active) return;
    return registerHardwareBack(() => ref.current());
  }, [active]);
}
