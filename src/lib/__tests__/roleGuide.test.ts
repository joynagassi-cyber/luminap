/**
 * roleGuide — la description des rôles doit rester fidèle au RBAC.
 *
 * Le test qui compte est le premier : il verrouille la régression historique —
 * la page d'aide affichait un rôle `PASTEUR` inexistant et omettait huit rôles
 * réels, parce que la liste était rédigée à la main.
 */
import { describe, it, expect } from "vitest";

import { describeRole, rolesByPrivilege } from "../roleGuide";
import { PERMISSION_MATRIX, ROLE_HIERARCHY, ROLE_LABELS } from "../rbac";
import type { Role } from "@/types";

const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];

describe("rolesByPrivilege — exhaustivité", () => {
  it("décrit TOUS les rôles du type Role, sans exception", () => {
    expect(rolesByPrivilege()).toHaveLength(ALL_ROLES.length);
    expect(rolesByPrivilege().map((r) => r.role).sort()).toEqual(
      [...ALL_ROLES].sort(),
    );
  });

  it("n'invente aucun rôle (régression « PASTEUR »)", () => {
    const shown = rolesByPrivilege().map((r) => r.role);
    // `PASTEUR` n'existe pas : le type définit PASTEUR_PRINCIPAL / ASSOCIE / JEUNESSE.
    expect(shown).not.toContain("PASTEUR" as Role);
    expect(ROLE_LABELS).not.toHaveProperty("PASTEUR");
    // Et les trois variantes réelles sont bien présentes.
    expect(shown).toContain("PASTEUR_PRINCIPAL");
    expect(shown).toContain("PASTEUR_ASSOCIE");
    expect(shown).toContain("PASTEUR_JEUNESSE");
  });

  it("trie du plus privilégié au moins privilégié", () => {
    const levels = rolesByPrivilege().map((r) => ROLE_HIERARCHY[r.role]);
    const sorted = [...levels].sort((a, b) => b - a);
    expect(levels).toEqual(sorted);
  });

  it("place le pasteur principal en tête et le membre en queue", () => {
    const roles = rolesByPrivilege();
    expect(roles[0].role).toBe("PASTEUR_PRINCIPAL");
    expect(roles[roles.length - 1].role).toBe("MEMBRE");
  });
});

describe("describeRole", () => {
  it("reprend le libellé canonique de ROLE_LABELS", () => {
    for (const role of ALL_ROLES) {
      expect(describeRole(role).label).toBe(ROLE_LABELS[role]);
    }
  });

  it("distingue un rôle de gestion d'un rôle de consultation", () => {
    // Le trésorier peut créer/approuver des transactions.
    expect(describeRole("TREASURIER").kind).toBe("Gestion");
    // Un membre ne peut que lire.
    expect(describeRole("MEMBRE").kind).toBe("Consultation");
  });

  it("reflète fidèlement le nombre de permissions du RBAC", () => {
    for (const role of ALL_ROLES) {
      expect(describeRole(role).permissionCount).toBe(
        PERMISSION_MATRIX[role].length,
      );
    }
  });

  it("traduit les domaines en français lisible", () => {
    const d = describeRole("TREASURIER");
    expect(d.domains).toContain("transactions");
    // Aucune permission brute (« transaction:create ») ne doit fuir à l'écran.
    for (const role of ALL_ROLES) {
      for (const domain of describeRole(role).domains) {
        expect(domain).not.toContain(":");
        expect(domain).not.toMatch(/^(create|read|update|delete|approve)$/);
      }
    }
  });

  it("résume en une ligne courte, avec le débordement compté", () => {
    const d = describeRole("TREASURIER");
    expect(d.summary).toMatch(/^Gestion · /);
    if (d.domains.length > 3) {
      expect(d.summary).toContain(`+${d.domains.length - 3}`);
    }
    expect(d.summary.length).toBeLessThan(80);
  });
});
