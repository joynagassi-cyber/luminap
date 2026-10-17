/**
 * Paramètres du self-updater — à personnaliser par projet.
 * Le dépôt GitHub est PUBLIC : aucun token n'est embarqué dans l'app.
 */
export const GITHUB_OWNER = "joynagassi-cyber";
export const GITHUB_REPO = "luminap";
export const APK_ASSET_NAME = "app-release.apk";

/** Intervalle minimal entre deux vérifications (ms) — 6 heures. */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
