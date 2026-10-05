/**
 * Sentry — initialisation du SDK web (React) pour Lumina.
 *
 * Branché au tout début du boot (voir src/main.tsx, avant createRoot) afin
 * de capturer les erreurs de la phase de préchargement (PowerSync, thèmes,
 * Ionic). Le DSN est fourni par l'environnement ; si absent (ex. build
 * dev local sans config), le SDK est initialisé en mode « débranché » :
 * aucune erreur n'est perdue, il suffit de brancher le DSN pour activer le
 * remontage.
 */

import * as Sentry from "@sentry/react";

const dsn: string | undefined = import.meta.env.VITE_SENTRY_DSN;

/**
 * Environnement envoyé à Sentry. Derivé automatiquement du mode Vite :
 * `production` pour `pnpm build` / `build:cap`, `development` sinon.
 * Un override explicite via VITE_SENTRY_ENV est possible.
 */
function resolveEnvironment(): string {
  const explicit = import.meta.env.VITE_SENTRY_ENV as string | undefined;
  if (explicit) return explicit;
  return import.meta.env.MODE === "production" ? "production" : "development";
}

export const sentryEnvironment = resolveEnvironment();

// Taux d'échantillonnage traces (session replay) — 100 % en dev/staging
// pour le débogage, 10 % en production pour limiter le volume.
const traceSampleRate = sentryEnvironment === "production" ? 0.1 : 1.0;

export function initSentry(): void {
  Sentry.init({
    dsn: dsn,
    environment: sentryEnvironment,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    // Le dsn vide (absent) désactive l'envoi mais garde le SDK actif.
    enabled: Boolean(dsn),
    tracesSampleRate: traceSampleRate,
    // Réduit le bruit : on ignore les erreurs de type "SupabaseAuthApiError"
    // (erreurs métier attendues) et les bounces réels qui ne portent pas.
    ignoreErrors: [
      "ResizeObserver loop",
      "Request aborted",
      "NetworkError when attempting to fetch resource",
    ],
    // On ne capture pas les erreurs de console (console.error) par défaut ;
    // on active le replays uniquement en production.
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
  });
}

export default Sentry;
