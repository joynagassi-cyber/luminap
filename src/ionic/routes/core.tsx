/**
 * Core (main navigation) route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Tutorial = lazy(() => import("@/pages/Tutorial"));

export const coreRoutes: ReactElement[] = [
  <Route
    key="/dashboard"
    path="/dashboard"
    element={<LazyRoute component={Dashboard} />}
  />,
  <Route
    key="/notifications"
    path="/notifications"
    element={<LazyRoute component={Notifications} />}
  />,
  <Route
    key="/tutoriel"
    path="/tutoriel"
    element={<LazyRoute component={Tutorial} />}
  />,
];
