/**
 * Central Administration (multi-org) route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const CentralAdmin = lazy(() => import("@/pages/CentralAdmin"));
const OrgSetup = lazy(() => import("@/pages/OrgSetup"));
const Federation = lazy(() => import("@/pages/Federation"));

export const adminRoutes: ReactElement[] = [
  <Route
    key="/org-setup"
    path="/org-setup"
    element={<LazyRoute component={OrgSetup} />}
  />,
  <Route
    key="/admin"
    path="/admin"
    element={<LazyRoute component={CentralAdmin} />}
  />,
  <Route
    key="/admin/federation"
    path="/admin/federation"
    element={<LazyRoute component={Federation} />}
  />,
  <Route
    key="/admin/organizations/:id"
    path="/admin/organizations/:id"
    element={<LazyRoute component={CentralAdmin} />}
  />,
];
