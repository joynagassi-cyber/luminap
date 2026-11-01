/**
 * Import CSV sécurisé (PR12) — parseur défensif + plan d'import transactions.
 *
 * L'EXPORT vit dans `src/lib/csv.ts` (`escapeCsvRow`). Ce module fournit
 * l'INVERSE et ne duplique AUCUNE logique d'échappement : il réutilise
 * `sanitizeImportedCell` (même source de vérité OWASP « CSV injection »).
 *
 * Garanties :
 *   - analyse tolérante : champs entre guillemets, guillemets échappés (`""`),
 *     fins de ligne CRLF **et** LF, BOM UTF-8 en tête ;
 *   - une cellule commençant par `=`, `+`, `-`, `@`, TAB ou CR est traitée
 *     comme TEXTE LITTÉRAL : le déclencheur est neutralisé (apostrophe de tête)
 *     et un avertissement de nettoyage est enregistré. Rien n'est jamais
 *     évalué comme formule ;
 *   - entrée BORNÉE (octets, lignes, longueur de cellule) : un dépassement est
 *     refusé proprement, jamais par une exception ;
 *   - l'en-tête doit correspondre EXACTEMENT aux colonnes attendues (ni
 *     manquante, ni superflue) — sinon rejet avec un message FR explicite ;
 *   - résultat typé `{ ok, rows, errors, warnings }` (aucune exception).
 *
 * L'import cible les transactions : chaque ligne est validée par
 * `validateAddTransaction` (source de vérité partagée avec la saisie manuelle)
 * puis créée en statut `DRAFT` — JAMAIS auto-APPROUVÉE.
 *
 * Module PUR pour l'analyse : les effets de bord (écriture) sont INJECTÉS
 * (`runTransactionImport(plan, persist)`), ce qui rend le chemin d'import
 * testable sans PowerSync ni navigateur.
 */
import { sanitizeImportedCell } from "./csv";
import {
  validateAddTransaction,
  type TransactionInput,
} from "./transaction-service";
import type { FundSource, TransactionStatus, TransactionType } from "@/types";

/** Colonnes attendues dans le CSV d'import de transactions (ordre libre). */
export const TRANSACTION_IMPORT_COLUMNS = [
  "type",
  "amount",
  "description",
  "date",
  "category_id",
  "source",
  "comment",
] as const;

export type TransactionImportColumn = (typeof TRANSACTION_IMPORT_COLUMNS)[number];

export interface CsvParseLimits {
  /** Nombre maximum de lignes de données (hors en-tête). */
  maxRows: number;
  /** Longueur maximale d'une cellule (caractères Unicode). */
  maxCellLength: number;
  /** Taille maximale du fichier (caractères — approximation d'octets). */
  maxBytes: number;
}

export const DEFAULT_CSV_LIMITS: CsvParseLimits = {
  maxRows: 500,
  maxCellLength: 1000,
  maxBytes: 2_000_000,
};

export interface CsvImportError {
  /** 0 = en-tête ; ≥ 1 = ligne de données (1-based, hors en-tête). */
  row: number;
  column?: string;
  message: string;
}

export interface CsvImportRow {
  /** Index 1-based de la ligne de données. */
  row: number;
  /** Cellules nettoyées, alignées sur `header`. */
  values: string[];
  /** Une cellule au moins a été neutralisée (déclencheur de formule). */
  sanitized: boolean;
}

export interface CsvParseResult {
  ok: boolean;
  /** En-tête normalisé (tel que lu), vide si le fichier n'a pas pu être lu. */
  header: string[];
  rows: CsvImportRow[];
  errors: CsvImportError[];
  warnings: string[];
}

/** Détecte le délimiteur à partir de la première ligne logique (hors guillemets). */
function detectDelimiter(text: string): string {
  let inQuotes = false;
  let semicolons = 0;
  let commas = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    if (!inQuotes && ch === ";") semicolons++;
    else if (!inQuotes && ch === ",") commas++;
  }
  return semicolons >= commas ? ";" : ",";
}

interface TokenizeResult {
  records: string[][];
  unterminated: boolean;
}

/** Tokenise un CSV en enregistrements (RFC 4180 : guillemets + `""`). */
function tokenize(text: string, delimiter: string): TokenizeResult {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      record.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      field = "";
      records.push(record);
      record = [];
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (inQuotes) return { records, unterminated: true };
  // Dernier enregistrement sans fin de ligne finale.
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return { records, unterminated: false };
}

