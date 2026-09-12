/**
 * Lumina route registry.
 *
 * The app's routes are organised in section files (auth, core, finance, …)
 * so the hierarchy stays legible as Lumina grows. Each section exports a flat
 * array of `<Route>` elements; this module concatenates them into the single
 * `luminaRoutes` array consumed by the Ionic router outlet.
 *
 * ── Why a plain array, NOT a Fragment ────────────────────────────────────
 * The Ionic view-stack engine reads its children with
 * `React.Children.toArray(children).filter(r => r.type === Route)`.
 * `React.Children.toArray` **flattens arrays** but does **NOT** unwrap a JSX
 * Fragment. If `luminaRoutes` were `<>…</>`, every route inside it would be
 * invisible to the engine: no view gets pushed, the outlet renders empty and
 * the app shows a blank screen. Keeping it a flat array is what makes the
 * Ionic router work. (This regression is what re-surfaced the white screen
 * after the multi-org migration.)
 *
 * The wildcard catch-all lives in exactly one place (system section).
 * Do not re-add a second `path="*"` elsewhere.
 */
import type { ReactElement } from "react";

import { authRoutes } from "./auth";
import { coreRoutes } from "./core";
import { financeRoutes } from "./finance";
import { groupRoutes } from "./groups";
import { eventRoutes } from "./events";
import { memberRoutes } from "./members";
import { reportRoutes } from "./reports";
import { formRoutes } from "./forms";
import { invitationRoutes } from "./invitations";
import { adminRoutes } from "./admin";
import { systemRoutes } from "./system";

export const luminaRoutes: ReactElement[] = [
  ...authRoutes,
  ...coreRoutes,
  ...financeRoutes,
  ...groupRoutes,
  ...eventRoutes,
  ...memberRoutes,
  ...reportRoutes,
  ...formRoutes,
  ...invitationRoutes,
  ...adminRoutes,
  ...systemRoutes,
];

/**
 * Total route count — derived from the actual arrays so it can never drift.
 */
export const ROUTE_COUNT = luminaRoutes.length;
