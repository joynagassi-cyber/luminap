import { create } from "zustand";
import {
  applyThemeMode,
  getStoredThemeMode,
  resolveThemeMode,
  type ThemeMode,
} from "@/ionic/themes";

interface ThemeModeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

/**
 * Mode d'affichage de Lumina — « system » par défaut (suit le réglage de l'OS),
 * choix persisté (localStorage `lumina-theme-mode`, géré par
 * applyThemeMode/persistThemeMode dans src/ionic/themes.ts). Le store ne fait
 * que relier l'état React au moteur d'application.
 */
export const useThemeModeStore = create<ThemeModeState>()((set) => ({
  mode: getStoredThemeMode(),
  setMode: (mode) => {
    applyThemeMode(mode);
    set({ mode });
  },
  toggleMode: () => {
    const resolved = resolveThemeMode(useThemeModeStore.getState().mode);
    const next: ThemeMode = resolved === "dark" ? "light" : "dark";
    applyThemeMode(next);
    set({ mode: next });
  },
}));
