/**
 * PR12 — Import CSV sécurisé (module pur `src/lib/csvImport.ts`).
 *
 * Défauts verrouillés :
 *   1. analyse tolérante : champs entre guillemets, guillemets échappés (`""`),
 *      BOM UTF-8, fins de ligne CRLF **et** LF, délimiteur `;` ou `,` ;
 *   2. anti-injection de formule (OWASP, miroir de `escapeCsvCell`) : une
 *      cellule `=SUM(1+1)` est importée comme TEXTE LITTÉRAL (`'=SUM(1+1)`) —
 *      jamais évaluée — et un avertissement est enregistré ;
 *   3. en-tête non conforme → rejet avec message FR explicite ;
 *   4. entrée hors bornes (lignes / taille) → rejet propre (jamais d'exception) ;
 *   5. une ligne échouant la validation (`validateAddTransaction`) est
 *      rapportée et N'EST PAS écrite : `runTransactionImport` n'appelle
 *      `persist` que pour les lignes valides ;
 *   6. toute ligne importée est créée en statut `DRAFT` (jamais APPROVED).
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) :
 *   - retirer l'appel `sanitizeImportedCell` dans `parseTransactionCsv` (garder
 *     la cellule brute) ⇒ le test « `=SUM(1+1)` neutralisé » échoue ;
 *   - retirer le contrôle d'en-tête ⇒ le test « en-tête invalide » échoue ;
 *   - écrire toutes les lignes (ignorer `status !== "valid"`) dans
 *     `runTransactionImport` ⇒ le test « ligne invalide non écrite » échoue.
 */
import { describe, it, expect, vi } from "vitest";
import {
  parseTransactionCsv,
  buildTransactionImportPlan,
  runTransactionImport,
  transactionImportTemplate,
  TRANSACTION_IMPORT_COLUMNS,
  DEFAULT_CSV_LIMITS,
} from "../csvImport";
import { escapeCsvRow } from "../csv";

const HEADER = TRANSACTION_IMPORT_COLUMNS.join(";");
const CTX = { orgId: "org-1", createdById: "user-1" };

function csv(...lines: string[]): string {
  return [HEADER, ...lines].join("\n");
}

describe("parseTransactionCsv — analyse tolérante", () => {
  it("analyse un CSV simple (délimiteur `;`, LF)", () => {
    const res = parseTransactionCsv(
      csv("INCOME;10000;Dîme du mois;2026-01-31;cat-dime;CAISSE;"),
    );
    expect(res.ok).toBe(true);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].values).toEqual([
      "INCOME",
      "10000",
      "Dîme du mois",
      "2026-01-31",
      "cat-dime",
      "CAISSE",
      "",
    ]);
  });

  it("gère les champs entre guillemets et les guillemets échappés (« \"\" »)", () => {
    const res = parseTransactionCsv(
      csv('INCOME;10000;"Dîme; offrande";2026-01-31;cat-dime;CAISSE;"Note ""urgente"""'),
    );
    expect(res.ok).toBe(true);
    expect(res.rows[0].values[2]).toBe("Dîme; offrande");
    expect(res.rows[0].values[6]).toBe('Note "urgente"');
  });

  it("retire le BOM UTF-8 en tête de fichier", () => {
    const res = parseTransactionCsv(
      "\uFEFF" + csv("INCOME;10000;Dîme;2026-01-31;cat-dime;CAISSE;"),
    );
    expect(res.ok).toBe(true);
    expect(res.header[0]).toBe("type");
    expect(res.rows).toHaveLength(1);
  });

  it("gère les fins de ligne CRLF", () => {
    const res = parseTransactionCsv(
      [HEADER, "INCOME;10000;Dîme;2026-01-31;cat-dime;CAISSE;"].join("\r\n"),
    );
    expect(res.ok).toBe(true);
    expect(res.rows[0].values[3]).toBe("2026-01-31");
  });

  it("détecte le délimiteur `,`", () => {
    const res = parseTransactionCsv(
      ["type,amount,description,date,category_id,source,comment",
       "INCOME,10000,Dîme,2026-01-31,cat-dime,CAISSE,"].join("\n"),
    );
    expect(res.ok).toBe(true);
    expect(res.rows[0].values[2]).toBe("Dîme");
  });

  it("ignore une ligne de données entièrement vide", () => {
    const res = parseTransactionCsv(
      csv("INCOME;10000;Dîme;2026-01-31;cat-dime;CAISSE;", "", ""),
    );
    expect(res.ok).toBe(true);
    expect(res.rows).toHaveLength(1);
  });
});

