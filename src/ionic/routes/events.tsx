/**
 * Events route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const Events = lazy(() => import("@/pages/Events"));
const EventNew = lazy(() => import("@/pages/EventNew"));
const EventDetail = lazy(() => import("@/pages/EventDetail"));
const EventEdit = lazy(() => import("@/pages/EventEdit"));

export const eventRoutes: ReactElement[] = [
  <Route
    key="/events"
    path="/events"
    element={<LazyRoute component={Events} />}
  />,
  <Route
    key="/event/new"
    path="/event/new"
    element={<LazyRoute component={EventNew} />}
  />,
  <Route
    key="/event/:id"
    path="/event/:id"
    element={<LazyRoute component={EventDetail} />}
  />,
  <Route
    key="/event/:id/edit"
    path="/event/:id/edit"
    element={<LazyRoute component={EventEdit} />}
  />,
];
