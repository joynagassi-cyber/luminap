/**
 * Central Administration (multi-org) route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const CentralAdmin = lazy(() => import("@/pages/CentralAdmin"));
const OrgSetup = lazy(() => import("@/pages/OrgSetup"));
const Federation = lazy(() => import("@/pages/Federation"));
const OrgUnits = lazy(() => import("@/pages/OrgUnits"));
const OrgReportSend = lazy(() => import("@/pages/OrgReportSend"));
const OrgReportsReceived = lazy(() => import("@/pages/OrgReportsReceived"));

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
  // M22 — vue unifiée liste/graphe : le route /admin/federation/tree est
  // obsolète (la vue graphe est un mode du composant Federation), on le
  // laisse comme redirect rétro-compat.
  <Route
    key="/admin/federation"
    path="/admin/federation"
    element={<LazyRoute component={Federation} />}
  />,
  <Route
    key="/admin/federation/tree"
    path="/admin/federation/tree"
    element={<Navigate replace to="/admin/federation" />}
  />,
  // B.8 — route OrgUnits (précédemment inatteignable : déclarée mais jamais montée)
  <Route
    key="/admin/units"
    path="/admin/units"
    element={<LazyRoute component={OrgUnits} />}
  />,
  // Phase 3 Feature 2 — page d'émission du rapport de gestion inter-organisations
  // (gating : org courante ayant une mère ; accès via section « Mes annexes »).
  <Route
    key="/admin/report-send"
    path="/admin/report-send"
    element={<LazyRoute component={OrgReportSend} />}
  />,
  // Phase 4 Feature 2 — page de réception des rapports de gestion
  // inter-organisations (gating : org courante avec ≥1 annexe OU ≥1 rapport
  // reçu — cf. `OrgReportsReceived.tsx`) + détail `/admin/reports/:id`
  // (monté par T4.3 — `OrgReportDetail`, à venir dans ce même fichier).
  <Route
    key="/admin/reports"
    path="/admin/reports"
    element={<LazyRoute component={OrgReportsReceived} />}
  />,
  <Route
    key="/admin/organizations/:id"
    path="/admin/organizations/:id"
    element={<LazyRoute component={CentralAdmin} />}
  />,
];