function normalizeHeaderCell(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Analyse un CSV d'import de transactions. Ne lève jamais : toute anomalie
 * (taille, en-tête, guillemet non fermé, cellule trop longue, trop de lignes)
 * produit un `CsvParseResult.ok === false` avec un message FR.
 */
export function parseTransactionCsv(
  input: string,
  limits: CsvParseLimits = DEFAULT_CSV_LIMITS,
  expectedColumns: readonly string[] = TRANSACTION_IMPORT_COLUMNS,
): CsvParseResult {
  const empty: CsvParseResult = {
    ok: false,
    header: [],
    rows: [],
    errors: [],
    warnings: [],
  };

  if (typeof input !== "string" || input.length === 0) {
    return { ...empty, errors: [{ row: 0, message: "Fichier vide." }] };
  }
  if (input.length > limits.maxBytes) {
    return {
      ...empty,
      errors: [
        {
          row: 0,
          message: `Fichier trop volumineux (${input.length} caractères > ${limits.maxBytes}).`,
        },
      ],
    };
  }

  // BOM UTF-8 : Excel l'ajoute en tête de fichier. On le retire avant analyse.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const delimiter = detectDelimiter(text);
  const { records, unterminated } = tokenize(text, delimiter);

  if (unterminated) {
    return {
      ...empty,
      errors: [
        {
          row: 0,
          message: "Guillemet non fermé : le fichier CSV est malformé.",
        },
      ],
    };
  }
  if (records.length === 0) {
    return { ...empty, errors: [{ row: 0, message: "Fichier vide." }] };
  }

  const header = records[0].map(normalizeHeaderCell);
  const expected = expectedColumns.map((c) => c.toLowerCase());
  const expectedSet = new Set(expected);
  const headerSet = new Set(header);
  const missing = expected.filter((c) => !headerSet.has(c));
  const unexpected = header.filter((c) => !expectedSet.has(c));
  if (missing.length > 0 || unexpected.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`colonnes manquantes : ${missing.join(", ")}`);
    if (unexpected.length > 0)
      parts.push(`colonnes inattendues : ${unexpected.join(", ")}`);
    return {
      ...empty,
      header,
      errors: [
        {
          row: 0,
          message: `En-tête invalide (${parts.join(" ; ")}). Colonnes attendues : ${expected.join(", ")}.`,
        },
      ],
    };
  }

  const dataRecords = records.slice(1);
  if (dataRecords.length > limits.maxRows) {
    return {
      ...empty,
      header,
      errors: [
        {
          row: 0,
          message: `Trop de lignes (${dataRecords.length} > ${limits.maxRows}).`,
        },
      ],
    };
  }

  const rows: CsvImportRow[] = [];
  const errors: CsvImportError[] = [];
  const warnings: string[] = [];

  dataRecords.forEach((record, idx) => {
    const rowNumber = idx + 1;
    // Ligne entièrement vide : ignorée silencieusement (fin de fichier).
    if (record.length === 1 && record[0].trim() === "") return;

    const rawCells = header.map((_, col) => record[col] ?? "");
    let sanitized = false;
    const values = rawCells.map((raw) => {
      const { value, sanitized: wasSanitized } = sanitizeImportedCell(raw);
      if (wasSanitized) sanitized = true;
      return value;
    });

    const tooLong = values.findIndex((v) => v.length > limits.maxCellLength);
    if (tooLong !== -1) {
      errors.push({
        row: rowNumber,
        column: header[tooLong],
        message: `Cellule trop longue (max ${limits.maxCellLength} caractères).`,
      });
      return;
    }

    if (sanitized) {
      warnings.push(
        `Ligne ${rowNumber} : un déclencheur de formule a été neutralisé (traité comme texte).`,
      );
    }

    rows.push({ row: rowNumber, values, sanitized });
  });

  return {
    ok: errors.length === 0,
    header,
    rows,
    errors,
    warnings,
  };
}

// ─── Mise en correspondance CSV → transaction ────────────────────────────────

export interface TransactionImportContext {
  orgId: string;
  createdById: string;
  /** Caisse par défaut si la colonne `source` ne l'explicite pas. */
  defaultSourceCaisseId?: string;
}

const SOURCE_VALUES: readonly FundSource[] = [
  "CAISSE",
  "COTISATION",
  "PERSONNE",
  "AUTRE",
];

function parseType(raw: string): TransactionType | null {
  const v = raw.trim().toUpperCase();
  if (v === "INCOME" || v === "ENTREE" || v === "ENTRÉE" || v === "RECETTE")
    return "INCOME";
  if (v === "EXPENSE" || v === "SORTIE" || v === "DEPENSE" || v === "DÉPENSE")
    return "EXPENSE";
  return null;
}

