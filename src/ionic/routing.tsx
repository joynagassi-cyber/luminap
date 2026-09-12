/**
 * Lumina Ionic Router Routes — compatibility re-export.
 *
 * The routes have been restructured into per-section files under
 * `src/ionic/routes/` (auth, core, finance, groups, events, members,
 * reports, forms, invitations, admin, system). This module only re-exports
 * the composed registry so existing imports keep working while the registry
 * lives in one obvious place.
 *
 * See src/ionic/routes/index.ts for the full layout and for the critical
 * note on why `luminaRoutes` MUST be a plain array, not a Fragment.
 */
export { luminaRoutes, ROUTE_COUNT } from "./routes";
