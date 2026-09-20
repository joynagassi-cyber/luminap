import { create } from "zustand";
import { applyThemeMode, getStoredThemeMode, type ThemeMode } from "@/ionic/themes";

interface ThemeModeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

/**
 * Mode clair/sombre de Lumina — sombre par défaut, choix persisté
 * (localStorage `lumina-theme-mode`, géré par applyThemeMode/persistThemeMode
 * dans src/ionic/themes.ts). Le store ne fait que relier l'état React au
 * moteur d'application.
 */
export const useThemeModeStore = create<ThemeModeState>()((set, get) => ({
  mode: getStoredThemeMode(),
  setMode: (mode) => {
    applyThemeMode(mode);
    set({ mode });
  },
  toggleMode: () => {
    const next: ThemeMode = get().mode === "dark" ? "light" : "dark";
    get().setMode(next);
  },
}));