describe("parseTransactionCsv — anti-injection de formule (OWASP)", () => {
  it("neutralise une cellule `=SUM(1+1)` en texte littéral + avertissement", () => {
    const res = parseTransactionCsv(
      csv('INCOME;10000;=SUM(1+1);2026-01-31;cat-dime;CAISSE;'),
    );
    expect(res.ok).toBe(true);
    const plan = buildTransactionImportPlan(res, CTX);
    // La description est le TEXTE littéral neutralisé, pas une formule.
    expect(plan.rows[0].input?.description).toBe("'=SUM(1+1)");
    expect(plan.rows[0].sanitized).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toMatch(/Ligne 1/);
  });

  it("neutralise aussi `+`, `-`, `@` et un TAB de tête", () => {
    for (const trigger of ["+1", "-1", "@cmd", "\t=1"]) {
      const res = parseTransactionCsv(
        csv(`INCOME;10000;"${trigger}";2026-01-31;cat-dime;CAISSE;`),
      );
      const plan = buildTransactionImportPlan(res, CTX);
      expect(plan.rows[0].input?.description.startsWith("'")).toBe(true);
    }
  });

  it("aller-retour export → import : une valeur exportée reste inerte", () => {
    // Ce que l'export écrit pour la valeur hostile :
    const exported = escapeCsvRow(["INCOME", "10000", "=1+1", "2026-01-31", "cat-dime", "CAISSE", ""]);
    const res = parseTransactionCsv([HEADER, exported].join("\n"));
    const plan = buildTransactionImportPlan(res, CTX);
    // L'export a préfixé `'` ; l'import le conserve tel quel (déjà neutre).
    expect(plan.rows[0].input?.description).toBe("'=1+1");
  });
});

describe("parseTransactionCsv — en-tête et bornes", () => {
  it("rejette un en-tête dont une colonne manque (message FR clair)", () => {
    const res = parseTransactionCsv(
      ["type;amount;date;category_id;source;comment", "INCOME;10000;2026-01-31;cat-dime;CAISSE;"].join("\n"),
    );
    expect(res.ok).toBe(false);
    expect(res.errors[0].message).toMatch(/En-tête invalide/);
    expect(res.errors[0].message).toMatch(/description/);
  });

  it("rejette un en-tête avec une colonne inattendue", () => {
    const res = parseTransactionCsv(
      [HEADER + ";extra", "INCOME;10000;D;2026-01-31;cat-dime;CAISSE;;x"].join("\n"),
    );
    expect(res.ok).toBe(false);
    expect(res.errors[0].message).toMatch(/inattendue/);
  });

  it("rejette une entrée dépassant le nombre de lignes maximum", () => {
    const lines = Array.from({ length: 3 }, (_, i) => `INCOME;10000;D${i};2026-01-31;cat-dime;CAISSE;`);
    const res = parseTransactionCsv(csv(...lines), { ...DEFAULT_CSV_LIMITS, maxRows: 2 });
    expect(res.ok).toBe(false);
    expect(res.errors[0].message).toMatch(/Trop de lignes/);
  });

  it("rejette une entrée dépassant la taille maximale", () => {
    const res = parseTransactionCsv(csv("INCOME;10000;D;2026-01-31;cat-dime;CAISSE;"), {
      ...DEFAULT_CSV_LIMITS,
      maxBytes: 10,
    });
    expect(res.ok).toBe(false);
    expect(res.errors[0].message).toMatch(/trop volumineux/);
  });

  it("rejette une cellule trop longue", () => {
    const long = "x".repeat(50);
    const res = parseTransactionCsv(csv(`INCOME;10000;${long};2026-01-31;cat-dime;CAISSE;`), {
      ...DEFAULT_CSV_LIMITS,
      maxCellLength: 10,
    });
    expect(res.ok).toBe(false);
    expect(res.errors[0].message).toMatch(/trop longue/);
  });

  it("rejette un guillemet non fermé sans lever", () => {
    const res = parseTransactionCsv(csv('INCOME;10000;"Dîme;2026-01-31;cat-dime;CAISSE;'));
    expect(res.ok).toBe(false);
    expect(res.errors[0].message).toMatch(/Guillemet non fermé/);
  });

  it("rejette un fichier vide", () => {
    expect(parseTransactionCsv("").ok).toBe(false);
  });
});

