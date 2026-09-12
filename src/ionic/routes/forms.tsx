/**
 * Forms (dynamic form system) route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const FormBuilder = lazy(() => import("@/pages/FormBuilder"));
const FormFill = lazy(() => import("@/pages/FormFill"));
const FormSubmissions = lazy(() => import("@/pages/FormSubmissions"));
const CustomFields = lazy(() => import("@/pages/CustomFields"));

export const formRoutes: ReactElement[] = [
  <Route
    key="/forms"
    path="/forms"
    element={<LazyRoute component={FormBuilder} />}
  />,
  <Route
    key="/form/fill/:id"
    path="/form/fill/:id"
    element={<LazyRoute component={FormFill} />}
  />,
  <Route
    key="/forms/:id/submissions"
    path="/forms/:id/submissions"
    element={<LazyRoute component={FormSubmissions} />}
  />,
  <Route
    key="/custom-fields"
    path="/custom-fields"
    element={<LazyRoute component={CustomFields} />}
  />,
];
