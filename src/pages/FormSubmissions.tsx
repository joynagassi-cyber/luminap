/**
 * FormSubmissions — liste et affiche les soumissions collectées d'un
 * formulaire dynamique (ex. « Baptêmes » + date de baptême).
 *
 * Route : /forms/:id/submissions
 * Accès  : bouton « Voir les soumissions » dans FormBuilder.
 *
 * Avant cette page, les réponses tombaient dans `form_submissions.data`
 * (JSONB) sans aucun écran de visualisation — « data black hole ».
 *
 * Lot F.1c : affichage structuré (labels du FormDefinition), export CSV
 * (buildSubmissionsCSV + Blob) et filtre par statut.
 *
 * Forms v2 (T5) : rendu en tableau HTML de base de données — colonnes =
 * métadonnées (Soumetteur, Date, Statut, Rejeté par, Raison du rejet) +
 * union triée des champs du formulaire et des clés data observées ;
 * tri par colonne, recherche plein-texte débouncée, export CSV + Excel.
 */
import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonInfiniteScroll,
} from "@ionic/react";
import { Inbox, Download, CheckCircle2, Search, X } from "lucide-react";
import {
  formDefinitionRepo,
  formSubmissionRepo,
  buildSubmissionsCSV,
  exportSubmissionsAsXLSX,
} from "@/lib/formSystem";
import type { FormDefinition, FormFieldDefinition, FormSubmission } from "@/types";

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Tous les statuts" },
  { value: "SUBMITTED", label: "Soumises" },
  { value: "PROCESSED", label: "Traitées" },
  { value: "REJECTED", label: "Rejetées" },
];

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

type SortDir = "asc" | "desc";
type SortKey =
  | "submittedBy"
  | "submittedAt"
  | "status"
  | "rejectedBy"
  | "rejectionReason"
  | `field:${string}`;

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Soumise",
  PROCESSED: "Traitée",
  REJECTED: "Rejetée",
};

/** parseSubmissionData — objet JSONB natif ou string JSON (legacy). */
function parseSubmissionData(sub: FormSubmission): Record<string, any> {
  if (sub.data && typeof sub.data === "object") return sub.data;
  try {
    return JSON.parse(typeof sub.data === "string" ? sub.data : "{}");
  } catch {
    return { _raw: String(sub.data) };
  }
}

/** Formatage d'une valeur de champ pour l'affichage dans le tableau. */
function formatFieldValue(
  value: unknown,
  field?: FormFieldDefinition,
): string {
  if (value == null || value === "") return "—";
  if (field?.type === "currency" && value !== "") {
    const n = Number(value);
    if (!isNaN(n)) {
      try {
        return new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: "XOF",
        }).format(n);
      } catch {
        /* fallback au rendu brut ci-dessous */
      }
    }
  }
  if (field?.type === "date") {
    const d = new Date(String(value));
    if (!isNaN(d.getTime())) return d.toLocaleDateString("fr-FR");
  }
  if (field?.type === "number") {
    const n = Number(value);
    if (!isNaN(n)) return String(n);
  }
  if (typeof value === "object") {
    const obj = value as any;
    if (Array.isArray(obj)) {
      return obj
        .map((item) => String(item?.label ?? item?.name ?? item))
        .join(", ");
    }
    return String(obj?.label ?? obj?.name ?? JSON.stringify(obj));
  }
  if (field?.type === "boolean") {
    return String(value) === "true" ? "Oui" : "Non";
  }
  return String(value);
}

/** Sort accessor for a table column. */
function sortValue(sub: FormSubmission, key: SortKey): string {
  switch (key) {
    case "submittedBy":
      return sub.submittedBy ?? "";
    case "submittedAt":
      return new Date(sub.submittedAt ?? sub.createdAt).getTime().toString();
    case "status":
      return sub.status ?? "";
    case "rejectedBy":
      return sub.rejectedBy ?? "";
    case "rejectionReason":
      return sub.rejectionReason ?? "";
    default: {
      const fieldKey = key.slice("field:".length);
      return formatFieldValue(parseSubmissionData(sub)[fieldKey]);
    }
  }
}

