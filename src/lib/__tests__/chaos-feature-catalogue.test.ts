/**
 * Phase 11 §5.4 — catalogue de chaos ÉTENDU à toutes les fonctionnalités.
 *
 * Le catalogue initial (`chaos-offline-resilience.test.ts`) couvre la
 * résilience hors-ligne / stockage (5 scénarios). Ce second catalogue exerce
 * les AUTRES domaines produit sous injection de panne : chaque scénario
 * injecte une entrée hostile (corrompue, extrême, malveillante, incohérente)
 * sur le VRAI chemin de code et vérifie une DÉGRADATION CONTRÔLÉE (jamais de
 * plantage, jamais de fuite, jamais de perte silencieuse).
 *
 * Toutes les fonctions exercées sont PURES (aucun mock nécessaire) : la
 * valeur du test vient de la non-vacuité des entrées, pas d'une simulation.
 *
 * Domaines couverts (mapping FEATURES.md) :
 *   chaos 6  — Finances / rapports (agrégats sur entrées incohérentes)
 *   chaos 7  — Cultes / cotisations (dates limites, verrouillage, arithmétique)
 *   chaos 8  — Export / sauvegarde (injection CSV, enveloppe auto-descriptive)
 *   chaos 9  — Fédération d'organisations (cycles, arbre profond/large)
 *   chaos 10 — Sécurité des entrées (XSS stocké, évasion CSS, texte de contrôle)
 *   chaos 11 — Configuration dégradée (drapeaux, versionnage, jsonb)
 *   chaos 12 — Concurrence / idempotence (rejeu, double écriture)
 */

import { describe, it, expect } from "vitest";
import { escapeCsvCell, escapeCsvRow } from "@/lib/csv";
import { normalizeText, escapeHtml, sanitizeCssValue, MAX_TEXT_LENGTH } from "@/lib/sanitize";
import {
  wouldCreateCycle,
  assertReparentAllowed,
  parentMapFrom,
  buildClosure,
  computeDescendants,
  computeAncestors,
  maxDepth,
  maxBreadth,
} from "@/lib/orgTree";
import { parseFlags, isFeatureEnabled, parseFlags as _pf } from "@/lib/featureFlags";
import { parseMinSchemaVersion, isUpdateRequired } from "@/lib/schemaVersion";
import { parseJsonbValue, coerceJsonbValue } from "@/lib/jsonb";
import { buildBackupBundle, serializeBackup, backupToCsv, backupFilename } from "@/lib/backup";
import { buildOrgReport } from "@/lib/orgReport";
import {
  isCulteVerrouille,
  isPaiementVerrouille,
  calculerMontantDu,
  calculerDon,
  determinerStatutAvance,
  calculerStatsCulte,
  JOURS_VERROUILLAGE_CULTE,
} from "@/lib/cotisation-logic";
import { performLocalRecovery } from "@/lib/localRecovery";

void _pf;

// ─────────────────────────────────────────────────────────────────────────────
// chaos 6 — Finances / rapports : agrégats sur entrées incohérentes
// ─────────────────────────────────────────────────────────────────────────────

