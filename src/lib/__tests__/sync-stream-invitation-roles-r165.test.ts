// @vitest-environment node
/**
 * Garde R165 — cohérence des rôles « gestionnaire d'invitations » entre le
 * modèle de permissions (`src/lib/rbac.ts`) et les streams PowerSync
 * `invitations` / `invitation_claims` (`powersync/sync-config.yaml`).
 *
 * DÉFAUT (mesuré 2026-11-04) : le stream filtrait
 * `role IN ('PASTEUR_PRINCIPAL','ANCIEN','TREASURIER')` — **ADMIN absent**.
 * Or ADMIN porte `invitation:manage` (rbac.ts) et `can_manage_invitations`
 * (SQL) l'inclut. Conséquence : un ADMIN voyait l'écran `/invitation/manage`
 * (route gardée par `invitation:manage`) mais **aucune invitation n'était
 * synchronisée** (ni en ligne ni hors ligne, PowerSync étant l'unique source).
 *
 * La garde verrouille l'égalité des ensembles de rôles. Non-vacuité : retirer
 * `ADMIN` du YAML fait échouer le test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RBAC = readFileSync(resolve(process.cwd(), "src/lib/rbac.ts"), "utf8");
const YAML = readFileSync(
  resolve(process.cwd(), "powersync/sync-config.yaml"),
  "utf8",
);

/** Rôles du PERMISSION_MATRIX (rbac.ts) qui possèdent `invitation:manage`. */
function rolesWithInvitationManage(): string[] {
  const roles: string[] = [];
  const re = /([A-Z][A-Z_]+):\s*\[([\s\S]*?)\]\s*as Permission\[\]/g;
  for (const m of RBAC.matchAll(re)) {
    if (m[2].includes('"invitation:manage"')) roles.push(m[1]);
  }
  return roles.sort();
}

/** Littéraux de rôle présents dans un stream donné du YAML. */
function streamRoleLiterals(stream: string): string[] {
  const body = YAML.slice(YAML.indexOf(`\n  ${stream}:\n`));
  const end = body.indexOf("\n  # ──", 1);
  const block = end > -1 ? body.slice(0, end) : body.slice(0, 1500);
  const roles = [...block.matchAll(/role = '([A-Z_]+)'/g)].map((m) => m[1]);
  return [...new Set(roles)].sort();
}

describe("R165 — rôles gestionnaires d'invitations (rbac ↔ streams PowerSync)", () => {
  const expected = rolesWithInvitationManage();

  it("rbac.ts : ADMIN porte bien invitation:manage (prémisse)", () => {
    expect(expected).toContain("ADMIN");
  });

  it("le stream `invitations` cible exactement ces rôles", () => {
    expect(streamRoleLiterals("invitations")).toEqual(expected);
  });

  it("le stream `invitation_claims` cible exactement ces rôles", () => {
    expect(streamRoleLiterals("invitation_claims")).toEqual(expected);
  });

  it("NON-VACUITÉ : ADMIN est présent dans les deux streams", () => {
    expect(streamRoleLiterals("invitations")).toContain("ADMIN");
    expect(streamRoleLiterals("invitation_claims")).toContain("ADMIN");
  });
});
