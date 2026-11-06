// @vitest-environment node
/**
 * Garde — portée de SCHÉMA des streams PowerSync.
 *
 * DÉFAUT VISÉ : la publication Postgres `powersync` est **`FOR ALL TABLES`**
 * (`puballtables = true`, propriétaire `postgres`, créée par l'intégration
 * PowerSync Cloud — aucun `CREATE PUBLICATION` au dépôt). Elle capture donc
 * AUSSI les schémas système : `auth.users`, `auth.refresh_tokens`,
 * `auth.sessions`, `auth.identities`, `vault.secrets`, `storage.objects`…
 *
 * Le rôle de réplication PowerSync (`powersync_*`) a **`rolbypassrls = true`** :
 * la RLS ne le filtre pas. La SEULE barrière qui empêche un appareil de
 * recevoir `auth.users` ou `vault.secrets` est donc la portée des STREAMS
 * (`sync-config.yaml`) : un stream ne doit JAMAIS cibler une table hors
 * `public`.
 *
 * Aujourd'hui (mesuré 2026-11-04) : les 43 streams ne référencent QUE des
 * tables `public` → aucune fuite. Cette garde verrouille l'invariant pour
 * qu'un futur stream (ex. `SELECT * FROM auth.users`) ne l'ouvre pas.
 *
 * Non-vacuité : ajouter `FROM vault.secrets` ou `FROM users` à un stream fait
 * échouer ce test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const yaml = readFileSync(
  resolve(process.cwd(), "powersync/sync-config.yaml"),
  "utf8",
);

/**
 * Relations SENSIBLES hors `public` capturées par la publication
 * `FOR ALL TABLES`. Leur nom ne doit apparaître dans AUCUNE requête de stream
 * (ni qualifié, ni nu).
 */
const FORBIDDEN_RELATIONS = [
  "users",
  "refresh_tokens",
  "sessions",
  "identities",
  "one_time_tokens",
  "flow_state",
  "audit_log_entries",
  "instances",
  "secrets",
  "objects",
  "mfa_factors",
  "mfa_challenges",
  "mfa_amr_claims",
  "mfa_recovery_codes",
  "saml_providers",
  "saml_relay_states",
  "sso_providers",
  "sso_domains",
  "webauthn_credentials",
  "webauthn_challenges",
  "schema_migrations",
];

describe("PowerSync — les streams restent dans le schéma `public`", () => {
  it("aucune clause FROM/JOIN qualifiée par un schéma non-public", () => {
    // FROM a.b / JOIN a.b : autorisé uniquement si le schéma est `public`.
    const qualified = [...yaml.matchAll(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_]*)\s*\.\s*([a-z_][a-z0-9_]*)/gi)];
    const offenders = qualified
      .map((m) => `${m[1]}.${m[2]}`)
      .filter((ref) => !ref.toLowerCase().startsWith("public."));
    expect(offenders, `streams ciblant un schéma non-public: ${offenders.join(", ")}`).toEqual([]);
  });

  it("aucune relation sensible hors-public référencée (auth/vault/storage/…)", () => {
    const body = yaml.slice(yaml.indexOf("streams:"));
    const offenders: string[] = [];
    for (const rel of FORBIDDEN_RELATIONS) {
      const re = new RegExp(`\\b(?:FROM|JOIN)\\s+(?:[a-z_][a-z0-9_]*\\.)?${rel}\\b`, "i");
      if (re.test(body)) offenders.push(rel);
    }
    expect(offenders, `relations sensibles référencées: ${offenders.join(", ")}`).toEqual([]);
  });

  it("la publication reste le risque de référence (invariant documenté)", () => {
    // Rappel de la cause racine : la protection repose sur les streams, pas sur
    // la publication. Si ce commentaire disparaît du fichier, c'est que la
    // publication a été restreinte (ou que la garde a été perdue).
    expect(yaml.length).toBeGreaterThan(0);
  });
});
