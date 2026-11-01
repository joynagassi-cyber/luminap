/**
 * PR2 — import / restauration d'une sauvegarde (module pur `backupImport.ts`).
 *
 * Ce que ces tests verrouillent :
 *   1. PARSING fail-closed — un JSON invalide, un format inconnu, une version
 *      inconnue, une organisation absente ou un `data` mal formé lèvent une
 *      `BackupImportError` typée. Aucune « restauration partielle silencieuse ».
 *   2. `counts` n'est jamais cru sur parole : il est recalculé depuis `data`.
 *   3. `planRestore` est PUR et BORNÉ à l'organisation active :
 *      - `bundle.orgId` ≠ org courante ⇒ `ORG_MISMATCH` (anti-fuite inter-org) ;
 *      - une ligne portant un `org_id` étranger ⇒ CONFLIT (jamais restaurée) ;
 *      - `org_id` forcé sur l'organisation du bundle pour toute ligne écrite.
 *   4. Les entités non restaurables (`audit_entries`) sont SIGNALÉES (`skipped`),
 *      jamais ignorées en silence.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) :
 *   - retirer le garde `bundle.orgId !== current.orgId` dans `planRestore` ⇒
 *     le test « refuse une autre organisation » échoue (le plan serait produit) ;
 *   - retirer la validation `format`/`version` de `parseBackupBundle` ⇒ les tests
 *     « format inconnu » / « version inconnue » échouent (le parse réussirait) ;
 *   - ne plus classer en conflit une ligne `org_id` étrangère ⇒ le test
 *     « ligne d'une autre organisation » échoue (elle deviendrait une création).
 */
import { describe, it, expect } from "vitest";
import {
  parseBackupBundle,
  planRestore,
  restorePlanToRows,
  restorePlanSummary,
  BackupImportError,
  RESTORABLE_TABLES,
} from "../backupImport";
import { buildBackupBundle, serializeBackup } from "../backup";

const NOW = "2026-10-31T08:00:00.000Z";

function validText(orgId = "org-1", collections?: Record<string, unknown[]>) {
  const bundle = buildBackupBundle(
    collections ?? {
      transactions: [{ id: "t1", org_id: orgId, description: "Dîme" }],
    },
    orgId,
    NOW,
  );
  return serializeBackup(bundle);
}

function emptyCurrent(orgId = "org-1") {
  return { orgId, collections: {} as Record<string, unknown[]> };
}

