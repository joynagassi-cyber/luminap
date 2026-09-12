/**
 * Groups route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const Groups = lazy(() => import("@/pages/Groups"));
const GroupDetail = lazy(() => import("@/pages/GroupDetail"));
const GroupCotisation = lazy(() => import("@/pages/GroupCotisation"));

export const groupRoutes: ReactElement[] = [
  <Route
    key="/groups"
    path="/groups"
    element={<LazyRoute component={Groups} />}
  />,
  <Route
    key="/groups/:id"
    path="/groups/:id"
    element={<LazyRoute component={GroupDetail} />}
  />,
  <Route
    key="/groups/:id/cotisation"
    path="/groups/:id/cotisation"
    element={<LazyRoute component={GroupCotisation} />}
  />,
];
