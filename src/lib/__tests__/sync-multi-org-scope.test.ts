/**
 * Garde multi-org des Sync Streams (« Étape 2 » du double-scope).
 *
 * `profiles` ne porte qu'UNE organisation par utilisateur. Quand un
 * stream filtrait uniquement par `profiles`, les organisations
 * secondaires (`org_memberships`) ne descendaient jamais : après un
 * changement d'organisation, l'application restait vide, en ligne
 * comme hors ligne (PowerSync est l'unique source de données).
 *
 * Règle verrouillée ici : tout stream dont la requête scope par
 * `SELECT org_id FROM profiles` doit AUSSI scoper par
 * `org_memberships` (branches ACTIVE + PENDING, comme le stream
 * `profiles`). Un futur stream ajouté avec le seul filtre `profiles`
 * échouera ce test.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../..");

function streamBlocks(): Array<{ name: string; block: string }> {
  const yaml = readFileSync(
    resolve(repoRoot, "powersync/sync-config.yaml"),
    "utf8",
  );
  const body = yaml.slice(yaml.indexOf("streams:"));
  const blocks = body.split(/\n(?= {2}[a-z_]+:\n)/);
  const out: Array<{ name: string; block: string }> = [];
  for (const b of blocks) {
    const name = b.match(/^ {2}([a-z_]+):\n/);
    if (name) out.push({ name: name[1], block: b });
  }
  return out;
}

const PROFILES_SCOPE = /SELECT org_id FROM profiles/;

describe("sync-config — scope multi-org (profiles ∪ org_memberships)", () => {
  it("le fichier contient bien les streams (garde non vide)", () => {
    expect(streamBlocks().length).toBeGreaterThanOrEqual(40);
  });

  it("tout stream scopé par profiles scope aussi par org_memberships", () => {
    const scoped = streamBlocks().filter((s) => PROFILES_SCOPE.test(s.block));
    // Non-vacuité : la majorité des streams sont scopés par organisation.
    expect(scoped.length).toBeGreaterThanOrEqual(30);
    const monoOrg = scoped
      .filter((s) => !s.block.includes("org_memberships"))
      .map((s) => s.name);
    expect(
      monoOrg,
      `streams mono-org (orgs secondaires invisibles) : ${monoOrg.join(", ")}`,
    ).toEqual([]);
  });

  it("les branches membership couvrent ACTIVE et PENDING", () => {
    const widened = streamBlocks().filter(
      (s) =>
        PROFILES_SCOPE.test(s.block) && s.block.includes("org_memberships"),
    );
    expect(widened.length).toBeGreaterThanOrEqual(30);
    const missingPending = widened
      .filter((s) => !/org_memberships[\s\S]*?status = 'PENDING'/.test(s.block))
      .map((s) => s.name);
    // Exceptions documentées : invitations/claims (admin ACTIVE rôlés),
    // grants (ACTIVE), org_memberships lui-même (branche user_id), profiles.
    const allowed = new Set([
      "invitations",
      "invitation_claims",
      "grants",
      "profiles",
    ]);
    expect(missingPending.filter((n) => !allowed.has(n))).toEqual([]);
  });
});