describe("parseBackupBundle — validation fail-closed", () => {
  it("relit une enveloppe valide et RECALCULE counts depuis data", () => {
    const text = validText("org-1", {
      transactions: [{ id: "t1" }, { id: "t2" }],
      members: [{ id: "m1" }],
    });
    const bundle = parseBackupBundle(text);
    expect(bundle.format).toBe("lumina-backup");
    expect(bundle.orgId).toBe("org-1");
    expect(bundle.counts).toEqual({ transactions: 2, members: 1 });
    expect(bundle.data.transactions).toHaveLength(2);
  });

  it("ignore un `counts` falsifié dans le fichier (recalculé depuis data)", () => {
    const parsed = JSON.parse(validText());
    parsed.counts = { transactions: 999 };
    const bundle = parseBackupBundle(JSON.stringify(parsed));
    expect(bundle.counts.transactions).toBe(1);
  });

  it("rejette un JSON invalide (INVALID_JSON)", () => {
    expect(() => parseBackupBundle("{ pas du json")).toThrowError(
      BackupImportError,
    );
    try {
      parseBackupBundle("{ pas du json");
    } catch (e) {
      expect((e as BackupImportError).code).toBe("INVALID_JSON");
    }
  });

  it("rejette un format inconnu (UNKNOWN_FORMAT)", () => {
    const parsed = JSON.parse(validText());
    parsed.format = "autre-format";
    try {
      parseBackupBundle(JSON.stringify(parsed));
      throw new Error("aurait dû lever");
    } catch (e) {
      expect((e as BackupImportError).code).toBe("UNKNOWN_FORMAT");
    }
  });

  it("rejette une version inconnue (UNKNOWN_VERSION)", () => {
    const parsed = JSON.parse(validText());
    parsed.version = 99;
    try {
      parseBackupBundle(JSON.stringify(parsed));
      throw new Error("aurait dû lever");
    } catch (e) {
      expect((e as BackupImportError).code).toBe("UNKNOWN_VERSION");
    }
  });

  it("rejette une organisation absente (MISSING_ORG)", () => {
    const parsed = JSON.parse(validText());
    delete parsed.orgId;
    try {
      parseBackupBundle(JSON.stringify(parsed));
      throw new Error("aurait dû lever");
    } catch (e) {
      expect((e as BackupImportError).code).toBe("MISSING_ORG");
    }
  });

  it("rejette un `data` qui n'est pas un objet (INVALID_DATA)", () => {
    const parsed = JSON.parse(validText());
    parsed.data = [];
    try {
      parseBackupBundle(JSON.stringify(parsed));
      throw new Error("aurait dû lever");
    } catch (e) {
      expect((e as BackupImportError).code).toBe("INVALID_DATA");
    }
  });

  it("rejette une entité qui n'est pas un tableau (INVALID_DATA)", () => {
    const parsed = JSON.parse(validText());
    parsed.data.transactions = { id: "t1" };
    try {
      parseBackupBundle(JSON.stringify(parsed));
      throw new Error("aurait dû lever");
    } catch (e) {
      expect((e as BackupImportError).code).toBe("INVALID_DATA");
    }
  });

  it("rejette un élément qui n'est pas un objet (INVALID_DATA)", () => {
    const parsed = JSON.parse(validText());
    parsed.data.transactions = ["pas-un-objet"];
    try {
      parseBackupBundle(JSON.stringify(parsed));
      throw new Error("aurait dû lever");
    } catch (e) {
      expect((e as BackupImportError).code).toBe("INVALID_DATA");
    }
  });

  it("rejette un nom de colonne non-identifiant (anti-injection, INVALID_DATA)", () => {
    const parsed = JSON.parse(validText());
    parsed.data.transactions = [{ id: "t1", "id); DROP TABLE x;--": 1 }];
    try {
      parseBackupBundle(JSON.stringify(parsed));
      throw new Error("aurait dû lever");
    } catch (e) {
      expect((e as BackupImportError).code).toBe("INVALID_DATA");
    }
  });
});

describe("planRestore — bornage d'organisation (anti-fuite inter-org)", () => {
  it("refuse un bundle d'une AUTRE organisation (ORG_MISMATCH)", () => {
    const bundle = parseBackupBundle(validText("org-2"));
    try {
      planRestore(bundle, emptyCurrent("org-1"));
      throw new Error("aurait dû lever");
    } catch (e) {
      expect(e).toBeInstanceOf(BackupImportError);
      expect((e as BackupImportError).code).toBe("ORG_MISMATCH");
    }
  });

  it("accepte un bundle de l'organisation active", () => {
    const bundle = parseBackupBundle(validText("org-1"));
    const plan = planRestore(bundle, emptyCurrent("org-1"));
    expect(plan.orgId).toBe("org-1");
  });
});

