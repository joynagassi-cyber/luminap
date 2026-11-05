import { create } from "zustand";

export type ThemeEffects = "full" | "lite";
export const EFFECTS_STORAGE_KEY = "lumina-theme-effects";

type DeviceHints = { deviceMemory?: number; hardwareConcurrency?: number };

/** Valeurs absentes ou invalides = inconnues, pas un appareil lent prouvé. */
export function detectEffects(device?: DeviceHints): ThemeEffects {
  const memory = device?.deviceMemory;
  const cores = device?.hardwareConcurrency;
  return ((typeof memory === "number" && Number.isFinite(memory) && memory > 0 && memory <= 2) ||
    (typeof cores === "number" && Number.isFinite(cores) && cores > 0 && cores <= 4)) ? "lite" : "full";
}

export function getStoredEffects(): ThemeEffects | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const value = localStorage.getItem(EFFECTS_STORAGE_KEY);
    return value === "full" || value === "lite" ? value : null;
  } catch { return null; }
}

export function getInitialEffects(): ThemeEffects {
  return getStoredEffects() ?? detectEffects(typeof navigator === "undefined" ? undefined : navigator);
}

export function applyEffects(effects: ThemeEffects, persist = true): void {
  if (typeof document !== "undefined") document.documentElement.dataset.effects = effects;
  if (persist) {
    try { localStorage.setItem(EFFECTS_STORAGE_KEY, effects); } catch { /* choix conservé en mémoire */ }
  }
}

interface EffectsState {
  effects: ThemeEffects;
  setEffects: (effects: ThemeEffects) => void;
}

export const useEffectsStore = create<EffectsState>()((set) => ({
  effects: getInitialEffects(),
  setEffects: (effects) => {
    applyEffects(effects);
    set({ effects });
  },
}));
