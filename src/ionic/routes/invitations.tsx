/**
 * Invitations (QR / code) route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const InvitationEmit = lazy(() => import("@/pages/InvitationEmit"));
const InvitationClaim = lazy(() => import("@/pages/InvitationClaim"));
const InvitationManage = lazy(() => import("@/pages/InvitationManage"));

export const invitationRoutes: ReactElement[] = [
  <Route
    key="/invitation/emit"
    path="/invitation/emit"
    element={<LazyRoute component={InvitationEmit} />}
  />,
  <Route
    key="/invitation/claim"
    path="/invitation/claim"
    element={<LazyRoute component={InvitationClaim} />}
  />,
  <Route
    key="/invitation/manage"
    path="/invitation/manage"
    element={<LazyRoute component={InvitationManage} />}
  />,
];