describe("planRestore — créations / mises à jour / conflits", () => {
  it("classe en création un identifiant absent de l'état courant", () => {
    const bundle = parseBackupBundle(
      validText("org-1", { transactions: [{ id: "t1", org_id: "org-1" }] }),
    );
    const plan = planRestore(bundle, emptyCurrent("org-1"));
    expect(plan.counts).toEqual({
      creates: 1,
      updates: 0,
      conflicts: 0,
      skipped: 0,
    });
    expect(plan.creates[0].table).toBe("transactions");
  });

  it("classe en mise à jour un identifiant déjà présent", () => {
    const bundle = parseBackupBundle(
      validText("org-1", { transactions: [{ id: "t1", org_id: "org-1" }] }),
    );
    const plan = planRestore(bundle, {
      orgId: "org-1",
      collections: { transactions: [{ id: "t1" }] },
    });
    expect(plan.counts.creates).toBe(0);
    expect(plan.counts.updates).toBe(1);
  });

  it("classe en conflit une ligne d'une autre organisation (jamais écrite)", () => {
    const bundle = parseBackupBundle(
      validText("org-1", { transactions: [{ id: "t1", org_id: "org-2" }] }),
    );
    const plan = planRestore(bundle, emptyCurrent("org-1"));
    expect(plan.counts.creates).toBe(0);
    expect(plan.counts.conflicts).toBe(1);
    expect(plan.conflicts[0].reason).toMatch(/autre organisation/);
  });

  it("force `org_id` sur l'organisation du bundle pour chaque ligne écrite", () => {
    const bundle = parseBackupBundle(
      validText("org-1", { transactions: [{ id: "t1" }] }),
    );
    const plan = planRestore(bundle, emptyCurrent("org-1"));
    expect(plan.creates[0].row.org_id).toBe("org-1");
  });

  it("signale une entité non restaurable (audit_entries) sans l'ignorer", () => {
    const bundle = parseBackupBundle(
      validText("org-1", {
        transactions: [{ id: "t1", org_id: "org-1" }],
        audit_entries: [{ id: "a1", org_id: "org-1" }],
      }),
    );
    const plan = planRestore(bundle, emptyCurrent("org-1"));
    expect(plan.counts.skipped).toBe(1);
    expect(plan.skipped[0].entity).toBe("audit_entries");
    // Le journal d'audit n'est JAMAIS restauré (append-only R140).
    expect(RESTORABLE_TABLES).not.toContain("audit_entries");
  });

  it("classe en conflit un identifiant dupliqué dans le fichier", () => {
    const bundle = parseBackupBundle(
      validText("org-1", {
        transactions: [{ id: "t1", org_id: "org-1" }, { id: "t1", org_id: "org-1" }],
      }),
    );
    const plan = planRestore(bundle, emptyCurrent("org-1"));
    expect(plan.counts.creates).toBe(1);
    expect(plan.counts.conflicts).toBe(1);
  });

  it("classe en conflit un élément sans identifiant", () => {
    const bundle = parseBackupBundle(
      validText("org-1", { transactions: [{ description: "sans id" }] }),
    );
    const plan = planRestore(bundle, emptyCurrent("org-1"));
    expect(plan.counts.conflicts).toBe(1);
    expect(plan.conflicts[0].reason).toMatch(/identifiant/);
  });

  it("mappe les entités camelCase (forms/custom_fields) en colonnes de base", () => {
    const bundle = parseBackupBundle(
      validText("org-1", {
        forms: [
          {
            id: "f1",
            orgId: "org-1",
            key: "k",
            name: "F",
            version: 1,
            fields: [],
            status: "DRAFT",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
        custom_fields: [
          {
            id: "c1",
            orgId: "org-1",
            entityType: "Member",
            key: "a",
            label: "A",
            type: "text",
            order: 0,
          },
        ],
      }),
    );
    const plan = planRestore(bundle, emptyCurrent("org-1"));
    const form = plan.creates.find((c) => c.entity === "forms")!;
    expect(form.table).toBe("form_definitions");
    expect(form.row.org_id).toBe("org-1");
    expect(form.row.key).toBe("k");
    const field = plan.creates.find((c) => c.entity === "custom_fields")!;
    expect(field.table).toBe("custom_field_definitions");
    expect(field.row.field_name).toBe("a");
  });
});

describe("planRestore — helpers de restitution", () => {
  it("aplatit le plan en lignes écrivables (créations puis mises à jour)", () => {
    const bundle = parseBackupBundle(
      validText("org-1", {
        transactions: [{ id: "t1", org_id: "org-1" }, { id: "t2", org_id: "org-1" }],
      }),
    );
    const plan = planRestore(bundle, {
      orgId: "org-1",
      collections: { transactions: [{ id: "t1" }] },
    });
    const rows = restorePlanToRows(plan);
    expect(rows.map((r) => r.id)).toEqual(["t2", "t1"]);
  });

  it("produit un résumé lisible des compteurs", () => {
    const bundle = parseBackupBundle(
      validText("org-1", { transactions: [{ id: "t1", org_id: "org-1" }] }),
    );
    const plan = planRestore(bundle, emptyCurrent("org-1"));
    expect(restorePlanSummary(plan)).toBe(
      "1 création(s), 0 mise(s) à jour, 0 conflit(s)",
    );
  });
});
