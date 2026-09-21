/**
 * System route section (trace, history, help, settings, not-found).
 *
 * The wildcard `*` route is the single catch-all for the whole app. It is
 * intentionally defined here (and NOT duplicated in App.tsx) so there is one
 * source of truth for the fallback page.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const Trace = lazy(() => import("@/pages/Trace"));
const History = lazy(() => import("@/pages/History"));
const Help = lazy(() => import("@/pages/Help"));
const Settings = lazy(() => import("@/pages/Settings"));
const SettingsProfile = lazy(() => import("@/pages/SettingsProfile"));
const SettingsTheme = lazy(() => import("@/pages/SettingsTheme"));
const SettingsPersonalisation = lazy(() => import("@/pages/SettingsPersonalisation"));
const SettingsFeatures = lazy(() => import("@/pages/SettingsFeatures"));
const SettingsNotifications = lazy(() => import("@/pages/SettingsNotifications"));
const SettingsGestion = lazy(() => import("@/pages/SettingsGestion"));
const SettingsAbout = lazy(() => import("@/pages/SettingsAbout"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export const systemRoutes: ReactElement[] = [
  <Route
    key="/trace"
    path="/trace"
    element={<LazyRoute component={Trace} />}
  />,
  <Route
    key="/history"
    path="/history"
    element={<LazyRoute component={History} />}
  />,
  <Route
    key="/help"
    path="/help"
    element={<LazyRoute component={Help} />}
  />,
  <Route
    key="/settings"
    path="/settings"
    element={<LazyRoute component={Settings} />}
  />,
  <Route
    key="/settings/profil"
    path="/settings/profil"
    element={<LazyRoute component={SettingsProfile} />}
  />,
  <Route
    key="/settings/theme"
    path="/settings/theme"
    element={<LazyRoute component={SettingsTheme} />}
  />,
  <Route
    key="/settings/personnalisation"
    path="/settings/personnalisation"
    element={<LazyRoute component={SettingsPersonalisation} />}
  />,
  <Route
    key="/settings/features"
    path="/settings/features"
    element={<LazyRoute component={SettingsFeatures} />}
  />,
  <Route
    key="/settings/notifications"
    path="/settings/notifications"
    element={<LazyRoute component={SettingsNotifications} />}
  />,
  <Route
    key="/settings/gestion"
    path="/settings/gestion"
    element={<LazyRoute component={SettingsGestion} />}
  />,
  <Route
    key="/settings/about"
    path="/settings/about"
    element={<LazyRoute component={SettingsAbout} />}
  />,
  <Route
    key="*"
    path="*"
    element={<LazyRoute component={NotFound} />}
  />,
];
