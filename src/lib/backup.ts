/**
 * Sauvegarde / export complet des données d'une organisation (PR2).
 *
 * Ce module est **pur** : il ne touche ni au réseau, ni à PowerSync, ni au DOM.
 * Il transforme une collection de jeux de données (déjà lus par le data layer)
 * en un artefact **auto-descriptif** et **déterministe** :
 *
 *   - JSON (`serializeBackup`) : l'enveloppe `BackupBundle` décrit le format,
 *     la version, l'organisation, l'horodatage et le nombre d'éléments de
 *     chaque entité — un fichier relisible sans contexte externe.
 *   - CSV (`backupToCsv`) : un seul tableau, une colonne `entity` + les
 *     colonnes rencontrées. CHAQUE ligne passe par `escapeCsvRow` (csv.ts) —
 *     anti-injection de formule OWASP obligatoire pour tout export CSV.
 *
 * La partie « lire les données » vit dans le hook `useBackupData` : la pureté
 * de ce module garantit que la construction du fichier est testable sans
 * PowerSync ni navigateur.
 */
import { escapeCsvRow } from "./csv";

export const BACKUP_FORMAT = "lumina-backup";
export const BACKUP_VERSION = 1;

export interface BackupBundle {
  format: string;
  version: number;
  exportedAt: string;
  orgId: string;
  counts: Record<string, number>;
  data: Record<string, unknown[]>;
}

/**
 * Construit l'enveloppe de sauvegarde. Déterministe : à entrées égales (et
 * `now` fourni), le résultat est identique — `counts` est **dérivé** de `data`,
 * jamais fourni à part (une source de vérité unique, pas de désynchronisation).
 */
export function buildBackupBundle(
  collections: Record<string, unknown[]>,
  orgId: string,
  now?: string,
): BackupBundle {
  const data: Record<string, unknown[]> = {};
  for (const [entity, rows] of Object.entries(collections)) {
    data[entity] = Array.isArray(rows) ? [...rows] : [];
  }
  const counts: Record<string, number> = {};
  for (const [entity, rows] of Object.entries(data)) {
    counts[entity] = rows.length;
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now ?? new Date().toISOString(),
    orgId,
    counts,
    data,
  };
}

/** Sérialise l'enveloppe en JSON lisible (indenté, relisible par `JSON.parse`). */
export function serializeBackup(bundle: BackupBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/** Une valeur de cellule est-elle un enregistrement (objet non nul) ? */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Aplatit l'enveloppe en UN seul CSV : en-tête `entity` + colonnes rencontrées
 * (union triée), puis une ligne par enregistrement. Chaque ligne — en-tête
 * compris — est échappée via `escapeCsvRow` (neutralisation des formules).
 */
export function backupToCsv(bundle: BackupBundle): string {
  const entities = Object.keys(bundle.data).sort();

  const columns = new Set<string>();
  for (const entity of entities) {
    for (const row of bundle.data[entity]) {
      if (isRecord(row)) {
        for (const key of Object.keys(row)) columns.add(key);
      } else {
        columns.add("value");
      }
    }
  }
  const cols = [...columns].sort();

  const lines: string[] = [escapeCsvRow(["entity", ...cols])];
  for (const entity of entities) {
    for (const row of bundle.data[entity]) {
      const record: Record<string, unknown> = isRecord(row)
        ? row
        : { value: row };
      lines.push(escapeCsvRow([entity, ...cols.map((c) => record[c] ?? "")]));
    }
  }
  return lines.join("\n");
}

/** Nom de fichier de sauvegarde, daté (ISO, jour), sans donnée personnelle. */
export function backupFilename(
  kind: "json" | "csv",
  exportedAt: string,
): string {
  const day = exportedAt.slice(0, 10);
  return `lumina-sauvegarde-${day}.${kind}`;
}
