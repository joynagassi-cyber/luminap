/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_JWKS_URL: string;
  /** OAuth Google — URL de callback Web (Supabase Redirect URLs). */
  readonly VITE_OAUTH_REDIRECT_URL?: string;
  readonly VITE_POWERSYNC_URL: string;
  readonly VITE_ONESIGNAL_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
