/**
 * Finance route section.
 */
import type { ReactElement } from "react";
import { lazy } from "react";
import { Route } from "react-router-dom";

import { LazyRoute } from "./lazy-route";

const Finance = lazy(() => import("@/pages/Finance"));
const TransactionNew = lazy(() => import("@/pages/TransactionNew"));
const TransactionNewGroup = lazy(() => import("@/pages/TransactionNewGroup"));
const TransactionDetail = lazy(() => import("@/pages/TransactionDetail"));
const TransactionEdit = lazy(() => import("@/pages/TransactionEdit"));
const Balance = lazy(() => import("@/pages/Balance"));
const Versement = lazy(() => import("@/pages/Versement"));
const SaisieRapide = lazy(() => import("@/pages/SaisieRapide"));

export const financeRoutes: ReactElement[] = [
  <Route
    key="/finance"
    path="/finance"
    element={<LazyRoute component={Finance} />}
  />,
  <Route
    key="/transaction/new"
    path="/transaction/new"
    element={<LazyRoute component={TransactionNew} />}
  />,
  <Route
    key="/groups/:id/transaction/new"
    path="/groups/:id/transaction/new"
    element={<LazyRoute component={TransactionNewGroup} />}
  />,
  <Route
    key="/transaction/:id"
    path="/transaction/:id"
    element={<LazyRoute component={TransactionDetail} />}
  />,
  <Route
    key="/transaction/:id/edit"
    path="/transaction/:id/edit"
    element={<LazyRoute component={TransactionEdit} />}
  />,
  <Route
    key="/balance"
    path="/balance"
    element={<LazyRoute component={Balance} />}
  />,
  <Route
    key="/versement"
    path="/versement"
    element={<LazyRoute component={Versement} />}
  />,
  <Route
    key="/saisie-rapide/:id"
    path="/saisie-rapide/:id"
    element={<LazyRoute component={SaisieRapide} />}
  />,
];
