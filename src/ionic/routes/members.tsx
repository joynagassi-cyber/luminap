/**
 * Members route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const Members = lazy(() => import("@/pages/Members"));
const MembresEnAvance = lazy(() => import("@/pages/MembresEnAvance"));
const MembreDetail = lazy(() => import("@/pages/MembreDetail"));
const CulteDetail = lazy(() => import("@/pages/CulteDetail"));

export const memberRoutes: ReactElement[] = [
  <Route
    key="/members"
    path="/members"
    element={<LazyRoute component={Members} />}
  />,
  <Route
    key="/membres-en-avance"
    path="/membres-en-avance"
    element={<LazyRoute component={MembresEnAvance} />}
  />,
  <Route
    key="/membre/:id"
    path="/membre/:id"
    element={<LazyRoute component={MembreDetail} />}
  />,
  <Route
    key="/culte/:id"
    path="/culte/:id"
    element={<LazyRoute component={CulteDetail} />}
  />,
];
