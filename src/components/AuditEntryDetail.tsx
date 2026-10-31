/**
 * Détail d'une entrée du journal d'audit (PR1).
 *
 * La liste `/trace` affichait « Modifié » sans jamais montrer ce qui avait
 * changé : `before_state` / `after_state` / `actor_role_at_time` / `comment`
 * étaient lus mais jamais rendus. Un utilisateur ne pouvait donc PAS auditer
 * une action sensible (impossible de savoir ce qui a été modifié, par qui et
 * avec quel rôle). Ce composant ferme cet écart d'intégrité.
 *
 * Règles :
 *  - les états sont des `jsonb` lus en `text` : le décodage est TOLÉRANT
 *    (`null`, chaîne `"null"` historique, JSON valide, ou texte brut) ;
 *  - un état illisible ne fait JAMAIS planter l'écran : la valeur brute est
 *    affichée et l'erreur est instrumentée (`captureClientError`, R88) ;
 *  - seules les clés réellement changées sont listées (ajout / retrait /
 *    modification) quand les deux états sont des objets ;
 *  - libellés français explicites (« Créé », « Supprimé »).
 */
import { useEffect, useMemo } from "react";
import { captureClientError } from "@/lib/clientErrors";
import { ROLE_LABELS } from "@/lib/rbac";

export interface AuditEntryLike {
  actor_role_at_time?: string | null;
  actorRoleAtTime?: string | null;
  before_state?: unknown;
  after_state?: unknown;
  beforeState?: unknown;
  afterState?: unknown;
  comment?: string | null;
}

export interface ParsedAuditState {
  /** Un état est « présent » s'il existe et n'est pas `null`. */
  present: boolean;
  value: unknown;
  raw: string;
  /** `true` si la chaîne n'a pas pu être décodée en JSON. */
  malformed: boolean;
}

export type AuditChangeKind =
  | "created"
  | "deleted"
  | "changed"
  | "unchanged"
  | "unreadable";

export interface AuditChangeRow {
  key: string;
  before: string;
  after: string;
  kind: "added" | "removed" | "changed";
}

export interface AuditDiff {
  kind: AuditChangeKind;
  rows: AuditChangeRow[];
  beforeText: string;
  afterText: string;
}

