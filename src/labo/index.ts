/**
 * Labo Design — barrel export.
 *
 * Ce module est le point d'entrée unique du Labo. Il est volontairement
 * maintenu séparé du reste de l'application pour pouvoir être exclu du
 * bundle de production via le garde de compilation (labo-guard.ts).
 */

export { isLaboEnabled, assertLaboAbsentFromBuild, LABO_SEED_IDS } from "./labo-guard";
export type { LaboScenario } from "./seed";
export { generateLaboSeed, type LaboSeedData } from "./seed";
export {
  initFauxSession,
  getFauxSession,
  setFauxRole,
  setFauxOrg,
  signOutFaux,
  type FauxSession,
} from "./faux-adaptateurs";
export {
  saveFauxLogo,
  getFauxLogo,
  removeFauxLogo,
} from "./faux-adaptateurs";
export {
  setFauxGoogleFailure,
  fauxSignInWithGoogle,
  type FauxGoogleResult,
} from "./faux-adaptateurs";
export {
  getFauxNotifications,
  markFauxNotificationRead,
  addFauxNotification,
  requestFauxPushPermission,
} from "./faux-adaptateurs";
