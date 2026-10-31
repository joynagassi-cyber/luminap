/**
 * PR2 — Sauvegarde / export complet des données (module pur `src/lib/backup.ts`).
 *
 * Ce que ces tests verrouillent :
 *   1. `counts` est DÉRIVÉ de `data` (une seule source de vérité) ;
 *   2. l'enveloppe est déterministe (à `now` fixé, sortie identique) ;
 *   3. le JSON est relisible (round-trip `JSON.parse`) ;
 *   4. le CSV passe CHAQUE cellule par `escapeCsvRow` — anti-injection de
 *      formule OWASP (`=1+1`, `@cmd` neutralisés par une apostrophe).
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) :
 *   - Retirer l'appel `escapeCsvRow` dans `backupToCsv` (retour `rows.join(";")`
 *     brut) ⇒ le test « neutralise les formules » échoue (`=1+1` apparaît sans
 *     apostrophe de tête).
 *   - Dériver `counts` d'une valeur fournie au lieu de `data` ⇒ le test
 *     « counts reflète data » échoue.
 */
import { describe, it, expect } from "vitest";
import {
  buildBackupBundle,
  serializeBackup,
  backupToCsv,
  backupFilename,
  BACKUP_FORMAT,
  BACKUP_VERSION,
} from "../backup";

const NOW = "2026-10-31T08:00:00.000Z";

function sampleCollections() {
  return {
    transactions: [
      { id: "t1", description: "=1+1", amount: 100 },
      { id: "t2", description: "@cmd", amount: 200 },
    ],
    members: [{ id: "m1", first_name: "Marie" }],
    empty: [] as unknown[],
  };
}

describe("buildBackupBundle — enveloppe auto-descriptive", () => {
  it("déclare format/version/orgId/exportedAt", () => {
    const bundle = buildBackupBundle(sampleCollections(), "org-1", NOW);
    expect(bundle.format).toBe("lumina-backup");
    expect(bundle.format).toBe(BACKUP_FORMAT);
    expect(bundle.version).toBe(BACKUP_VERSION);
    expect(bundle.orgId).toBe("org-1");
    expect(bundle.exportedAt).toBe(NOW);
  });

  it("dérive `counts` de `data` (source de vérité unique)", () => {
    const bundle = buildBackupBundle(sampleCollections(), "org-1", NOW);
    expect(bundle.counts).toEqual({
      transactions: 2,
      members: 1,
      empty: 0,
    });
    // counts == longueur réelle de chaque collection
    for (const [entity, rows] of Object.entries(bundle.data)) {
      expect(bundle.counts[entity]).toBe(rows.length);
    }
  });

  it("est déterministe (mêmes entrées + même `now` ⇒ même sortie)", () => {
    const a = buildBackupBundle(sampleCollections(), "org-1", NOW);
    const b = buildBackupBundle(sampleCollections(), "org-1", NOW);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("ne partage pas les tableaux d'entrée (copie défensive)", () => {
    const input = sampleCollections();
    const bundle = buildBackupBundle(input, "org-1", NOW);
    expect(bundle.data.transactions).not.toBe(input.transactions);
    bundle.data.transactions.push({ id: "t3" });
    expect(input.transactions).toHaveLength(2);
  });

  it("tolère une valeur non-tableau (dégrade en tableau vide, pas de crash)", () => {
    const bundle = buildBackupBundle(
      { broken: undefined as unknown as unknown[] },
      "org-1",
      NOW,
    );
    expect(bundle.data.broken).toEqual([]);
    expect(bundle.counts.broken).toBe(0);
  });
});

describe("serializeBackup — JSON relisible", () => {
  it("round-trip JSON.parse restitue l'enveloppe complète", () => {
    const bundle = buildBackupBundle(sampleCollections(), "org-1", NOW);
    const parsed = JSON.parse(serializeBackup(bundle));
    expect(parsed).toEqual(bundle);
    expect(parsed.data.transactions[0].id).toBe("t1");
    expect(parsed.counts.transactions).toBe(2);
  });

  it("produit un JSON indenté (lisible)", () => {
    const bundle = buildBackupBundle(sampleCollections(), "org-1", NOW);
    expect(serializeBackup(bundle)).toContain("\n  ");
  });
});

describe("backupToCsv — échappement OWASP de CHAQUE cellule", () => {
  it("expose une colonne `entity` en tête d'en-tête", () => {
    const bundle = buildBackupBundle(sampleCollections(), "org-1", NOW);
    const [header] = backupToCsv(bundle).split("\n");
    expect(header.split(";")[0]).toBe("entity");
  });

  it("neutralise les formules `=1+1` et `@cmd` (apostrophe de tête)", () => {
    const bundle = buildBackupBundle(sampleCollections(), "org-1", NOW);
    const csv = backupToCsv(bundle);
    // Valeur brute SANS apostrophe ne doit jamais apparaître en début de
    // cellule : c'est exactement ce qu'Excel exécuterait comme formule.
    expect(csv).not.toMatch(/(^|;)=1\+1/);
    expect(csv).not.toMatch(/(^|;)@cmd/);
    // Neutralisée = apostrophe préfixée (escapeCsvRow).
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'@cmd");
  });

  it("inclut une ligne par enregistrement, préfixée par le nom d'entité", () => {
    const bundle = buildBackupBundle(sampleCollections(), "org-1", NOW);
    const lines = backupToCsv(bundle).split("\n");
    // en-tête + 2 transactions + 1 membre + 0 vide = 4 lignes
    expect(lines).toHaveLength(4);
    const transactionLines = lines.filter((l) => l.startsWith("transactions"));
    expect(transactionLines).toHaveLength(2);
    expect(lines.some((l) => l.startsWith("members"))).toBe(true);
  });

  it("aplatit une valeur non-objet dans une colonne `value`", () => {
    const bundle = buildBackupBundle({ tags: ["a", "b"] }, "org-1", NOW);
    const csv = backupToCsv(bundle);
    expect(csv.split("\n")[0]).toContain("value");
    expect(csv).toContain("tags;a");
    expect(csv).toContain("tags;b");
  });
});

describe("backupFilename", () => {
  it("dérive le nom daté et l'extension", () => {
    expect(backupFilename("json", NOW)).toBe("lumina-sauvegarde-2026-10-31.json");
    expect(backupFilename("csv", NOW)).toBe("lumina-sauvegarde-2026-10-31.csv");
  });
});