describe("buildTransactionImportPlan — validation et statut", () => {
  it("importe toujours en statut DRAFT (jamais APPROVED)", () => {
    const res = parseTransactionCsv(csv("INCOME;10000;Dîme;2026-01-31;cat-dime;CAISSE;"));
    const plan = buildTransactionImportPlan(res, CTX);
    expect(plan.rows[0].input?.status).toBe("DRAFT");
    expect(plan.rows[0].input?.approvedById).toBeNull();
  });

  it("convertit un montant FCFA en centimes (séparateurs tolérés)", () => {
    const res = parseTransactionCsv(csv("INCOME;1 000,50;Dîme;2026-01-31;cat-dime;CAISSE;"));
    const plan = buildTransactionImportPlan(res, CTX);
    expect(plan.rows[0].input?.amount).toBe(100050);
  });

  it("marque invalide une ligne au montant nul (sans `input`)", () => {
    const res = parseTransactionCsv(csv("INCOME;0;Dîme;2026-01-31;cat-dime;CAISSE;"));
    const plan = buildTransactionImportPlan(res, CTX);
    expect(plan.invalid).toBe(1);
    expect(plan.rows[0].status).toBe("invalid");
    expect(plan.rows[0].input).toBeUndefined();
    expect(plan.rows[0].error).toBeTruthy();
  });

  it("marque invalide une date mal formée", () => {
    const res = parseTransactionCsv(csv("INCOME;10000;Dîme;31/01/2026;cat-dime;CAISSE;"));
    const plan = buildTransactionImportPlan(res, CTX);
    expect(plan.rows[0].status).toBe("invalid");
  });

  it("marque invalide un type inconnu et une source inconnue", () => {
    const res = parseTransactionCsv(
      csv(
        "TRANSFER;10000;D;2026-01-31;cat-dime;CAISSE;",
        "INCOME;10000;D;2026-01-31;cat-dime;INCONNU;",
      ),
    );
    const plan = buildTransactionImportPlan(res, CTX);
    expect(plan.invalid).toBe(2);
    expect(plan.rows.every((r) => r.input === undefined)).toBe(true);
  });
});

describe("runTransactionImport — la ligne invalide n'est jamais écrite", () => {
  it("n'appelle `persist` que pour les lignes valides", async () => {
    const res = parseTransactionCsv(
      csv(
        "INCOME;10000;Valide;2026-01-31;cat-dime;CAISSE;",
        "INCOME;0;Invalide;2026-01-31;cat-dime;CAISSE;",
      ),
    );
    const plan = buildTransactionImportPlan(res, CTX);
    expect(plan.valid).toBe(1);
    expect(plan.invalid).toBe(1);

    const persist = vi.fn<(input: { description: string }) => Promise<void>>(
      async () => {},
    );
    const summary = await runTransactionImport(plan, persist);

    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Valide", status: "DRAFT" }),
    );
    // La ligne invalide (« Invalide ») n'a jamais été transmise.
    expect(persist.mock.calls.some((c) => (c[0] as { description: string }).description === "Invalide")).toBe(false);
    expect(summary.imported).toBe(1);
    expect(summary.skipped).toBe(1);
  });

  it("rapporte une erreur d'écriture sans interrompre les suivantes", async () => {
    const res = parseTransactionCsv(
      csv(
        "INCOME;10000;A;2026-01-31;cat-dime;CAISSE;",
        "INCOME;20000;B;2026-01-31;cat-dime;CAISSE;",
      ),
    );
    const plan = buildTransactionImportPlan(res, CTX);
    const persist = vi.fn(async (input: { description: string }) => {
      if (input.description === "A") throw new Error("boom");
    });
    const summary = await runTransactionImport(plan, persist);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(summary.imported).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.errors).toHaveLength(1);
  });
});

describe("transactionImportTemplate", () => {
  it("expose l'en-tête attendu + une ligne d'exemple", () => {
    const tpl = transactionImportTemplate();
    const [header, sample] = tpl.split("\n");
    expect(header).toBe(TRANSACTION_IMPORT_COLUMNS.join(";"));
    expect(sample.split(";")[0]).toBe("INCOME");
  });
});
