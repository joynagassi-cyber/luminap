import { createContext, useContext } from "react";
import type { ThemeId, ThemeMode } from "@/ionic/themes";
import type { ThemeEffects } from "./effects";

export interface ThemeContextValue {
  themeId: ThemeId;
  mode: ThemeMode;
  effects: ThemeEffects;
  setTheme: (id: ThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  setEffects: (effects: ThemeEffects) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme doit être utilisé dans ThemeProvider");
  return context;
}
