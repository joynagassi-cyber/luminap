/**
 * État de l'onboarding — persistant en localStorage (mode demo / local-only).
 * Aucune dépendance Supabase.
 */

export type OrgTypeChoice = "Eglise" | "Ecole" | "ONG" | "Entreprise" | "Institution" | "Custom";

export interface OnboardingOrg {
  name: string;
  sigle: string;
  type: OrgTypeChoice;
  theme: string;
  features: string[];
}

export interface OnboardingState {
  screen: number;
  branch: "creator" | "member" | null;
  org: OnboardingOrg;
  role: string | null;
  completed: boolean;
}

const DEFAULT_STATE: OnboardingState = {
  screen: 0,
  branch: null,
  org: { name: "", sigle: "", type: "Eglise", theme: "orange", features: [] },
  role: null,
  completed: false,
};

const STORAGE_KEY = "lumina-onboarding";
export const LEGACY_ONBOARDED_KEY = "lumina-onboarded";
export const LEGACY_ROLE_KEY = "lumina-role";

export function defaultOnboardingState(): OnboardingState {
  return { ...DEFAULT_STATE };
}

export function loadOnboardingState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, completed: isCompleted() };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      screen: typeof parsed.screen === "number" ? parsed.screen : 0,
      branch: parsed.branch ?? null,
      org: parsed.org ?? DEFAULT_STATE.org,
      role: parsed.role ?? null,
      completed: isCompleted(),
    };
  } catch {
    return { ...DEFAULT_STATE, completed: isCompleted() };
  }
}

export function saveOnboardingState(state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function completeOnboarding(state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, completed: true }));
    localStorage.setItem(LEGACY_ONBOARDED_KEY, "true");
    if (state.role) {
      localStorage.setItem(LEGACY_ROLE_KEY, state.role);
    } else {
      localStorage.removeItem(LEGACY_ROLE_KEY);
    }
  } catch {}
}

export function needsOnboarding(): boolean {
  try {
    const completed = localStorage.getItem(LEGACY_ONBOARDED_KEY) === "true";
    const role = localStorage.getItem(LEGACY_ROLE_KEY);
    return !completed || !role;
  } catch {
    return true;
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("lumina-onboarding-state");
    localStorage.removeItem(LEGACY_ONBOARDED_KEY);
    localStorage.removeItem(LEGACY_ROLE_KEY);
  } catch {}
}

function isCompleted(): boolean {
  try {
    return localStorage.getItem(LEGACY_ONBOARDED_KEY) === "true";
  } catch {
    return false;
  }
}
