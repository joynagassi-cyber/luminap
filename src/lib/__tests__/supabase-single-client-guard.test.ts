// @vitest-environment node
/**
 * Garde anti-récurrence R12 — un seul client GoTrueClient « propriétaire » de la
 * session persistée.
 *
 * Défaut mesuré : `@/integrations/supabase/client` créait un 2e `createClient`
 * (sans options d'auth) partageant la clé `sb-<ref>-auth-token` avec le client
 * de `@/lib/auth` → warning « Multiple GoTrueClient instances detected » et
 * risque de course sur la session.
 *
 * Règle verrouillée ici :
 *  - `src/lib/auth.ts` est le SEUL propriétaire (persistSession/autoRefreshToken
 *    activés) ;
 *  - `src/integrations/supabase/client.ts` ne crée PAS de client (ré-export) ;
 *  - `src/lib/powersync/SupabaseConnector.ts` peut créer un client, mais
 *    uniquement NON persistant (persistSession:false).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("R12 — instance Supabase unique (propriétaire de session)", () => {
  it("integrations/supabase/client.ts ré-exporte le client (aucun createClient)", () => {
    const src = read("src/integrations/supabase/client.ts");
    expect(src).not.toMatch(/createClient\s*\(/);
    expect(src).toMatch(/export\s*\{\s*supabase\s*\}\s*from\s*"@\/lib\/auth"/);
  });

  it("lib/auth.ts possède la session persistée (propriétaire unique)", () => {
    const src = read("src/lib/auth.ts");
    expect(src).toMatch(/createClient\s*\(/);
    expect(src).toMatch(/persistSession:\s*true/);
    expect(src).toMatch(/autoRefreshToken:\s*true/);
  });

  it("SupabaseConnector crée un client NON persistant (pas de 2e propriétaire)", () => {
    const src = read("src/lib/powersync/SupabaseConnector.ts");
    if (/createClient\s*\(/.test(src)) {
      expect(src).toMatch(/persistSession:\s*false/);
      expect(src).toMatch(/autoRefreshToken:\s*false/);
    }
  });
});
