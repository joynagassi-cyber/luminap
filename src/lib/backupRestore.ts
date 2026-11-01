/**
 * Restauration d'une sauvegarde — écriture (PR2).
 *
 * Ce module est le SEUL point qui écrit les lignes d'un plan de restauration
 * (`planRestore`, module pur `backupImport.ts`) dans la base locale PowerSync.
 * Il respecte deux garde-fous du dépôt :
 *
 *   1. **R160** — une table PowerSync est exposée comme une VUE : un
 *      `INSERT … ON CONFLICT`/`INSERT OR REPLACE` échoue (« cannot UPSERT a
 *      view »). On fait donc, par ligne, un `SELECT id` puis `UPDATE`-ou-
 *      `INSERT` explicite (même patron que `setOrgSetting`).
 *   2. **Liste blanche de tables** (`RESTORABLE_TABLES`) : le nom de table n'est
 *      jamais interpolé depuis une entrée utilisateur — un fichier trafiqué ne
 *      peut pas écrire dans une table arbitraire.
 *
 * Les colonnes `jsonb`/`text[]` sont sérialisées via `JSONB_COLUMNS`
 * (`jsonb.ts`) — source de vérité unique, cohérente avec l'upload PowerSync.
 */
import { getPowerSyncDatabase } from "@/lib/powersync";
import { JSONB_COLUMNS } from "./jsonb";
import {
  RESTORABLE_TABLES,
  restorePlanToRows,
  type RestorePlan,
} from "./backupImport";

export interface RestoreWriteResult {
  written: number;
  created: number;
  updated: number;
}

/** Identifiants SQL entre backticks (`order` est un mot réservé). */
function quoteIdent(name: string): string {
  return `\`${name.replace(/`/g, "")}\``;
}

/** Sérialise les colonnes structurées (jsonb / text[]) en texte, une fois. */
function serializeColumns(
  table: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const jsonbCols = JSONB_COLUMNS[table];
  if (!jsonbCols) return row;
  const out: Record<string, unknown> = { ...row };
  for (const col of jsonbCols) {
    const value = out[col];
    if (value !== null && typeof value === "object") {
      out[col] = JSON.stringify(value);
    }
  }
  return out;
}

/**
 * Écrit le plan dans la base locale. Chaque ligne est écrite en `SELECT` puis
 * `UPDATE`-ou-`INSERT` (jamais d'UPSERT — cf. R160). Lève si une table hors
 * liste blanche est rencontrée (défense en profondeur).
 */
export async function restoreBackupRows(
  plan: RestorePlan,
): Promise<RestoreWriteResult> {
  const db = getPowerSyncDatabase();
  let created = 0;
  let updated = 0;

  for (const change of restorePlanToRows(plan)) {
    if (!RESTORABLE_TABLES.includes(change.table)) {
      throw new Error(`Table non restaurable : ${change.table}`);
    }
    const row = serializeColumns(change.table, change.row);
    const columns = Object.keys(row);

    const existing = await db.execute(
      `SELECT id FROM ${quoteIdent(change.table)} WHERE id = ?`,
      [change.id],
    );
    const found = ((existing?.array as unknown[]) ?? []).length > 0;

    if (found) {
      const setClause = columns.map((c) => `${quoteIdent(c)} = ?`).join(", ");
      await db.execute(
        `UPDATE ${quoteIdent(change.table)} SET ${setClause} WHERE id = ?`,
        [...columns.map((c) => row[c]), change.id],
      );
      updated++;
    } else {
      const colList = ["id", ...columns].map(quoteIdent).join(", ");
      const placeholders = ["id", ...columns].map(() => "?").join(", ");
      await db.execute(
        `INSERT INTO ${quoteIdent(change.table)} (${colList}) VALUES (${placeholders})`,
        [change.id, ...columns.map((c) => row[c])],
      );
      created++;
    }
  }

  return { written: created + updated, created, updated };
}
