/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_JWKS_URL: string;
  /** OAuth Google — URL de callback Web (Supabase Redirect URLs). */
  readonly VITE_OAUTH_REDIRECT_URL?: string;
  readonly VITE_POWERSYNC_URL: string;
  readonly VITE_ONESIGNAL_APP_ID?: string;
  /** Sentry — DSN public (embarqué dans le bundle, pas un secret). */
  readonly VITE_SENTRY_DSN?: string;
  /** Sentry — environnement explicite (défaut : dérivé de MODE). */
  readonly VITE_SENTRY_ENV?: string;
  /** Version de release (ex. tag git) pour associer les erreurs au code. */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
