/**
 * Invitations — le stream PowerSync ne doit pas court-circuiter la RLS (R91).
 *
 * DÉFAUT (réel) : la RLS `invitations_select` a été durcie (R91) pour que
 * seuls les gestionnaires voient `code`/`grants_payload`. MAIS le stream
 * PowerSync `invitations` filtrait sur
 * `org_id IN (SELECT org_id FROM profiles WHERE id = auth.user_id())` :
 * TOUT membre de l'organisation synchronisait donc les invitations (et leurs
 * codes) sur son appareil — la RLS est contournée (PowerSync lit en service
 * role). Même faille que R91, par une autre porte.
 *
 * Contrat : le stream `invitations` (et `invitation_claims`) doit être
 * restreint aux gestionnaires d'invitations (rôles PASTEUR_PRINCIPAL /
 * ANCIEN / TREASURIER), comme la RLS.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const config = readFileSync(
  resolve(__dirname, "../../../powersync/sync-config.yaml"),
  "utf8",
);

/** Extrait le bloc `query: |` d'un stream nommé. */
function streamQuery(name: string): string {
  const re = new RegExp(
    `^  ${name}:\\s*\\n(?:.*\\n)*?    query: \\|\\n((?:      .*\\n?)+)`,
    "m",
  );
  const m = config.match(re);
  return m ? m[1] : "";
}

const MANAGER_ROLES = /PASTEUR_PRINCIPAL|ANCIEN|TREASURIER/;

describe("sync-config — invitations restreintes aux gestionnaires", () => {
  it("le stream `invitations` exige un rôle gestionnaire", () => {
    const q = streamQuery("invitations");
    expect(q).not.toBe("");
    expect(q).toMatch(MANAGER_ROLES);
  });

  it("le stream `invitations` ne se contente pas de l'appartenance à l'org", () => {
    const q = streamQuery("invitations");
    // La faille d'origine : filtrer uniquement sur l'org de l'appelant.
    const naive =
      "SELECT * FROM invitations\nWHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.user_id())";
    expect(q.trim()).not.toBe(naive);
  });

  it("le stream `invitation_claims` est également restreint", () => {
    const q = streamQuery("invitation_claims");
    expect(q).not.toBe("");
    expect(q).toMatch(MANAGER_ROLES);
  });
});
