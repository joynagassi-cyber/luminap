/**
 * Persistent onboarding state.
 *
 * The onboarding flow (presentation → branch → org-setup OR join) can be left
 * mid-way; when the user returns, the app resumes where they stopped rather
 * than restarting from screen 0. This module is the single source of truth
 * for that state, mirrored to `localStorage` so it survives reloads.
 *
 * Kept intentionally small and side-effect light: read once on load, write on
 * each step advance. Completion (entering the dashboard) also flips the
 * legacy `lumina-onboarded` / `lumina-role` flags that Splash still reads.
 */

import type { ThemeId } from "@/ionic/themes";

export type OnboardingBranch = "creator" | "member" | null;

export type OrgTypeChoice =
  | "Eglise"
  | "Ecole"
  | "ONG"
  | "Entreprise"
  | "Institution"
  | "Custom";

export interface OrgSetup {
  name: string;
  sigle: string;
  type: OrgTypeChoice | null;
  theme: ThemeId | null;
  /** Capability/feature keys the org wants enabled. */
  features: string[];
}

export interface OnboardingState {
  /** 0..N index into the presentation screens; -1 means past presentation. */
  screen: number;
  /** Which path the user took (creator / member), null until chosen. */
  branch: OnboardingBranch;
  /** Creator-side organisation configuration (only meaningful if branch=creator). */
  org: OrgSetup;
  /** Role the user picked (member or creator). */
  role: string | null;
  /** True once the whole flow is done and they entered the dashboard. */
  completed: boolean;
}

export const EMPTY_ORG_SETUP: OrgSetup = {
  name: "",
  sigle: "",
  type: null,
  theme: null,
  features: [],
};

export function defaultOnboardingState(): OnboardingState {
  return {
    screen: 0,
    branch: null,
    org: { ...EMPTY_ORG_SETUP },
    role: null,
    completed: false,
  };
}

const ONBOARD_KEY = "lumina-onboarding";
export const LEGACY_ONBOARDED_KEY = "lumina-onboarded";
export const LEGACY_ROLE_KEY = "lumina-role";

function safeGet<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — ignore, in-memory state still works */
  }
}

export function loadOnboardingState(): OnboardingState {
  const stored = safeGet<Partial<OnboardingState>>(ONBOARD_KEY);
  if (!stored) return defaultOnboardingState();
  const base = defaultOnboardingState();
  return {
    ...base,
    ...stored,
    org: { ...base.org, ...(stored.org ?? {}) },
  };
}

export function saveOnboardingState(state: OnboardingState): void {
  safeSet(ONBOARD_KEY, state);
}

/** Mark the flow done and flip the legacy flags Splash/Auth read. */
export function completeOnboarding(state: OnboardingState): void {
  const done: OnboardingState = { ...state, completed: true };
  saveOnboardingState(done);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LEGACY_ONBOARDED_KEY, "true");
    if (done.role) {
      localStorage.setItem(LEGACY_ROLE_KEY, done.role);
    }
  }
}

/**
 * Whether the onboarding still needs to run. Used to decide between sending
 * the user to the dashboard vs. resuming onboarding.
 */
export function needsOnboarding(): boolean {
  if (typeof localStorage === "undefined") return true;
  const completed = loadOnboardingState().completed;
  const legacyOnboarded = localStorage.getItem(LEGACY_ONBOARDED_KEY);
  const legacyRole = localStorage.getItem(LEGACY_ROLE_KEY);
  // Done via the new flow OR via the legacy flow.
  return !(completed || (legacyOnboarded === "true" && !!legacyRole));
}

/** Reset so the user can re-run onboarding (used by Settings "reconfigure"). */
export function resetOnboarding(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(ONBOARD_KEY);
  localStorage.removeItem(LEGACY_ONBOARDED_KEY);
  localStorage.removeItem(LEGACY_ROLE_KEY);
}
