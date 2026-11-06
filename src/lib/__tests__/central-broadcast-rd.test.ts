/**
 * Garde R-D — autorisation du broadcast OneSignal.
 *
 * CLASSE DE DÉFAUT : l'edge function `onesignal-notify` n'autorisait le
 * broadcast global (`included_segments: ["All"]`, aucun ciblage) qu'au détenteur
 * d'un grant `org_admins` ACTIVE sur `org-central`. Or `org-central` n'a AUCUN
 * admin ACTIVE (mesuré en prod) → le broadcast était **inopérant**, alors que
 * l'architecture (R109/R142) désigne l'admin central canonique comme un `ADMIN`
 * rattaché à une organisation RACINE (`parent_org_id IS NULL`).
 *
 * Correctif : ajouter ce second chemin d'autorisation, sans retirer le premier.
 * Cette garde verrouille les deux chemins (et l'absence d'un broadcast ouvert).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const src = readFileSync(
  resolve(__dirname, "../../../supabase/functions/onesignal-notify/index.ts"),
  "utf8",
);

describe("R-D — broadcast OneSignal réservé aux admins centraux", () => {
  it("conserve le chemin grant admin central (org-central ACTIVE)", () => {
    expect(src).toMatch(/\.from\("org_admins"\)/);
    expect(src).toMatch(/\.eq\("org_id",\s*"org-central"\)/);
    expect(src).toMatch(/\.eq\("status",\s*"ACTIVE"\)/);
  });

  it("ajoute le chemin canonique R109 (ADMIN de org-central uniquement)", () => {
    expect(src).toMatch(/\.from\("profiles"\)/);
    expect(src).toMatch(/prof\??\.role === "ADMIN"/);
    expect(src).toMatch(/prof\??\.org_id === "org-central"/);
    // Pas d'élargissement à « ADMIN d'une org racine » (escalade mesurée).
    expect(src).not.toMatch(/parent_org_id === null/);
  });

  it("refuse (403) un broadcast non autorisé — pas de fail-open", () => {
    expect(src).toMatch(/if \(!filters\)/);
    expect(src).toMatch(/if \(!central\)/);
    expect(src).toMatch(/fail\(403/);
  });

  it("cloisonne le ciblage à l'organisation de l'appelant (anti-injection cross-tenant)", () => {
    // Un appelant ne peut cibler qu'une organisation dont il est membre, sauf admin central.
    expect(src).toMatch(/const central = await isCentralAdmin\(admin, userId\)/);
    expect(src).toMatch(/isMemberOfOrg\(admin, userId, targetOrg\)/);
    expect(src).toMatch(/Ciblage limité à vos organisations/);
    // Un ciblage SANS orgId est ramené à l'org primaire de l'appelant (jamais nu).
    expect(src).toMatch(/const targetOrg = body\?\.orgId \?\? callerOrgId \?\? undefined/);
    expect(src).toMatch(/effectiveOrgId = targetOrg/);
    expect(src).toMatch(/buildFilters\(body\?\.targetRole, body\?\.targetUserId, effectiveOrgId\)/);
    // isMemberOfOrg couvre org primaire + memberships + grants admin.
    expect(src).toMatch(/\.from\("org_memberships"\)/);
    expect(src).toMatch(/\.in\("status",\s*\["ACTIVE",\s*"PENDING"\]\)/);
  });

  it("exige un JWT appelant (pas de relais anonyme)", () => {
    expect(src).toMatch(/fail\(401/);
    expect(src).toMatch(/getUser\(userJwt\)/);
  });
});
