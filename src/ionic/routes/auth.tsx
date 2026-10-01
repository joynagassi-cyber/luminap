/**
 * Auth route section.
 * Only the lightweight `Sessions` hub loads eagerly; the auth pages and
 * onboarding are heavy enough to lazy-load.
 *
 * Note: the legacy local `Login` page (pre-name + role, no backend) and the
 * standalone `RoleSelection` page have been removed. Real auth happens on
 * `/auth` (AuthPage), and the role is resolved inside onboarding (creator)
 * or by invitation claim (member) — never on a separate screen.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

import Splash from "@/pages/Splash";
import Sessions from "@/pages/Sessions";

const Onboarding = lazy(() => import("@/pages/Onboarding"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));

export const authRoutes: ReactElement[] = [
  <Route key="/splash" path="/splash" element={<Splash />} />,
  <Route
    key="/auth"
    path="/auth"
    element={<LazyRoute component={AuthPage} />}
  />,
  <Route
    key="/auth/callback"
    path="/auth/callback"
    element={<LazyRoute component={AuthPage} />}
  />,
  // « Mes comptes » : hub de persistance de session — les comptes y restent
  // après déconnexion ; un clic re-ouvre la session. Page légère (eager).
  <Route key="/sessions" path="/sessions" element={<Sessions />} />,
  <Route
    key="/onboarding"
    path="/onboarding"
    element={<LazyRoute component={Onboarding} />}
  />,
];
