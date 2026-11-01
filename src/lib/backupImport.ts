/**
 * Import / restauration d'une sauvegarde (PR2) — module **PUR**.
 *
 * L'EXPORT vit dans `src/lib/backup.ts` (`buildBackupBundle`, `serializeBackup`,
 * `backupToCsv`). Ce module fournit l'INVERSE : relire un fichier de sauvegarde
 * et calculer ce qu'il faudrait écrire pour restaurer l'organisation active.
 *
 * Deux étapes, jamais d'écriture aveugle (même philosophie que l'import CSV
 * PR12) :
 *   1. `parseBackupBundle` — valide la STRUCTURE du fichier. **Fail-closed** :
 *      toute entrée malformée lève une `BackupImportError` typée. On ne
 *      « restaure » jamais partiellement un fichier qu'on n'a pas compris.
 *   2. `planRestore` — **pure**, sans I/O : compare le bundle à l'état courant
 *      et produit un plan (créations / mises à jour / conflits), **borné à
 *      l'organisation active**. Un `bundle.orgId` différent de l'organisation
 *      courante est REFUSÉ (anti-fuite inter-org) — un fichier sauvegardé pour
 *      l'organisation A ne doit jamais pouvoir écrire dans l'organisation B.
 *
 * La partie « écrire » est INJECTÉE (`restoreBackupRows`, data layer) : ce
 * module reste testable sans PowerSync ni navigateur.
 *
 * NOTE anti-injection de formule (OWASP « CSV injection ») : elle est appliquée
 * à l'EXPORT CSV (`escapeCsvRow`) et à l'IMPORT CSV (`sanitizeImportedCell`).
 * L'import JSON n'est PAS concerné : un fichier JSON n'est jamais évalué par un
 * tableur, donc une valeur `=1+1` relue ici est du TEXTE inerte. Le risque
 * réapparaîtrait uniquement si l'utilisateur ré-exportait en CSV — chemin qui
 * repasse par `escapeCsvRow`. On ne duplique donc AUCUNE logique d'échappement
 * ici : une seule source de vérité (`csv.ts`).
 */
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupBundle,
} from "./backup";

export type BackupImportErrorCode =
  | "INVALID_JSON"
  | "INVALID_SHAPE"
  | "UNKNOWN_FORMAT"
  | "UNKNOWN_VERSION"
  | "MISSING_ORG"
  | "INVALID_DATA"
  | "ORG_MISMATCH";

/** Erreur typée et explicite — jamais de « restauration partielle silencieuse ». */
export class BackupImportError extends Error {
  readonly code: BackupImportErrorCode;

  constructor(code: BackupImportErrorCode, message: string) {
    super(message);
    this.name = "BackupImportError";
    this.code = code;
  }
}

/** Un nom de colonne/table doit être un identifiant SQL sûr (anti-injection). */
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Valide et normalise un fichier de sauvegarde. Lève une `BackupImportError`
 * dès la première anomalie (fail-closed) :
 *   - JSON illisible → `INVALID_JSON` ;
 *   - racine qui n'est pas un objet → `INVALID_SHAPE` ;
 *   - `format` ≠ `lumina-backup` → `UNKNOWN_FORMAT` ;
 *   - `version` ≠ version connue → `UNKNOWN_VERSION` ;
 *   - `orgId` absent/vide → `MISSING_ORG` ;
 *   - `data` non-objet, valeur non-tableau, ligne non-objet ou clé non
 *     identifiant → `INVALID_DATA`.
 *
 * `counts` n'est JAMAIS cru sur parole : il est recalculé depuis `data` (source
 * de vérité unique, cohérente avec `buildBackupBundle`).
 */
