/**
 * Helper partagé : paire (fond, texte) de l'indicateur sélectionné.
 * Spec §6 : « surface blanche (clair) ou surface-inverse (sombre) » —
 * en clair la surface blanche est `--lu-surface`, en sombre c'est
 * `--lu-surface-inverse` ; le texte associé est toujours l'opposé.
 */
import { useContext } from "react";
import { ThemeContext } from "@/design-system/theme/theme-context";

export function useInversePair(): { bg: string; fg: string } {
  const mode = useContext(ThemeContext)?.mode ?? "dark";
  return mode === "light"
    ? { bg: "var(--lu-surface)", fg: "var(--lu-fg)" }
    : { bg: "var(--lu-surface-inverse)", fg: "var(--lu-fg-inverse)" };
}
