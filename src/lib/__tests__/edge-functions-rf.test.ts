/**
 * Garde R-F — pas d'edge function d'auth morte (surface d'attaque).
 *
 * CLASSE DE DÉFAUT : `signup` et `login` (edge functions `verify_jwt:false`)
 * étaient déployées mais **jamais invoquées** par le client (qui utilise GoTrue
 * via `supabase.auth.signUp/signInWithPassword`). `signup` ouvrait en plus une
 * surface d'abus : création de compte non authentifiée + **auto-confirmation
 * d'email** avec la clé service-role. Le projet Auth est déjà en
 * `mailer_autoconfirm=true` et le trigger `handle_new_user` ignore `role`/
 * `org_id` des métadonnées → ces fonctions n'apportaient rien.
 *
 * Correctif : fonctions **supprimées en prod** (undeploy) et du dépôt. Les
 * seules fonctions déployées sont `create_org`, `onesignal-notify`,
 * `report-error` — toutes invoquées par le client.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../..");
const fnsDir = resolve(root, "supabase/functions");

describe("R-F — edge functions : pas d'endpoint mort", () => {
  it("les fonctions d'auth mortes signup/login n'existent plus", () => {
    expect(existsSync(resolve(fnsDir, "signup"))).toBe(false);
    expect(existsSync(resolve(fnsDir, "login"))).toBe(false);
  });

  it("l'ensemble des fonctions déployées est exactement celui attendu", () => {
    const dirs = readdirSync(fnsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(dirs).toEqual(["create_org", "onesignal-notify", "report-error"]);
  });

  it("le client n'invoque que ces fonctions", () => {
    const sources = [
      resolve(root, "src/lib/orgBootstrap.ts"),
      resolve(root, "src/lib/cloudPush.ts"),
      resolve(root, "src/lib/observability/errorReporter.ts"),
    ]
      .filter((f) => existsSync(f))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    expect(sources).toMatch(/invoke\(\s*["']create_org["']/);
    expect(sources).toMatch(/onesignal-notify/);
    expect(sources).toMatch(/invoke\(\s*["']report-error["']/);
  });
});