export function parseBackupBundle(text: string): BackupBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupImportError(
      "INVALID_JSON",
      "Le fichier n'est pas un JSON valide.",
    );
  }

  if (!isRecord(parsed)) {
    throw new BackupImportError(
      "INVALID_SHAPE",
      "Le fichier ne contient pas un objet de sauvegarde.",
    );
  }

  if (parsed.format !== BACKUP_FORMAT) {
    throw new BackupImportError(
      "UNKNOWN_FORMAT",
      `Format inconnu : « ${String(parsed.format)} » (attendu « ${BACKUP_FORMAT} »).`,
    );
  }

  if (parsed.version !== BACKUP_VERSION) {
    throw new BackupImportError(
      "UNKNOWN_VERSION",
      `Version de sauvegarde non prise en charge : ${String(parsed.version)} (attendu ${BACKUP_VERSION}).`,
    );
  }

  if (typeof parsed.orgId !== "string" || parsed.orgId.trim() === "") {
    throw new BackupImportError(
      "MISSING_ORG",
      "La sauvegarde n'indique pas d'organisation.",
    );
  }

  const rawData = parsed.data;
  if (!isRecord(rawData)) {
    throw new BackupImportError(
      "INVALID_DATA",
      "Le champ « data » de la sauvegarde est absent ou mal formé.",
    );
  }

  const data: Record<string, unknown[]> = {};
  for (const [entity, rows] of Object.entries(rawData)) {
    if (!Array.isArray(rows)) {
      throw new BackupImportError(
        "INVALID_DATA",
        `L'entité « ${entity} » n'est pas un tableau d'éléments.`,
      );
    }
    for (const row of rows) {
      if (!isRecord(row)) {
        throw new BackupImportError(
          "INVALID_DATA",
          `L'entité « ${entity} » contient un élément qui n'est pas un objet.`,
        );
      }
      for (const key of Object.keys(row)) {
        if (!IDENTIFIER_RE.test(key)) {
          throw new BackupImportError(
            "INVALID_DATA",
            `Nom de colonne invalide « ${key} » dans l'entité « ${entity} ».`,
          );
        }
      }
    }
    data[entity] = rows;
  }

  const counts: Record<string, number> = {};
  for (const [entity, rows] of Object.entries(data)) counts[entity] = rows.length;

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt:
      typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    orgId: parsed.orgId,
    counts,
    data,
  };
}

// ─── Registre des entités restaurables ──────────────────────────────────────

interface RestoreEntitySpec {
  /** Clé d'entité dans `bundle.data` (posée par `useBackupData`). */
  key: string;
  /** Table SQLite PowerSync cible. */
  table: string;
  /** Normalise une ligne du bundle en colonnes de base (snake_case). */
  toDbRow: (row: Record<string, unknown>, orgId: string) => Record<string, unknown>;
}

/** Recopie la ligne telle quelle et FORCE le cloisonnement d'organisation. */
function identityRow(
  row: Record<string, unknown>,
  orgId: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "id" || value === undefined) continue;
    out[key] = value;
  }
  out.org_id = orgId;
  return out;
}

/** `forms` est sauvegardé en camelCase (`FormDefinition`) → colonnes PG. */
function formRow(
  row: Record<string, unknown>,
  orgId: string,
): Record<string, unknown> {
  return {
    org_id: orgId,
    key: row.key ?? null,
    name: row.name ?? null,
    description: row.description ?? null,
    version: row.version ?? null,
    target_entity_type: row.targetEntityType ?? null,
    fields: row.fields ?? null,
    status: row.status ?? null,
    created_at: row.createdAt ?? null,
    updated_at: row.updatedAt ?? null,
  };
}

/** `custom_fields` est sauvegardé en camelCase (`CustomFieldDefinition`). */
function customFieldRow(
  row: Record<string, unknown>,
  orgId: string,
): Record<string, unknown> {
  return {
    org_id: orgId,
    entity_type: row.entityType ?? null,
    field_name: row.key ?? null,
    field_label: row.label ?? null,
    field_type: row.type ?? null,
    options: row.options ?? null,
    order: row.order ?? null,
    created_at: row.createdAt ?? null,
    updated_at: row.updatedAt ?? null,
  };
}

/**
 * Entités réellement restaurées. Volontairement ABSENTE : `audit_entries`
 * (journal append-only, R140 — on ne réécrit jamais l'historique d'audit), et
 * toute entité inconnue du registre, qui est signalée dans `skipped` (jamais
 * ignorée en silence).
 */
const RESTORE_ENTITIES: readonly RestoreEntitySpec[] = [
  { key: "transactions", table: "transactions", toDbRow: identityRow },
  { key: "members", table: "members", toDbRow: identityRow },
  { key: "groups", table: "groups", toDbRow: identityRow },
  { key: "events", table: "events", toDbRow: identityRow },
  { key: "caisses", table: "caisses", toDbRow: identityRow },
  { key: "accounts", table: "accounts", toDbRow: identityRow },
  { key: "notifications", table: "notifications", toDbRow: identityRow },
  { key: "documents", table: "documents", toDbRow: identityRow },
  { key: "forms", table: "form_definitions", toDbRow: formRow },
  { key: "custom_fields", table: "custom_field_definitions", toDbRow: customFieldRow },
];

/** Tables que le data layer accepte d'écrire (liste blanche, anti-injection). */
export const RESTORABLE_TABLES: readonly string[] = RESTORE_ENTITIES.map(
  (e) => e.table,
);

// ─── Plan de restauration ───────────────────────────────────────────────────