export default function FormSubmissions() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [busy, setBusy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(
    { key: "submittedAt", dir: "desc" },
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setListError(false);
    formDefinitionRepo
      .get(id)
      .then((def) => {
        if (!cancelled) setFormDef(def);
      })
      .catch(() => {
        if (!cancelled) setFormDef(null);
      });
    formSubmissionRepo
      .list({ formDefinitionId: id })
      .then((list) => {
        if (cancelled) return;
        setRows(list);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setListError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Débounce de la recherche (~300 ms).
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset du plafonnement à chaque changement de filtre.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [statusFilter, searchQuery]);

  /**
   * Colonnes du tableau : métadonnées + union triée des clés data
   * (définition du formulaire en priorité, puis clés observées, DRY avec
   * l'export XLSX).
   */
  const dataColumns = useMemo(() => {
    const fieldKeys = [...(formDef?.fields ?? [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((f) => f.key);
    const observed = new Set<string>();
    for (const sub of rows) {
      for (const k of Object.keys(parseSubmissionData(sub))) observed.add(k);
    }
    const extra = [...observed].filter((k) => !fieldKeys.includes(k)).sort();
    const all = [...fieldKeys, ...extra];
    const fieldByKey = new Map((formDef?.fields ?? []).map((f) => [f.key, f]));
    return all.map((key) => ({
      key,
      label: fieldByKey.get(key)?.label || key.replace(/_/g, " "),
      field: fieldByKey.get(key),
    }));
  }, [formDef, rows]);

  const allColumns = useMemo(
    () => [
      { key: "submittedBy" as SortKey, label: "Soumetteur" },
      { key: "submittedAt" as SortKey, label: "Date" },
      ...dataColumns.map((c) => ({
        key: `field:${c.key}` as SortKey,
        label: c.label,
      })),
      { key: "status" as SortKey, label: "Statut" },
      { key: "rejectedBy" as SortKey, label: "Rejeté par" },
      { key: "rejectionReason" as SortKey, label: "Raison du rejet" },
    ],
    [dataColumns],
  );

  const sorted = useMemo(() => {
    const arr = [...rows];
    if (sort) {
      arr.sort((a, b) => {
        const av = sortValue(a, sort.key);
        const bv = sortValue(b, sort.key);
        const cmp = av.localeCompare(bv, "fr", { numeric: true });
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return arr;
  }, [rows, sort]);

  const visible = useMemo(
    () =>
      statusFilter === "ALL"
        ? sorted
        : sorted.filter((sub) => sub.status === statusFilter),
    [sorted, statusFilter],
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return visible;
    const q = searchQuery.trim().toLowerCase();
    return visible.filter((sub) => {
      const data = parseSubmissionData(sub);
      const haystack = [
        sub.submittedBy,
        sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString("fr-FR") : "",
        sub.status,
        sub.rejectedBy,
        sub.rejectionReason,
        ...dataColumns.map((c) => formatFieldValue(data[c.key], c.field)),
      ]
        .filter((v) => v != null)
        .join(" | ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [visible, searchQuery, dataColumns]);

  // Pagination : plafonner le nombre de lignes montées (le dataset complet
  // reste disponible pour l'export ; IonInfiniteScroll charge plus).
  const visibleCapped = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  /**
   * Export CSV des soumissions affichées : entêtes = labels du
   * FormDefinition, séparateur ";", BOM utf-8 (pattern
   * ReportBuilder.exportCSV : Blob + URL.createObjectURL + a.click()).
   */
  const exportCSV = () => {
    if (!formDef || filtered.length === 0) return;
    const csv = buildSubmissionsCSV(filtered, formDef);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soumissions_${formDef.key || formDef.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Export Excel (.xlsx) — trigger de téléchargement côté client. */
  const exportXLSX = () => {
    if (!formDef || filtered.length === 0) return;
    exportSubmissionsAsXLSX(
      filtered,
      formDef,
      `soumissions_${formDef.key || formDef.id}`,
    );
  };

  const markAsProcessed = async (sub: FormSubmission) => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await formSubmissionRepo.update(sub.id, {
        status: "PROCESSED",
      });
      if (updated) {
        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
    } finally {
      setBusy(false);
    };
  };

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/forms" />
          </IonButtons>
          <IonTitle>Soumissions</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas" fullscreen>
        <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="p-4 text-center text-text-tertiary text-sm">
              Chargement…
            </div>
          ) : listError ? (
            <div
              className="rounded-xl p-5 text-center"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <Inbox className="w-8 h-8 mx-auto text-text-tertiary mb-2" />
              <p className="text-text-primary text-sm">
                Impossible de charger les soumissions.
              </p>
              <p className="text-text-tertiary text-xs mt-1">
                Vérifiez votre connexion, puis réessayez.
              </p>
              <IonButton
                size="small"
                fill="outline"
                className="mt-3"
                onClick={() => {
                  setListError(false);
                  setLoading(true);
                  formSubmissionRepo
                    .list({ formDefinitionId: id! })
                    .then((list) => {
                      setRows(list);
                    })
                    .catch(() => {
                      setRows([]);
                      setListError(true);
                    })
                    .finally(() => setLoading(false));
                }}
                aria-label="Réessayer le chargement des soumissions"
              >
                Réessayer
              </IonButton>
            </div>
          ) : rows.length === 0 ? (
            <div
              className="rounded-xl p-5 text-center"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <Inbox className="w-8 h-8 mx-auto text-text-tertiary mb-2" />
              <p className="text-text-primary text-sm">
                Aucune soumission pour l'instant.
              </p>
              <p className="text-text-tertiary text-xs mt-1">
                Les réponses envoyées depuis « Remplir » apparaîtront ici.
              </p>
            </div>
          ) : (
            <>
              {/* Barre : filtre statut + recherche + exports */}
              <div className="flex flex-wrap items-center gap-2">
                <IonSelect
                  value={statusFilter}
                  onIonChange={(e: any) =>
                    setStatusFilter(String(e.detail.value ?? "ALL"))
                  }
                  interface="popover"
                  aria-label="Filtrer par statut"
                  style={{
                    width: "9.5rem",
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {STATUS_FILTERS.map((f) => (
                    <IonSelectOption key={f.value} value={f.value}>
                      {f.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
                <div
                  className="relative flex-1 min-w-[10rem]"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Rechercher dans les soumissions…"
                    aria-label="Rechercher dans les soumissions"
                    className="w-full pl-9 pr-8 py-2 text-sm text-text-primary outline-none"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.75rem",
                    }}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      aria-label="Effacer la recherche"
                      onClick={() => setSearchInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <IonButton
                  size="small"
                  fill="outline"
                  disabled={busy || filtered.length === 0}
                  onClick={exportCSV}
                  aria-label="Exporter en CSV"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Exporter CSV
                </IonButton>
                <IonButton
                  size="small"
                  fill="outline"
                  disabled={busy || filtered.length === 0}
                  onClick={exportXLSX}
                  aria-label="Exporter en Excel"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Exporter Excel
                </IonButton>
              </div>

              <p className="text-text-tertiary text-xs">
                {filtered.length} soumission(s)
              </p>

              {filtered.length === 0 ? (
                <div className="text-center text-text-tertiary text-xs py-4">
                  Aucune soumission ne correspond aux filtres.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
                    <table className="w-full text-xs" role="table">
                      <thead>
                        <tr>
                          {allColumns.map((col) => (
                            <th
                              key={col.key}
                              role="columnheader"
                              tabIndex={0}
                              aria-sort={
                                sort?.key === col.key
                                  ? sort.dir === "asc"
                                    ? "ascending"
                                    : "descending"
                                  : "none"
                              }
                              className="text-left px-3 py-2.5 font-medium text-text-primary whitespace-nowrap cursor-pointer select-none"
                              style={{
                                borderBottom: "1px solid var(--border)",
                                backgroundColor: "var(--surface)",
                              }}
                              onClick={() => toggleSort(col.key as SortKey)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleSort(col.key as SortKey);
                                }
                              }}
                            >
                              {col.label}
                              {sort?.key === col.key &&
                                (sort.dir === "asc" ? " ↑" : " ↓")}
                            </th>
                          ))}
                          <th
                            role="columnheader"
                            className="text-right px-3 py-2.5 font-medium text-text-primary whitespace-nowrap"
                            style={{
                              borderBottom: "1px solid var(--border)",
                              backgroundColor: "var(--surface)",
                            }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleCapped.map((sub) => {
                          const data = parseSubmissionData(sub);
                          return (
                            <tr key={sub.id}>
                              <td
                                className="px-3 py-2 text-text-primary whitespace-nowrap"
                                style={{ borderBottom: "1px solid var(--border)" }}
                              >
                                {sub.submittedBy || "Anonyme"}
                              </td>
                              <td
                                className="px-3 py-2 text-text-primary whitespace-nowrap"
                                style={{ borderBottom: "1px solid var(--border)" }}
                              >
                                {(sub.submittedAt ?? sub.createdAt)
                                  ? new Date(
                                      sub.submittedAt ?? sub.createdAt,
                                    ).toLocaleDateString("fr-FR")
                                  : "—"}
                              </td>
                              {dataColumns.map((col) => (
                                <td
                                  key={col.key}
                                  role="cell"
                                  className="px-3 py-2 text-text-primary break-words"
                                  style={{ borderBottom: "1px solid var(--border)" }}
                                >
                                  {formatFieldValue(data[col.key], col.field)}
                                </td>
                              ))}
                              <td
                                className="px-3 py-2 whitespace-nowrap"
                                style={{ borderBottom: "1px solid var(--border)" }}
                              >
                                <span
                                  className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                                  style={{
                                    backgroundColor:
                                      sub.status === "PROCESSED"
                                        ? "color-mix(in srgb, var(--data-success) 15%, transparent)"
                                        : sub.status === "REJECTED"
                                          ? "color-mix(in srgb, var(--data-alert) 15%, transparent)"
                                          : "color-mix(in srgb, var(--data-planified) 15%, transparent)",
                                    color:
                                      sub.status === "PROCESSED"
                                        ? "var(--data-success)"
                                        : sub.status === "REJECTED"
                                          ? "var(--data-alert)"
                                          : "var(--data-planified)",
                                  }}
                                >
                                  {STATUS_LABELS[sub.status] ?? sub.status}
                                </span>
                                {sub.status === "REJECTED" &&
                                  sub.rejectionReason && (
                                    <div className="text-text-tertiary mt-1 text-left text-[11px]">
                                      {sub.rejectionReason}
                                    </div>
                                  )}
                              </td>
                              <td
                                className="px-3 py-2 text-text-tertiary whitespace-nowrap text-left"
                                style={{ borderBottom: "1px solid var(--border)" }}
                              >
                                {sub.rejectedBy ?? "—"}
                              </td>
                              <td
                                className="px-3 py-2 text-text-tertiary break-words text-left"
                                style={{ borderBottom: "1px solid var(--border)" }}
                              >
                                {sub.rejectionReason ?? "—"}
                              </td>
                              <td
                                className="px-3 py-2 text-right whitespace-nowrap"
                                style={{ borderBottom: "1px solid var(--border)" }}
                              >
                                {sub.status !== "PROCESSED" && (
                                  <IonButton
                                    size="small"
                                    fill="solid"
                                    disabled={busy}
                                    onClick={() => markAsProcessed(sub)}
                                    aria-label={`Marquer la soumission ${sub.id} comme traitée`}
                                  >
                                    {busy ? (
                                      "Mise à jour…"
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Traiter
                                      </>
                                    )}
                                  </IonButton>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {visibleCapped.length < filtered.length && (
                    <IonInfiniteScroll
                      position="bottom"
                      threshold="300px"
                      onIonInfinite={() =>
                        setVisibleCount((c) => c + PAGE_SIZE)
                      }
                    >
                      <div className="py-3">
                        <p className="text-text-tertiary text-xs">
                          Chargement…
                        </p>
                      </div>
                    </IonInfiniteScroll>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
