/**
 * Auth route section. Every route lazy-loads its page through LazyRoute
 * (skeleton fallback + error boundary).
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

const Splash = lazy(() => import("@/pages/Splash"));
const Sessions = lazy(() => import("@/pages/Sessions"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));

export const authRoutes: ReactElement[] = [
  <Route
    key="/splash"
    path="/splash"
    element={<LazyRoute component={Splash} />}
  />,
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
  // après déconnexion ; un clic re-ouvre la session.
  <Route
    key="/sessions"
    path="/sessions"
    element={<LazyRoute component={Sessions} />}
  />,
  <Route
    key="/onboarding"
    path="/onboarding"
    element={<LazyRoute component={Onboarding} />}
  />,
];
