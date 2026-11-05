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
    expect(src).toMatch(/if \(!authorized\)/);
    expect(src).toMatch(/fail\(403/);
  });

  it("exige un JWT appelant (pas de relais anonyme)", () => {
    expect(src).toMatch(/fail\(401/);
    expect(src).toMatch(/getUser\(userJwt\)/);
  });
});