const ABSENT = "—";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/** Rendu texte d'une valeur d'état (objet/tableau sérialisé, scalaire tel quel). */
function formatAuditValue(value: unknown): string {
  if (value === undefined || value === null) return ABSENT;
  if (typeof value === "string") return value === "" ? ABSENT : value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Décodage tolérant d'un état d'audit. Ne lève jamais.
 *  - `null` / `undefined` / `""` → absent ;
 *  - chaîne `"null"` (défaut historique : 88 lignes mesurées) → absent ;
 *  - JSON valide → valeur décodée ;
 *  - texte non-JSON → `malformed: true`, valeur brute conservée.
 */
function parseAuditState(raw: unknown): ParsedAuditState {
  if (raw === null || raw === undefined) {
    return { present: false, value: null, raw: "", malformed: false };
  }
  if (typeof raw !== "string") {
    return { present: true, value: raw, raw: formatAuditValue(raw), malformed: false };
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { present: false, value: null, raw, malformed: false };
  }
  try {
    const value = JSON.parse(trimmed);
    if (value === null) {
      return { present: false, value: null, raw, malformed: false };
    }
    return { present: true, value, raw, malformed: false };
  } catch {
    return { present: true, value: undefined, raw, malformed: true };
  }
}

/**
 * Calcule la différence lisible entre deux états décodés.
 * Objets → clés ajoutées / retirées / modifiées uniquement.
 */
function diffAuditStates(
  before: ParsedAuditState,
  after: ParsedAuditState,
): AuditDiff {
  const beforeText = before.malformed ? before.raw : formatAuditValue(before.value);
  const afterText = after.malformed ? after.raw : formatAuditValue(after.value);

  if (before.malformed || after.malformed) {
    return { kind: "unreadable", rows: [], beforeText, afterText };
  }

  if (!before.present && after.present) {
    const rows: AuditChangeRow[] = isPlainObject(after.value)
      ? Object.keys(after.value).map((key) => ({
          key,
          before: ABSENT,
          after: formatAuditValue(after.value[key]),
          kind: "added" as const,
        }))
      : [];
    return { kind: "created", rows, beforeText, afterText };
  }

  if (before.present && !after.present) {
    const rows: AuditChangeRow[] = isPlainObject(before.value)
      ? Object.keys(before.value).map((key) => ({
          key,
          before: formatAuditValue(before.value[key]),
          after: ABSENT,
          kind: "removed" as const,
        }))
      : [];
    return { kind: "deleted", rows, beforeText, afterText };
  }

  if (!before.present && !after.present) {
    return { kind: "unchanged", rows: [], beforeText, afterText };
  }

  if (isPlainObject(before.value) && isPlainObject(after.value)) {
    const keys = new Set([
      ...Object.keys(before.value),
      ...Object.keys(after.value),
    ]);
    const rows: AuditChangeRow[] = [];
    for (const key of keys) {
      const b = before.value[key];
      const a = after.value[key];
      if (JSON.stringify(b) === JSON.stringify(a)) continue;
      const inBefore = key in before.value;
      const inAfter = key in after.value;
      rows.push({
        key,
        before: inBefore ? formatAuditValue(b) : ABSENT,
        after: inAfter ? formatAuditValue(a) : ABSENT,
        kind: !inBefore ? "added" : !inAfter ? "removed" : "changed",
      });
    }
    return { kind: "changed", rows, beforeText, afterText };
  }

  // États scalaires (chaîne, nombre…) : comparaison directe.
  if (JSON.stringify(before.value) === JSON.stringify(after.value)) {
    return { kind: "unchanged", rows: [], beforeText, afterText };
  }
  return {
    kind: "changed",
    rows: [{ key: "", before: beforeText, after: afterText, kind: "changed" }],
    beforeText,
    afterText,
  };
}

const KIND_LABEL: Record<AuditChangeKind, string> = {
  created: "Créé — aucun état précédent",
  deleted: "Supprimé — aucun état après",
  changed: "Modifié",
  unchanged: "Aucun changement enregistré",
  unreadable: "État illisible (texte brut affiché)",
};

const ROW_KIND_LABEL: Record<AuditChangeRow["kind"], string> = {
  added: "ajouté",
  removed: "retiré",
  changed: "modifié",
};

function roleLabel(role: string | null | undefined): string {
  if (!role) return "Non renseigné";
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}

export default function AuditEntryDetail({ entry }: { entry: AuditEntryLike }) {
  const beforeRaw = entry.before_state ?? entry.beforeState ?? null;
  const afterRaw = entry.after_state ?? entry.afterState ?? null;
  const role = entry.actor_role_at_time ?? entry.actorRoleAtTime ?? null;
  const comment = entry.comment ?? null;

  const before = useMemo(() => parseAuditState(beforeRaw), [beforeRaw]);
  const after = useMemo(() => parseAuditState(afterRaw), [afterRaw]);
  const diff = useMemo(() => diffAuditStates(before, after), [before, after]);

  useEffect(() => {
    if (before.malformed) {
      captureClientError(new Error("before_state illisible"), {
        message: "Journal d'audit : before_state n'est pas un JSON valide",
      });
    }
    if (after.malformed) {
      captureClientError(new Error("after_state illisible"), {
        message: "Journal d'audit : after_state n'est pas un JSON valide",
      });
    }
  }, [before.malformed, after.malformed]);

  const showRaw = diff.kind === "unreadable";
  const nothingToShow =
    diff.kind === "unchanged" && diff.rows.length === 0;

  return (
    <div
      data-testid="audit-entry-detail"
      className="px-4 pb-4 pt-1 space-y-3 text-sm"
    >
      <div>
        <p className="text-text-tertiary text-xs uppercase tracking-wide">
          Rôle au moment de l'action
        </p>
        <p className="text-text-primary" data-testid="audit-role">
          {roleLabel(role)}
        </p>
      </div>

      <div>
        <p className="text-text-tertiary text-xs uppercase tracking-wide">
          Commentaire
        </p>
        <p className="text-text-secondary" data-testid="audit-comment">
          {comment && comment.trim() ? comment : "Aucun commentaire"}
        </p>
      </div>

      <div>
        <p className="text-text-tertiary text-xs uppercase tracking-wide">
          Changements
        </p>
        <p className="text-text-secondary" data-testid="audit-change-kind">
          {KIND_LABEL[diff.kind]}
        </p>

        {nothingToShow ? null : showRaw ? (
          <dl className="mt-2 space-y-1" data-testid="audit-raw-states">
            <div className="flex gap-2">
              <dt className="text-text-tertiary text-xs w-24 flex-shrink-0">
                Avant
              </dt>
              <dd className="text-text-primary break-all">
                {diff.beforeText || ABSENT}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-tertiary text-xs w-24 flex-shrink-0">
                Après
              </dt>
              <dd className="text-text-primary break-all">
                {diff.afterText || ABSENT}
              </dd>
            </div>
          </dl>
        ) : diff.rows.length > 0 ? (
          <ul className="mt-2 space-y-1.5" data-testid="audit-diff">
            {diff.rows.map((row, i) => (
              <li
                key={`${row.key}-${i}`}
                className="rounded-lg p-2"
                style={{ backgroundColor: "var(--surface-hover)" }}
              >
                <span className="text-text-primary text-xs font-medium">
                  {row.key || "Valeur"}
                </span>
                <span
                  className="ml-2 text-[10px] uppercase"
                  style={{
                    color:
                      row.kind === "added"
                        ? "var(--data-income)"
                        : row.kind === "removed"
                          ? "var(--data-expense)"
                          : "var(--data-pending)",
                  }}
                >
                  {ROW_KIND_LABEL[row.kind]}
                </span>
                <div className="flex items-center gap-2 mt-0.5 text-xs">
                  <span
                    className="line-through break-all"
                    style={{ color: "var(--data-expense)" }}
                    data-testid="audit-diff-before"
                  >
                    {row.before}
                  </span>
                  <span className="text-text-tertiary">→</span>
                  <span
                    className="break-all"
                    style={{ color: "var(--data-income)" }}
                    data-testid="audit-diff-after"
                  >
                    {row.after}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