export interface RestoreCurrentState {
  /** Organisation active (doit égaler `bundle.orgId`). */
  orgId: string;
  /** Lignes actuellement présentes, indexées par clé d'entité. */
  collections: Record<string, unknown[]>;
}

export interface RestoreRowChange {
  entity: string;
  table: string;
  id: string;
  /** Colonnes de base (snake_case) prêtes à écrire, `org_id` déjà forcé. */
  row: Record<string, unknown>;
}

export interface RestoreConflict {
  entity: string;
  id: string;
  reason: string;
}

export interface RestoreSkippedEntity {
  entity: string;
  count: number;
  reason: string;
}

export interface RestorePlan {
  orgId: string;
  creates: RestoreRowChange[];
  updates: RestoreRowChange[];
  conflicts: RestoreConflict[];
  skipped: RestoreSkippedEntity[];
  counts: { creates: number; updates: number; conflicts: number; skipped: number };
}

/**
 * Compare le bundle importé à l'état courant et produit un plan **pur**.
 *
 * Bornage d'organisation (anti-fuite inter-org) :
 *   - `bundle.orgId` ≠ `current.orgId` → `ORG_MISMATCH` (refus immédiat) ;
 *   - une ligne portant un `org_id`/`orgId` étranger est classée en CONFLIT
 *     (jamais restaurée) — un fichier trafiqué ne peut pas injecter de lignes
 *     dans une autre organisation.
 */
export function planRestore(
  bundle: BackupBundle,
  current: RestoreCurrentState,
): RestorePlan {
  if (bundle.orgId !== current.orgId) {
    throw new BackupImportError(
      "ORG_MISMATCH",
      "Cette sauvegarde appartient à une autre organisation : restauration refusée.",
    );
  }

  const creates: RestoreRowChange[] = [];
  const updates: RestoreRowChange[] = [];
  const conflicts: RestoreConflict[] = [];
  const skipped: RestoreSkippedEntity[] = [];

  const known = new Set(RESTORE_ENTITIES.map((e) => e.key));
  for (const [entity, rows] of Object.entries(bundle.data)) {
    if (!known.has(entity)) {
      skipped.push({
        entity,
        count: rows.length,
        reason: "entité non restaurable (journal d'audit ou inconnue)",
      });
    }
  }

  for (const spec of RESTORE_ENTITIES) {
    const rows = bundle.data[spec.key] ?? [];
    if (rows.length === 0) continue;

    const existingIds = new Set(
      (current.collections[spec.key] ?? [])
        .filter(isRecord)
        .map((r) => String(r.id)),
    );
    const seen = new Set<string>();

    for (const raw of rows) {
      if (!isRecord(raw)) {
        conflicts.push({
          entity: spec.key,
          id: "",
          reason: "élément qui n'est pas un objet",
        });
        continue;
      }
      const row = raw;
      const id = row.id;
      if (typeof id !== "string" || id.trim() === "") {
        conflicts.push({
          entity: spec.key,
          id: "",
          reason: "élément sans identifiant",
        });
        continue;
      }
      if (seen.has(id)) {
        conflicts.push({
          entity: spec.key,
          id,
          reason: "identifiant présent deux fois dans le fichier",
        });
        continue;
      }
      seen.add(id);

      const rowOrg = row.org_id ?? row.orgId;
      if (rowOrg !== undefined && rowOrg !== bundle.orgId) {
        conflicts.push({
          entity: spec.key,
          id,
          reason: "ligne d'une autre organisation",
        });
        continue;
      }

      const change: RestoreRowChange = {
        entity: spec.key,
        table: spec.table,
        id,
        row: spec.toDbRow(row, bundle.orgId),
      };
      if (existingIds.has(id)) updates.push(change);
      else creates.push(change);
    }
  }

  return {
    orgId: bundle.orgId,
    creates,
    updates,
    conflicts,
    skipped,
    counts: {
      creates: creates.length,
      updates: updates.length,
      conflicts: conflicts.length,
      skipped: skipped.reduce((n, s) => n + s.count, 0),
    },
  };
}

/** Aplatit un plan en lignes écrivables (créations puis mises à jour). */
export function restorePlanToRows(plan: RestorePlan): RestoreRowChange[] {
  return [...plan.creates, ...plan.updates];
}

/** Résumé lisible du plan (compteurs), pour l'affichage et le toast. */
export function restorePlanSummary(plan: RestorePlan): string {
  const { creates, updates, conflicts } = plan.counts;
  return `${creates} création(s), ${updates} mise(s) à jour, ${conflicts} conflit(s)`;
}