/** Normalise un montant « humain » (FCFA) : espaces/points de milliers, virgule. */
function parseAmountToCents(raw: string): number | null {
  const cleaned = raw
    .replace(/\s|\u00a0/g, "")
    .replace(/[.,](?=\d{3}\b)/g, "") // séparateurs de milliers
    .replace(",", "."); // virgule décimale → point
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

export interface ImportPlanRow {
  row: number;
  status: "valid" | "invalid";
  /** Message d'erreur FR si `status === "invalid"`. */
  error?: string;
  /** Entrée prête à persister si `status === "valid"` (statut DRAFT). */
  input?: TransactionInput;
  /** Une cellule a été neutralisée (formule). */
  sanitized: boolean;
}

export interface ImportPlan {
  rows: ImportPlanRow[];
  valid: number;
  invalid: number;
}

/**
 * Construit le plan d'import : chaque ligne est convertie puis VALIDÉE par
 * `validateAddTransaction` (mêmes règles que la saisie manuelle). Aucune ligne
 * invalide ne porte d'`input` → elle ne sera jamais écrite.
 */
export function buildTransactionImportPlan(
  parsed: CsvParseResult,
  ctx: TransactionImportContext,
): ImportPlan {
  const index = new Map<string, number>();
  parsed.header.forEach((h, i) => index.set(h, i));

  const rows: ImportPlanRow[] = [];
  let valid = 0;
  let invalid = 0;

  for (const r of parsed.rows) {
    const get = (col: string): string => {
      const i = index.get(col);
      return i === undefined ? "" : (r.values[i] ?? "").trim();
    };

    const type = parseType(get("type"));
    const amount = parseAmountToCents(get("amount"));
    const description = get("description");
    const date = get("date");
    const categoryId = get("category_id");
    const sourceRaw = get("source").toUpperCase();
    const comment = get("comment");

    if (type === null) {
      rows.push({
        row: r.row,
        status: "invalid",
        error: "Type invalide (attendu : INCOME ou EXPENSE).",
        sanitized: r.sanitized,
      });
      invalid++;
      continue;
    }
    if (amount === null) {
      rows.push({
        row: r.row,
        status: "invalid",
        error: "Montant invalide.",
        sanitized: r.sanitized,
      });
      invalid++;
      continue;
    }

    let source: FundSource = "CAISSE";
    if (sourceRaw) {
      const match = SOURCE_VALUES.find((s) => s === sourceRaw);
      if (!match) {
        rows.push({
          row: r.row,
          status: "invalid",
          error: `Source invalide (attendu : ${SOURCE_VALUES.join(", ")}).`,
          sanitized: r.sanitized,
        });
        invalid++;
        continue;
      }
      source = match;
    }

    const input: TransactionInput = {
      orgId: ctx.orgId,
      type,
      amount,
      description,
      date,
      // Import = BROUILLON. Jamais auto-approuvé (contrôle financier).
      status: "DRAFT" as TransactionStatus,
      createdById: ctx.createdById,
      approvedById: null,
      approvedAt: null,
      categoryId,
      orgUnitId: null,
      eventId: null,
      source,
      personName: null,
      compensatesFor: null,
      comment: comment || null,
      sourceCaisseId: ctx.defaultSourceCaisseId ?? "main",
      versementId: null,
      cotisationId: null,
    };

    const check = validateAddTransaction(input);
    if (!check.allowed) {
      rows.push({
        row: r.row,
        status: "invalid",
        error: check.reason ?? "Ligne invalide.",
        sanitized: r.sanitized,
      });
      invalid++;
      continue;
    }

    rows.push({
      row: r.row,
      status: "valid",
      input,
      sanitized: r.sanitized,
    });
    valid++;
  }

  return { rows, valid, invalid };
}

// ─── Exécution de l'import (effets injectés) ─────────────────────────────────

export interface ImportSummary {
  imported: number;
  skipped: number;
  errors: CsvImportError[];
}

/**
 * Écrit UNIQUEMENT les lignes `valid` du plan via `persist` (injecté : la
 * couche data/audit n'est pas couplée ici, ce qui rend le chemin testable).
 * Une ligne invalide n'appelle JAMAIS `persist`. Une erreur d'écriture est
 * rapportée et n'interrompt pas les lignes suivantes.
 */
export async function runTransactionImport(
  plan: ImportPlan,
  persist: (input: TransactionInput) => Promise<void>,
): Promise<ImportSummary> {
  let imported = 0;
  let skipped = 0;
  const errors: CsvImportError[] = [];

  for (const row of plan.rows) {
    if (row.status !== "valid" || !row.input) {
      skipped++;
      continue;
    }
    try {
      await persist(row.input);
      imported++;
    } catch (err) {
      skipped++;
      errors.push({
        row: row.row,
        message: `Écriture échouée : ${err instanceof Error ? err.message : "erreur inconnue"}`,
      });
    }
  }

  return { imported, skipped, errors };
}

/** Modèle CSV (en-tête + une ligne d'exemple) proposé au téléchargement. */
export function transactionImportTemplate(): string {
  return [
    TRANSACTION_IMPORT_COLUMNS.join(";"),
    ["INCOME", "10000", "Dîme du mois", "2026-01-31", "cat-dime", "CAISSE", ""].join(
      ";",
    ),
  ].join("\n");
}
