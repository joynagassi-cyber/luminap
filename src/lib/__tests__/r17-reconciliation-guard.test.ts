// @vitest-environment node
/**
 * R17 — garde de réconciliation dépôt ↔ base.
 *
 * Le fichier historique `20260909000002_create_invitation_system.sql` n'a jamais
 * été appliqué en l'état (remplacé en base par `invitation_system_v3`). 3 objets
 * qu'il déclare n'existaient donc pas : `mark_expired_invitations()` +
 * `update_invitations_updated_at` + `update_invitation_claims_updated_at`.
 *
 * La migration `20261031000003` les recrée (idempotent) → delta dépôt↔base nul.
 * Cette garde vérifie que la réconciliation et la mesure restent présentes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS = resolve(__dirname, "../../../supabase/migrations");
const SNAPSHOT = resolve(__dirname, "../../../docs/agent/migration-drift.json");

describe("R17 — réconciliation des objets du fichier historique invitation_system", () => {
  const sql = readFileSync(
    resolve(MIGRATIONS, "20261031000003_reconcile_invitation_system_objects.sql"),
    "utf8",
  );

  it("recrée la fonction mark_expired_invitations", () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.mark_expired_invitations\(\)/);
  });

  it("recrée les deux triggers updated_at des invitations", () => {
    expect(sql).toMatch(
      /CREATE TRIGGER update_invitations_updated_at\s+BEFORE UPDATE ON public\.invitations/,
    );
    expect(sql).toMatch(
      /CREATE TRIGGER update_invitation_claims_updated_at\s+BEFORE UPDATE ON public\.invitation_claims/,
    );
  });

  it("la réconciliation est réversible (rollback présent)", () => {
    const rb = readFileSync(
      resolve(MIGRATIONS, "rollback/20261031000003_rollback.sql"),
      "utf8",
    );
    expect(rb).toMatch(/DROP FUNCTION IF EXISTS public\.mark_expired_invitations\(\)/);
    expect(rb).toMatch(/DROP TRIGGER IF EXISTS update_invitations_updated_at/);
  });

  it("l'instantané fige un delta dépôt↔base nul", () => {
    const snap = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as {
      measured: {
        repo_db_object_delta: {
          tables_missing: number;
          functions_missing: number;
          triggers_missing: number;
          views_missing: number;
        };
      };
    };
    const d = snap.measured.repo_db_object_delta;
    expect(d.tables_missing).toBe(0);
    expect(d.functions_missing).toBe(0);
    expect(d.triggers_missing).toBe(0);
    expect(d.views_missing).toBe(0);
  });
});
