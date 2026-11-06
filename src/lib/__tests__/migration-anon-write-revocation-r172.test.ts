// @vitest-environment node
/**
 * Garde R172 — retrait de l'ÉCRITURE au rôle `anon` + durcissement des
 * privilèges par défaut de `public`.
 *
 * DÉFAUT : ~49 tables de `public` portaient des grants INSERT/UPDATE/DELETE
 * (voire TRUNCATE/REFERENCES/TRIGGER) pour `anon`, hérités des privilèges par
 * défaut (`pg_default_acl`) et de quelques GRANT historiques. Inertes
 * aujourd'hui (RLS activée + aucune policy anon), ils constituent une bombe à
 * retardement : toute perte de RLS ou toute policy `TO public`/`anon` rendrait
 * l'écriture anonyme immédiate.
 *
 * Cette garde verrouille :
 *   1. le REVOKE d'écriture sur les tables existantes de `public` ;
 *   2. le durcissement des privilèges par défaut (empêche la récidive) ;
 *   3. la PRÉSERVATION de la lecture `anon` (keep_alive / logos en dépendent) ;
 *   4. la réversibilité (rollback présent).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");
const R172_FILE = "20261104000012_revoke_anon_write_and_default_privileges.sql";
const r172 = readFileSync(resolve(migrationsDir, R172_FILE), "utf8");

describe("R172 — `anon` n'écrit plus, privilèges par défaut durcis", () => {
  it("retire l'écriture à anon sur les tables existantes de public", () => {
    expect(r172).toMatch(
      /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\s+ON ALL TABLES IN SCHEMA public FROM anon/,
    );
  });

  it("durcit les privilèges par défaut (empêche la récidive sur les futures tables)", () => {
    expect(r172).toMatch(
      /ALTER DEFAULT PRIVILEGES IN SCHEMA public\s+REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN\s+ON TABLES FROM anon/,
    );
  });

  it("PRÉSERVE la lecture anon (ne révoque jamais SELECT sur les tables)", () => {
    // `keep_alive` (ping anti-pause) et `logos` (bucket public) exigent le
    // SELECT anon : une révocation de SELECT casserait le keep-alive.
    expect(r172).not.toMatch(/REVOKE\s+SELECT\b[^;]*\bFROM anon/i);
  });

  it("documente le résiduel Storage (supabase_admin non atteignable)", () => {
    // storage.objects appartient à supabase_storage_admin : le REVOKE est un
    // no-op, mais l'écriture anon y reste inerte (aucune policy d'écriture anon).
    expect(r172).toMatch(/storage\.objects FROM anon/);
  });

  it("reste réversible (rollback restaure les privilèges)", () => {
    const rollback = readFileSync(
      resolve(migrationsDir, "rollback/20261104000012_rollback.sql"),
      "utf8",
    );
    expect(rollback).toMatch(/GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER\s+ON ALL TABLES IN SCHEMA public TO anon/);
    expect(rollback).toMatch(/ALTER DEFAULT PRIVILEGES IN SCHEMA public\s+GRANT/);
  });
});
