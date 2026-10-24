// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { ACTION_META, ENTITY_LABELS } from "@/pages/Trace";

/**
 * Preuve du correctif : les actions réellement présentes dans
 * audit_entries pour la gestion des admins d'organisation doivent avoir
 * un libellé explicite, et non retomber sur « Modifié ».
 */
describe("Trace — libellés des actions d'audit", () => {
  it("nomme les actions d'administration d'organisation (relevées en base)", () => {
    expect(ACTION_META.ADMIN_ASSIGNED.label).toBe("Admin attribué");
    expect(ACTION_META.ADMIN_REINSTATED.label).toBe("Admin rétabli");
    expect(ACTION_META.ADMIN_REVOKED.label).toBe("Admin révoqué");
    expect(ACTION_META.ADMIN_REMOVED.label).toBe("Admin retiré");
  });

  it("aucune action admin ne retombe sur le libellé « Modifié »", () => {
    for (const a of ["ADMIN_ASSIGNED", "ADMIN_REINSTATED", "ADMIN_REVOKED", "ADMIN_REMOVED"]) {
      expect(ACTION_META[a].label).not.toBe(ACTION_META.UPDATE.label);
    }
  });

  it("nomme l'entité OrgAdmin", () => {
    expect(ENTITY_LABELS.OrgAdmin).toBe("Administrateur d'organisation");
  });
});
