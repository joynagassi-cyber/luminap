# Variables d'environnement — Lumina (test E2E)

## Noms de variables requises (valeurs factices pour `webServer.env`)

| Nom | Valeur factice (test) | Origine dans src | Usage |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `https://example-dummy.supabase.co` | `src/integrations/supabase/client.ts:5`, `src/lib/auth.ts:20`, `src/lib/powersync/SupabaseConnector.ts:96` | Supabase REST + RLS |
| `VITE_SUPABASE_ANON_KEY` | `dummy-anon-key-0000000000000000` (ne contient jamais la vraie valeur) | `src/integrations/supabase/client.ts:6`, `src/lib/auth.ts:21`, `src/lib/powersync/SupabaseConnector.ts:98` | Supabase anon key |
| `VITE_POWERSYNC_URL` | `https://example-dummy.powersync.local` | `src/lib/powersync/SupabaseConnector.ts:97` | PowerSync relay |
| `VITE_ONESIGNAL_APP_ID` | `00000000-0000-0000-0000-000000000000` | `src/lib/authOneSignal.ts:12`, `src/lib/onesignal.ts:780` | OneSignal app id |
| `CAPACITOR_BUILD` | `false` | `vite.config.ts:10` (`process.env.CAPACITOR_BUILD === "true"` → détermine si le build est Capacitor) | Build flags (ne pas poser → reste absent par défaut, ok) |

## Variables optionnelles

| Nom | Note |
|---|---|
| `TEST_SUPABASE_URL` | Présence de cette variable (niveau utilisateur Windows) active le mode `backend-test`. Absente actuellement → mode `sans-backend`. |
| `TEST_SUPABASE_ANON_KEY` | Idem. Nécessaire conjointement avec `TEST_SUPABASE_URL`. |
| `DYAD_TEST_USER_EMAIL` | Utilisé par `e2e-tests/*.spec.ts` (suite existante) pour login. Non utilisée par cette session. |
| `DYAD_TEST_USER_PASSWORD` | Idem. |

## Valeurs interdites

Ne jamais lire, afficher ou journaliser les **valeurs** réelles de :
- `VITE_SUPABASE_ANON_KEY` (issue de `.env` / `.env.local`)
- `ANTHROPIC_API_KEY`
- `AGNES_API_KEY`
- tout cookie, jeton, session

Seuls les **noms** de ces variables sont recensés ici.

## Comment utiliser dans `webServer.env` (extrait de `e2e/playwright.config.ts`)

```typescript
webServer: {
  command: 'npm run dev',
  port: 8080,
  env: {
    VITE_SUPABASE_URL: 'https://example-dummy.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'dummy-anon-key-0000000000000000',
    VITE_POWERSYNC_URL: 'https://example-dummy.powersync.local',
    VITE_ONESIGNAL_APP_ID: '00000000-0000-0000-0000-000000000000',
  },
}
```
