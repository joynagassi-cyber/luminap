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
    key="*"
    path="*"
    element={<LazyRoute component={NotFound} />}
  />,
];