describe("chaos 6 — rapports financiers : entrées incohérentes dégradent sans planter", () => {
  const period = { start: "2026-10-01", end: "2026-10-31", label: "Octobre 2026" };
  const org = { id: "o1", name: "Org" };

  it("transaction sans montant / type inconnu → 0, jamais NaN dans les totaux", () => {
    const report = buildOrgReport({
      fromOrg: org,
      toOrg: org,
      period,
      transactions: [
        { id: "t1", date: "2026-10-05", type: "INCOME", amount: undefined },
        { id: "t2", date: "2026-10-06", type: "INCOME", amount: null },
        { id: "t3", date: "2026-10-07", type: "WEIRD", amount: 500 },
        { id: "t4", date: "2026-10-08", type: "EXPENSE", amount: "abc" },
      ],
      events: [],
      members: [],
      documents: [],
    });
    expect(Number.isFinite(report.summary.totalIncome)).toBe(true);
    expect(Number.isFinite(report.summary.totalExpense)).toBe(true);
    expect(Number.isFinite(report.summary.netResult)).toBe(true);
    // `type` inconnu n'est PAS compté comme une dépense (dégradation sûre).
    expect(report.summary.totalExpense).toBe(0);
  });

  it("date manquante / invalide → transaction exclue de la période, pas d'exception", () => {
    expect(() =>
      buildOrgReport({
        fromOrg: org,
        toOrg: org,
        period,
        transactions: [
          { id: "t1", type: "INCOME", amount: 100 }, // date absente
          { id: "t2", date: "pas-une-date", type: "INCOME", amount: 100 },
          { id: "t3", date: "2026-10-15", type: "INCOME", amount: 100 },
        ],
        events: [],
        members: [],
        documents: [],
      }),
    ).not.toThrow();
  });

  it("documents non-tableau → traité comme vide (rawDocsSafe), pas de throw", () => {
    expect(() =>
      buildOrgReport({
        fromOrg: org,
        toOrg: org,
        period,
        transactions: [],
        events: [],
        members: [],
        documents: null as unknown as any[],
      }),
    ).not.toThrow();
  });

  it("entrée entièrement vide → rapport bien formé (compteurs à 0)", () => {
    const r = buildOrgReport({
      fromOrg: org,
      toOrg: org,
      period,
      transactions: [],
      events: [],
      members: [],
      documents: [],
    });
    expect(r.summary).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      netResult: 0,
      eventCount: 0,
      memberCount: 0,
      documentCount: 0,
    });
    expect(r.document_refs).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// chaos 7 — Cultes / cotisations : arithmétique et dates limites
// ─────────────────────────────────────────────────────────────────────────────

describe("chaos 7 — cotisations : arithmétique et verrouillage temporel", () => {
  it("calculerMontantDu : multiplication exacte (pas de flottant)", () => {
    expect(calculerMontantDu(3, 1000)).toBe(3000);
    expect(calculerMontantDu(0, 1000)).toBe(0);
  });

  it("calculerDon : jamais négatif (paiement partiel → 0)", () => {
    expect(calculerDon(500, 1000)).toBe(0);
    expect(calculerDon(1500, 1000)).toBe(500);
    expect(calculerDon(1000, 1000)).toBe(0);
  });

  it("verrouillage : un culte de plus de 30 jours est verrouillé, un récent non", () => {
    const now = new Date();
    const old = new Date(now.getTime() - (JOURS_VERROUILLAGE_CULTE + 5) * 86400000);
    const recent = new Date(now.getTime() - 3 * 86400000);
    expect(isCulteVerrouille(old.toISOString())).toBe(true);
    expect(isCulteVerrouille(recent.toISOString())).toBe(false);
  });

  it("paiement verrouillé ssi culte verrouillé ET cotisation payée", () => {
    const old = new Date(Date.now() - 60 * 86400000).toISOString();
    expect(isPaiementVerrouille({ dateCulte: old, cotisationEstPaye: true })).toBe(true);
    expect(isPaiementVerrouille({ dateCulte: old, cotisationEstPaye: false })).toBe(false);
  });

  it("statut d'avance : paiement la veille → EN_AVANCE ; le jour même → PAYE", () => {
    expect(determinerStatutAvance({ datePaiement: "2026-10-09", dateCulte: "2026-10-10" })).toBe(
      "EN_AVANCE",
    );
    expect(determinerStatutAvance({ datePaiement: "2026-10-10", dateCulte: "2026-10-10" })).toBe(
      "PAYE",
    );
  });

  it("stats d'un culte : cohérence des catégories et total collecté", () => {
    const cots = [
      { culteId: "c1", statut: "PAYE", montantPaye: 1000 },
      { culteId: "c1", statut: "NON_PAYE", montantPaye: 0 },
      { culteId: "c1", statut: "ABSENT", montantPaye: 0 },
      { culteId: "c1", statut: "EN_AVANCE", montantPaye: 2000 },
      { culteId: "c2", statut: "PAYE", montantPaye: 999 }, // autre culte
    ] as any[];
    const s = calculerStatsCulte({ cotisations: cots, culteId: "c1" });
    expect(s.total).toBe(4);
    expect(s.paye + s.absent + s.nonPaye + s.enAvance).toBe(s.total);
    expect(s.totalCollecte).toBe(3000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// chaos 8 — Export / sauvegarde : injection et enveloppe auto-descriptive
// ─────────────────────────────────────────────────────────────────────────────

describe("chaos 8 — export : injection de formule et enveloppe robuste", () => {
  it("une cellule hostile (=cmd) est neutralisée dans TOUT export CSV", () => {
    expect(escapeCsvCell("=cmd|'/c calc'!A0").startsWith("'")).toBe(true);
    expect(escapeCsvCell("+1+1").startsWith("'")).toBe(true);
    expect(escapeCsvCell("@SUM(A1)").startsWith("'")).toBe(true);
  });

  it("backupToCsv neutralise une formule dans une VALEUR de donnée", () => {
    const bundle = buildBackupBundle(
      { members: [{ id: "m1", first_name: "=HYPERLINK(\"http://evil\")" }] },
      "org-1",
      "2026-10-31T00:00:00.000Z",
    );
    const csv = backupToCsv(bundle);
    // La valeur hostile ne doit JAMAIS apparaître en début de cellule nue.
    expect(csv).not.toMatch(/;=HYPERLINK/);
    expect(csv).toContain("'=HYPERLINK");
  });

  it("enveloppe auto-descriptive : comptes par entité, format, version, org", () => {
    const bundle = buildBackupBundle(
      { a: [1, 2, 3], b: [] },
      "org-42",
      "2026-10-31T00:00:00.000Z",
    );
    expect(bundle.counts).toEqual({ a: 3, b: 0 });
    expect(bundle.orgId).toBe("org-42");
    expect(bundle.exportedAt).toBe("2026-10-31T00:00:00.000Z");
    expect(typeof bundle.format).toBe("string");
    expect(typeof bundle.version).toBe("number");
  });

  it("une entité non-tableau est remplacée par [] (pas de throw à l'export)", () => {
    const bundle = buildBackupBundle(
      { bad: null as unknown as unknown[] },
      "org-1",
      "2026-10-31T00:00:00.000Z",
    );
    expect(bundle.data.bad).toEqual([]);
    expect(bundle.counts.bad).toBe(0);
  });

  it("le JSON sérialisé est relisible (aller-retour sans perte)", () => {
    const bundle = buildBackupBundle({ x: [{ n: 1 }] }, "o", "2026-10-31T00:00:00.000Z");
    const parsed = JSON.parse(serializeBackup(bundle));
    expect(parsed).toEqual(bundle);
  });

  it("nom de fichier daté, sans donnée personnelle", () => {
    const name = backupFilename("json", "2026-10-31T12:34:56.000Z");
    expect(name).toBe("lumina-sauvegarde-2026-10-31.json");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// chaos 9 — Fédération d'organisations : cycles, profondeur, largeur
// ─────────────────────────────────────────────────────────────────────────────

describe("chaos 9 — fédération : cycles et arbres extrêmes", () => {
  it("détecte un cycle direct (A → A)", () => {
    const parentOf = parentMapFrom([{ id: "A", parentOrgId: null }]);
    expect(wouldCreateCycle("A", "A", parentOf)).toBe(true);
  });

  it("détecte un cycle transitif (rattacher A sous son descendant C)", () => {
    // A → B → C (B enfant de A, C enfant de B)
    const parentOf = parentMapFrom([
      { id: "A", parentOrgId: null },
      { id: "B", parentOrgId: "A" },
      { id: "C", parentOrgId: "B" },
    ]);
    expect(wouldCreateCycle("A", "C", parentOf)).toBe(true);
    // Détacher (null) ne crée jamais de cycle.
    expect(wouldCreateCycle("A", null, parentOf)).toBe(false);
  });

  it("ne signale PAS de cycle pour un re-parentage légitime", () => {
    const parentOf = parentMapFrom([
      { id: "A", parentOrgId: null },
      { id: "B", parentOrgId: null },
    ]);
    expect(wouldCreateCycle("B", "A", parentOf)).toBe(false);
  });

  it("données DÉJÀ cycliques : la détection termine (garde anti-boucle)", () => {
    // A → B → A (cycle corrompu) : la remontée doit être bornée.
    const parentOf = parentMapFrom([
      { id: "A", parentOrgId: "B" },
      { id: "B", parentOrgId: "A" },
    ]);
    expect(() => wouldCreateCycle("X", "A", parentOf)).not.toThrow();
  });

  it("assertReparentAllowed lève sur cycle, pas sur détachement", () => {
    const parentOf = parentMapFrom([
      { id: "A", parentOrgId: null },
      { id: "B", parentOrgId: "A" },
    ]);
    expect(() => assertReparentAllowed("A", "B", parentOf)).toThrow(/cycle/i);
    expect(() => assertReparentAllowed("A", null, parentOf)).not.toThrow();
  });

  it("arbre PROFOND (chaîne de 200) : clôture et profondeur exactes", () => {
    const rows = [{ id: "n0", parentOrgId: null }];
    for (let i = 1; i < 200; i++) rows.push({ id: `n${i}`, parentOrgId: `n${i - 1}` });
    const closure = buildClosure(rows);
    expect(maxDepth(closure)).toBe(199);
    // `computeDescendants` inclut le nœud lui-même (profondeur 0) : 200 au total.
    expect(computeDescendants("n0", closure)).toHaveLength(200);
    expect(computeAncestors("n199", closure)).toHaveLength(200);
  });

  it("arbre LARGE (racine + 500 enfants) : largeur exacte", () => {
    const rows = [{ id: "root", parentOrgId: null }];
    for (let i = 0; i < 500; i++) rows.push({ id: `c${i}`, parentOrgId: "root" });
    expect(maxBreadth(rows)).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// chaos 10 — Sécurité des entrées : XSS stocké, évasion CSS, contrôle
// ─────────────────────────────────────────────────────────────────────────────

describe("chaos 10 — entrées hostiles : dégradation en texte inerte", () => {
  it("escapeHtml neutralise un script stocké", () => {
    const out = escapeHtml('<script>alert(1)</script>');
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("sanitizeCssValue empêche la sortie de la balise <style>", () => {
    const out = sanitizeCssValue("red;}</style><img src=x onerror=alert(1)>");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain(";");
  });

  it("normalizeText retire les caractères de contrôle (dont ESC) et plafonne", () => {
    const hostile = "a\u0000b\u001Bc" + "x".repeat(5000);
    const out = normalizeText(hostile);
    // eslint-disable-next-line no-control-regex -- vérifier l'absence de caractères de contrôle est le but
    expect(out).not.toMatch(/[\u0000-\u001F]/);
    expect(out.length).toBeLessThanOrEqual(MAX_TEXT_LENGTH);
  });

  it("normalizeText sur entrée non-chaîne ne lève pas", () => {
    expect(() => normalizeText({} as unknown)).not.toThrow();
    expect(normalizeText(null)).toBe("");
  });

  it("une valeur hostile très longue reste bornée (anti-DoS de rendu)", () => {
    const out = normalizeText("=".repeat(100000), { maxLength: 100 });
    expect(out.length).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// chaos 11 — Configuration dégradée : drapeaux, versionnage, jsonb
// ─────────────────────────────────────────────────────────────────────────────

describe("chaos 11 — configuration corrompue : fail-open / fail-safe", () => {
  it("drapeaux JSON corrompus → aucun drapeau (fail-open, pas d'exception)", () => {
    expect(parseFlags("{pas du json")).toEqual({});
    expect(parseFlags("[1,2,3]")).toEqual({});
    expect(parseFlags("null")).toEqual({});
  });

  it("drapeau non booléen ignoré ; drapeau inconnu → ACTIF", () => {
    expect(parseFlags({ a: "yes", b: true })).toEqual({ b: true });
    expect(isFeatureEnabled("jamais-declare", {})).toBe(true);
    expect(isFeatureEnabled("coupe", { coupe: false })).toBe(false);
  });

  it("version minimale invalide → undefined → jamais de blocage (fail-open)", () => {
    expect(parseMinSchemaVersion("abc")).toBeUndefined();
    expect(parseMinSchemaVersion(-1)).toBeUndefined();
    expect(isUpdateRequired(2, undefined)).toBe(false);
    expect(isUpdateRequired(1, 2)).toBe(true);
  });

  it("jsonb : un JSON corrompu retombe sur le repli, jamais d'exception", () => {
    expect(parseJsonbValue("[{", [])).toEqual([]);
    expect(parseJsonbValue("", { a: 1 })).toEqual({ a: 1 });
  });

  it("jsonb : type inattendu (objet là où un tableau est attendu) → repli", () => {
    // Sinon le `.map()` appelant planterait.
    expect(parseJsonbValue('{"a":1}', [] as unknown[])).toEqual([]);
  });

  it("coerceJsonbValue : une chaîne non-JSON est laissée telle quelle", () => {
    expect(coerceJsonbValue("pas du json")).toBe("pas du json");
    expect(coerceJsonbValue('{"a":1}')).toEqual({ a: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// chaos 12 — Concurrence / idempotence : rejeu et panne partielle
// ─────────────────────────────────────────────────────────────────────────────

describe("chaos 12 — rejeu / panne partielle : pas de perte ni de double effet", () => {
  it("rejeu d'une op identique : l'échappement CSV reste stable (pas d'accumulation)", () => {
    const once = escapeCsvCell("=1+1");
    const twice = escapeCsvCell("=1+1");
    expect(once).toBe(twice);
    // Ré-échapper une valeur DÉJÀ neutralisée ne double pas l'apostrophe.
    expect(escapeCsvCell(once)).toBe("'=1+1");
  });

  it("récupération locale : une étape en échec n'empêche pas le rechargement (best-effort)", async () => {
    const steps: string[] = [];
    const res = await performLocalRecovery({
      disconnect: async () => {
        steps.push("disconnect");
        throw new Error("base déjà fermée");
      },
      purgeLocalData: async () => {
        steps.push("purge");
      },
      resetOrg: () => {
        steps.push("reset-org");
      },
      reload: () => {
        steps.push("reload");
      },
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("disconnect");
    // Les étapes indépendantes ont bien tourné : l'app se recharge malgré l'échec.
    expect(steps).toEqual(["disconnect", "purge", "reset-org", "reload"]);
  });

  it("récupération locale nominale : ordre significatif respecté", async () => {
    const steps: string[] = [];
    const res = await performLocalRecovery({
      disconnect: async () => void steps.push("disconnect"),
      purgeLocalData: async () => void steps.push("purge"),
      resetOrg: () => void steps.push("reset-org"),
      reload: () => void steps.push("reload"),
    });
    expect(res.ok).toBe(true);
    expect(res.steps).toEqual(["disconnect", "purge", "reset-org", "reload"]);
  });

  it("une entrée volumineuse (10 000 lignes) s'agrège sans erreur", () => {
    const transactions = Array.from({ length: 10000 }, (_, i) => ({
      id: `t${i}`,
      date: "2026-10-15",
      type: i % 2 === 0 ? "INCOME" : "EXPENSE",
      amount: 100,
    }));
    const r = buildOrgReport({
      fromOrg: { id: "o", name: "O" },
      toOrg: { id: "o", name: "O" },
      period: { start: "2026-10-01", end: "2026-10-31", label: "Oct" },
      transactions,
      events: [],
      members: [],
      documents: [],
    });
    expect(r.summary.totalIncome).toBe(500000);
    expect(r.summary.totalExpense).toBe(500000);
    expect(r.summary.netResult).toBe(0);
  });
});
