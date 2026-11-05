import { useEffect, useMemo, useState, type ReactNode } from "react";
import { applyTheme, getThemeById, getStoredThemeId, type ThemeId } from "@/ionic/themes";
import { useThemeModeStore } from "@/store/useThemeModeStore";
import { useEffectsStore } from "./effects";
import { withThemeTransition } from "./transition";

import { ThemeContext, type ThemeContextValue } from "./theme-context";

/** Pont React sur les préférences déjà utilisées par le picker et le toggle. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() =>
    getThemeById(typeof document === "undefined" ? getStoredThemeId() : document.documentElement.dataset.theme ?? getStoredThemeId()).id,
  );
  const mode = useThemeModeStore((s) => s.mode);
  const updateMode = useThemeModeStore((s) => s.setMode);
  const effects = useEffectsStore((s) => s.effects);
  const updateEffects = useEffectsStore((s) => s.setEffects);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setThemeId(getThemeById(root.dataset.theme).id);
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    themeId, mode, effects,
    setTheme: (id) => withThemeTransition(() => applyTheme(getThemeById(id))),
    setMode: (next) => withThemeTransition(() => updateMode(next)),
    setEffects: (next) => updateEffects(next),
  }), [themeId, mode, effects, updateMode, updateEffects]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
