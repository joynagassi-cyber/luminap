/**
 * Toaster unique de l'application (A6).
 *
 * DÉFAUTS CORRIGÉS
 * ---------------
 * 1. **Deux** toasters Sonner étaient montés en même temps (`ui/toaster.tsx`
 *    ET `ui/sonner.tsx`, tous deux dans `App.tsx`) : chaque message pouvait
 *    s'afficher en double, à deux positions différentes.
 * 2. Le second tirait son thème de `next-themes`, une dépendance d'écosystème
 *    Next.js que cette application (Vite + Ionic) n'utilise nulle part
 *    ailleurs : le hook renvoyait toujours « system » et ignorait le thème
 *    réel de l'application (posé par `applyStoredThemeMode` via `data-theme`).
 * 3. La position était `top-center`, donc SOUS l'en-tête Ionique et sous la
 *    barre d'état Android : un toast pouvait recouvrir le titre de l'écran.
 *
 * Le thème est maintenant lu sur la source de vérité de l'application
 * (`data-theme` sur `<html>`), et positionné en bas — au-dessus de la barre
 * d'onglets (`--z-toast`, 70) mais hors des zones d'en-tête.
 */

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useEffect, useState } from "react";

/** Thème effectif de l'application, lu sur `<html data-theme="…">`. */
function useAppTheme(): "light" | "dark" {
  const read = (): "light" | "dark" =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "light"
      ? "light"
      : "dark";

  const [theme, setTheme] = useState<"light" | "dark">(read);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function Toaster(props: ToasterProps) {
  const theme = useAppTheme();

  return (
    <Sonner
      theme={theme}
      // Bas de l'écran : ne recouvre jamais l'en-tête ni la barre d'état.
      position="bottom-center"
      // Marge au-dessus de la barre d'onglets (hauteur + inset natif fourni
      // par la couche `--ion-safe-area-bottom`, source unique depuis A3).
      offset={{ bottom: "calc(72px + var(--ion-safe-area-bottom, 0px))" }}
      toastOptions={{
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        },
      }}
      {...props}
    />
  );
}
