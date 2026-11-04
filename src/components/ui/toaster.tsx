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
 *
 * Le thème est maintenant lu sur la source de vérité de l'application
 * (`data-theme` sur `<html>`).
 *
 * POSITION — `top-center`, volontairement. Le déplacer en bas a été essayé
 * puis REJETÉ : le toast a `--z-toast` (70) contre `--z-nav` (40), il passait
 * donc AU-DESSUS de la barre d'onglets — soit exactement sur la navigation
 * principale, en masquant des boutons pendant plusieurs secondes. Un toast qui
 * recouvre brièvement un titre est bien moins gênant qu'un toast qui bloque
 * l'accès aux onglets. La marge haute évite la barre d'état native.
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
      // Haut de l'écran : ne recouvre JAMAIS la barre d'onglets (z-toast 70 >
      // z-nav 40), contrairement à un placement en bas.
      position="top-center"
      // Marge haute = inset de la barre d'état native (source unique depuis
      // A3) + un peu d'air, pour ne pas coller à l'encoche.
      offset={{ top: "calc(8px + var(--ion-safe-area-top, 0px))" }}
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
