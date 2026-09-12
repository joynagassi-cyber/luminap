/**
 * Reporting & Archives route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const Archives = lazy(() => import("@/pages/Archives"));
const Reports = lazy(() => import("@/pages/Reports"));
const ReportBuilder = lazy(() => import("@/pages/ReportBuilder"));
const Cotisations = lazy(() => import("@/pages/Cotisations"));

export const reportRoutes: ReactElement[] = [
  <Route
    key="/archives"
    path="/archives"
    element={<LazyRoute component={Archives} />}
  />,
  <Route
    key="/reports"
    path="/reports"
    element={<LazyRoute component={Reports} />}
  />,
  <Route
    key="/report-builder"
    path="/report-builder"
    element={<LazyRoute component={ReportBuilder} />}
  />,
  <Route
    key="/cotisations"
    path="/cotisations"
    element={<LazyRoute component={Cotisations} />}
  />,
];
