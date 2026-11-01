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
const Welcome = lazy(() => import("@/pages/Welcome"));
const Sessions = lazy(() => import("@/pages/Sessions"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const OnboardingChoice = lazy(() => import("@/pages/OnboardingChoice"));
const OnboardingMembers = lazy(() => import("@/pages/OnboardingMembers"));
const InvitationClaim = lazy(() => import("@/pages/InvitationClaim"));
const InvitationSuccess = lazy(() => import("@/pages/InvitationSuccess"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));

export const authRoutes: ReactElement[] = [
  <Route
    key="/splash"
    path="/splash"
    element={<LazyRoute component={Splash} />}
  />,
  <Route
    key="/welcome"
    path="/welcome"
    element={<LazyRoute component={Welcome} />}
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
  // Choix du parcours : créer son organisation ou rejoindre par invitation
  <Route
    key="/onboarding/choice"
    path="/onboarding/choice"
    element={<LazyRoute component={OnboardingChoice} />}
  />,
  // Présentation des fonctionnalités (7 écrans illustrés)
  <Route
    key="/onboarding"
    path="/onboarding"
    element={<LazyRoute component={Onboarding} />}
  />,
  // Ajout des membres de l’équipe de gestion (QR code + code invitation)
  <Route
    key="/onboarding/members"
    path="/onboarding/members"
    element={<LazyRoute component={OnboardingMembers} />}
  />,
  // Revendication d’une invitation (saisie du code ou scan QR)
  <Route
    key="/invitation/claim"
    path="/invitation/claim"
    element={<LazyRoute component={InvitationClaim} />}
  />,
  // Confirmation d’adhésion à l’organisation
  <Route
    key="/invitation/success"
    path="/invitation/success"
    element={<LazyRoute component={InvitationSuccess} />}
  />,
];
