// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  FORM_TEMPLATES,
  materializeTemplate,
} from "@/lib/formTemplates";

describe("FORM_TEMPLATES", () => {
  it("fournit au moins 3 templates avec fields pré-remplis", () => {
    expect(FORM_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    for (const t of FORM_TEMPLATES) {
      expect(t.name).toBeTruthy();
      expect(t.key).toBeTruthy();
      expect(t.fields.length).toBeGreaterThan(0);
      for (const f of t.fields) {
        expect(f.key).toBeTruthy();
        expect(f.label).toBeTruthy();
        expect(f.type).toBeTruthy();
      }
    }
  });

  it("contient les templates sondage / enregistrement membre / rapport incident", () => {
    const keys = FORM_TEMPLATES.map((t) => t.key);
    expect(keys).toContain("sondage");
    expect(keys).toContain("enregistrement_membre");
    expect(keys).toContain("rapport_incident");
  });
});

describe("materializeTemplate", () => {
  it("produit un FormDefinition DRAFT avec orgId injecté et order séquentiel", () => {
    const template = FORM_TEMPLATES.find((t) => t.key === "sondage")!;
    const def = materializeTemplate(template, "org-1");
    expect(def.orgId).toBe("org-1");
    expect(def.status).toBe("DRAFT");
    expect(def.key).toBe("sondage");
    expect(def.name).toBe("Sondage");
    expect(def.fields.map((f) => f.order)).toEqual([0, 1, 2, 3]);
  });

  it("permet de surcharger key/name/description (duplication)", () => {
    const template = FORM_TEMPLATES.find((t) => t.key === "sondage")!;
    const def = materializeTemplate(template, "org-1", {
      name: "Mon sondage",
      key: "mon_sondage",
    });
    expect(def.name).toBe("Mon sondage");
    expect(def.key).toBe("mon_sondage");
  });

  it("n'altère pas le template source (copy des fields)", () => {
    const template = FORM_TEMPLATES.find((t) => t.key === "sondage")!;
    const before = JSON.stringify(template.fields.map((f) => f.order));
    materializeTemplate(template, "org-1");
    expect(JSON.stringify(template.fields.map((f) => f.order))).toBe(before);
  });
});
