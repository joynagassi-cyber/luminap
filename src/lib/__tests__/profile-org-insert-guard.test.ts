// @vitest-environment node
/**
 * Garde — injection d'organisation via INSERT de profil (fuite inter-org).
 *
 * Le durcissement R160 a rendu `profiles.org_id` immuable par UPDATE direct
 * (20261022000005) et a retiré l'écriture d'`org_id` du chemin UPDATE de
 * `upsert_profile` (20261022000006). Le chemin INSERT restait, lui, NON gardé :
 * un compte `authenticated` pouvait s'attacher à une organisation arbitraire
 * (RPC `upsert_profile(p_org_id := …)` ou DELETE + INSERT direct), puis lire
 * toutes les lignes de cet org via `is_org_member()`/`current_org_id()`.
 *
 * Cette garde lit la migration et vérifie qu'elle contient bien les deux
 * couches du correctif. Lecture de fichiers uniquement (pas de base).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATION = resolve(
  __dirname,
  "../../../supabase/migrations/20261101000004_guard_profile_org_insert.sql",
);

const sql = readFileSync(MIGRATION, "utf8");

describe("20261101000004 — garde INSERT d'organisation de profil", () => {
  it("installe un trigger BEFORE INSERT sur public.profiles", () => {
    expect(
      /CREATE TRIGGER guard_profile_org_insert\s+BEFORE INSERT ON public\.profiles/i.test(
        sql,
      ),
      "trigger BEFORE INSERT manquant",
    ).toBe(true);
  });

  it("le trigger refuse toute organisation réelle aux rôles client", () => {
    expect(sql).toMatch(/current_user IN \('authenticated', 'anon'\)/);
    expect(sql).toMatch(/'__no_org__', 'no-org'/);
    expect(sql).toMatch(/ORG_ID_NOT_ALLOWED/);
  });

  it("upsert_profile ne s'attache qu'à une organisation dont on est admin", () => {
    // Le corps doit conditionner l'écriture d'org_id à is_org_admin(uid, org).
    expect(
      /IF v_org NOT IN \('__no_org__', 'no-org'\)\s+AND NOT public\.is_org_admin\(auth\.uid\(\), v_org\)/i.test(
        sql,
      ),
      "upsert_profile n'arbitre pas l'organisation sur le chemin INSERT",
    ).toBe(true);
  });
});
