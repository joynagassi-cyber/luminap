/**
 * Auth route section.
 * Lightweight landing pages load eagerly (no Suspense boundary needed);
 * onboarding is heavy enough to lazy-load.
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
import AuthPage from "@/pages/AuthPage";

const Onboarding = lazy(() => import("@/pages/Onboarding"));

export const authRoutes: ReactElement[] = [
  <Route key="/splash" path="/splash" element={<Splash />} />,
  <Route key="/auth" path="/auth" element={<AuthPage />} />,
  <Route key="/auth/callback" path="/auth/callback" element={<AuthPage />} />,
  <Route
    key="/onboarding"
    path="/onboarding"
    element={<LazyRoute component={Onboarding} />}
  />,
];
