import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  BarChart3,
  Download,
  X,
  Save,
  Play,
  FileText,
  SlidersHorizontal,
  ListChecks,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { IonPage, IonContent } from "@ionic/react";
import { ChartContainer } from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  reportEngine,
  reportDefinitionRepo,
  type FilterExpr,
  type MetricExpr,
} from "@/lib/reporting";
import { useCaisses, useCategories, useCurrentUser } from "@/lib/dataLayer";
import { security } from "@/capabilities/security";
import { formatCentsToFCFA, formatCentsFull, generateId } from "@/lib/utils";
import { getOrganizationId } from "@/lib/orgContext";
import type { ReportDefinition, ReportResult } from "@/types";

type PeriodKey = "all" | "month" | "year";

const METRIC_FNS: { value: MetricExpr["fn"]; label: string }[] = [
  { value: "sum", label: "Somme" },
  { value: "count", label: "Comptage" },
  { value: "avg", label: "Moyenne" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];

const GROUP_DIMS: { key: string; label: string }[] = [
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
  { key: "sourceCaisseId", label: "Caisse" },
  { key: "categoryId", label: "Catégorie" },
  { key: "type", label: "Type" },
];

const COLORS = {
  accent: "var(--accent-primary)",
  grid: "#282828",
  text: "#808080",
};

function monthFr(ym: string): string {
  const d = new Date(ym + "-01T00:00:00");
  if (isNaN(d.getTime())) return ym || "—";
  return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

/** Décode la clé d'agrégation (string concaténée) en libellés lisibles. */
function decodeKey(
  key: string,
  groupBy: string[],
  caisses: any[],
  categories: any[],
): string {
  if (!groupBy.length) return "Tous";
  const parts = key ? key.split("|") : [];
  const labels = groupBy.map((g, i) => {
    const raw = parts[i];
    switch (g) {
      case "month":
        return raw ? monthFr(raw) : "—";
      case "year":
        return raw || "—";
      case "type":
        return raw === "INCOME" ? "Entrée" : raw === "EXPENSE" ? "Sortie" : "—";
      case "sourceCaisseId":
        if (!raw || raw === "unknown") return "Sans caisse";
        return caisses.find((c) => c.id === raw)?.name || raw;
      case "categoryId": {
        const cat = categories.find((c) => c.id === raw);
        return cat?.labelFr || (cat as any)?.label_fr || raw || "—";
      }
      default:
        return raw || "—";
    }
  });
  return labels.join(" · ");
}

function ReportTooltip({ active, payload, label, format }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 shadow-2xl"
      style={{ backgroundColor: "#1E1E1E", border: "1px solid #282828" }}
    >
      <p className="text-text-tertiary text-xs mb-1 font-medium">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-6 min-w-[140px]">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-secondary text-xs">{entry.name}</span>
          </div>
          <span className="text-text-primary text-xs font-bold tabular-nums">
            {format ? format(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

interface Draft {
  name: string;
  dataSource: string;
  groupBy: string[];
  metrics: MetricExpr[];
  metric: MetricExpr;
  filterState: {
    period: PeriodKey;
    type: string;
    categoryId: string;
    sourceCaisseId: string;
  };
}

function emptyDraft(): Draft {
  return {
    name: "",
    dataSource: "transactions",
    groupBy: [],
    metrics: [],
    metric: { field: "amount", fn: "sum" },
    filterState: { period: "month", type: "", categoryId: "", sourceCaisseId: "" },
  };
}

export default function ReportBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useCurrentUser();
  const { data: caisses } = useCaisses();
  const { data: categories } = useCategories();

  const canExport = security.hasPermission(user.role as any, "report:export");
  const canRead = security.hasPermission(user.role as any, "report:read");

  const [draft, setDraft] = useState(emptyDraft());
  const [previewResult, setPreviewResult] = useState<ReportResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedReports, setSavedReports] = useState<ReportDefinition[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // Charge la liste des rapports sauvegardés.
  useEffect(() => {
    reportDefinitionRepo
      .list()
      .then(setSavedReports)
      .catch(() => {
        /* store indisponible (hors ligne) — reste vide */
      });
  }, []);

  // Ouvre un rapport depuis ?open=<id>.
  const openId = useMemo(
    () => new URLSearchParams(location.search).get("open"),
    [location.search],
  );

  useEffect(() => {
    if (!openId) return;
    reportDefinitionRepo
      .list()
      .then((defs) => {
        const def = defs.find((d) => d.id === openId);
        if (def) loadDefinition(def);
      })
      .catch(() => {
        /* ignore */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  function loadDefinition(def: ReportDefinition) {
    const groupBy = def.groupBy || def.dimensions || [];
    const metricList = (def.metrics || []) as MetricExpr[];
    const filters = (def.filters || []) as FilterExpr[];
    const f = (field: string): FilterExpr | undefined =>
      filters.find((x) => x.field === field);
    const dateF = f("date");
    const period: PeriodKey = dateF
      ? "year"
      : dateF?.value?.start === ""
        ? "all"
        : dateF?.value?.start?.endsWith("-01")
          ? "month"
          : "year";

    setDraft({
      name: def.name,
      dataSource: def.dataSource,
      groupBy,
      metrics: metricList,
      metric: { field: "amount", fn: "sum" },
      filterState: {
        period,
        type: f("type")?.value || "",
        categoryId: f("categoryId")?.value || "",
        sourceCaisseId: f("sourceCaisseId")?.value || "",
      },
    });
    setLoadedId(def.id);
    setPreviewResult(null);
    setError("");
  }

  // ── GroupBy ────────────────────────────────────────────────────────────────
  const toggleGroup = (g: string) => {
    setDraft((d) => ({
      ...d,
      groupBy: d.groupBy?.includes(g)
        ? d.groupBy!.filter((x) => x !== g)
        : [...(d.groupBy || []), g],
    }));
  };

  // ── Métriques ─────────────────────────────────────────────────────────────
  const updateMetricDraft = (patch: Partial<MetricExpr>) =>
    setDraft((d) => ({ ...d, metric: { ...d.metric, ...patch } }));

  const addMetric = () => {
    setDraft((d) => {
      const alias = d.metric.alias?.trim() || d.metric.field;
      const list = [...(d.metrics || []), { ...d.metric, alias }];
      return { ...d, metrics: list };
    });
  };

  const removeMetric = (i: number) =>
    setDraft((d) => ({ ...d, metrics: (d.metrics || []).filter((_, idx) => idx !== i) }));

  // ── Filtres ────────────────────────────────────────────────────────────────
  const setFilter = (k: string, v: string) =>
    setDraft((d) => ({ ...d, filterState: { ...d.filterState, [k]: v } }));

  const buildFilters = (): FilterExpr[] => {
    const out: FilterExpr[] = [];
    const f = draft.filterState;
    if (f.period !== "all") {
      const now = new Date();
      const start =
        f.period === "month"
          ? new Date(now.getFullYear(), now.getMonth(), 1)
          : new Date(now.getFullYear(), 0, 1);
      out.push({
        field: "date",
        op: "gte",
        value: { start: start.toISOString(), end: now.toISOString() },
      });
    }
    if (f.type) out.push({ field: "type", op: "eq", value: f.type });
    if (f.categoryId) out.push({ field: "categoryId", op: "eq", value: f.categoryId });
    if (f.sourceCaisseId)
      out.push({ field: "sourceCaisseId", op: "eq", value: f.sourceCaisseId });
    return out;
  };

  // ── Exécution ─────────────────────────────────────────────────────────────
  const run = async () => {
    setError("");
    const groupBy = draft.groupBy || [];
    const metrics = (draft.metrics || []) as MetricExpr[];
    if (!canRead) {
      setError("Votre rôle n'est pas autorisé à lire les rapports.");
      return;
    }
    if (!draft.name?.trim() || metrics.length === 0) {
      setError("Renseignez un nom et au moins une métrique.");
      return;
    }
    const def: ReportDefinition = {
      id: generateId(),
      orgId: getOrganizationId(),
      name: draft.name!.trim(),
      dataSource: draft.dataSource || "transactions",
      dimensions: groupBy,
      groupBy,
      metrics,
      filters: buildFilters(),
      sortBy: null,
      savedBy: "local-user",
      isTemplate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRunning(true);
    try {
      const result = await reportEngine.execute(def);
      setPreviewResult(result);
      setLoadedId(null); // l'exécution manuelle casse l'édition d'un rapport chargé
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'exécution du rapport");
      setPreviewResult(null);
    } finally {
      setRunning(false);
    }
  };

  const save = async () => {
    if (!canExport) {
      setError("Votre rôle n'est pas autorisé à enregistrer des rapports.");
      return;
    }
    const groupBy = draft.groupBy || [];
    const metrics = (draft.metrics || []) as MetricExpr[];
    if (!draft.name?.trim() || metrics.length === 0) {
      setError("Renseignez un nom et au moins une métrique avant d'enregistrer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const entry = await reportDefinitionRepo.create({
        orgId: getOrganizationId(),
        name: draft.name!.trim(),
        dataSource: draft.dataSource || "transactions",
        dimensions: groupBy,
        metrics,
        filters: buildFilters(),
        groupBy,
        sortBy: null,
        savedBy: "local-user",
        isTemplate: false,
      });
      setSavedReports((prev) => [entry, ...prev]);
      setLoadedId(entry.id);
      setDraft((d) => ({ ...d, metrics }));
    } catch (e: any) {
      setError(e?.message || "Impossible d'enregistrer le rapport");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    try {
      await reportDefinitionRepo.delete(id);
      setSavedReports((prev) => prev.filter((r) => r.id !== id));
      if (loadedId === id) setLoadedId(null);
    } catch {
      setError("Impossible de supprimer ce rapport");
    }
  };

  const runSaved = async (def: ReportDefinition) => {
    loadDefinition(def);
  };

  // ── Export CSV du résultat ────────────────────────────────────────────────
  const exportCSV = () => {
    if (!previewResult || !canExport) return;
    const cols = previewResult.columns;
    const header = [cols[0], ...cols.slice(1)].join(";");
    const body = previewResult.rows.map((r) =>
      cols.map((c) => (c === cols[0] ? decodeKey(r[c], draft.groupBy || [], caisses || [], categories || []) : String(r[c] ?? ""))).join(";"),
    );
    const csv = "\uFEFF" + [header, ...body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport_${(draft.name || "rapport").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Données du graphique (1ʳᵉ métrique, par clé décodée).
  const firstMetric = (draft.metrics || [])[0];
  const chartData = useMemo(() => {
    if (!previewResult) return [];
    const label =
      previewResult.columns.find((c) => c !== "key") || "key";
    return previewResult.rows.map((row) => ({
      label: decodeKey(
        row.key,
        draft.groupBy || [],
        caisses || [],
        categories || [],
      ),
      value: row[label] ?? 0,
    }));
  }, [previewResult, draft.groupBy, caisses, categories]);
  const chartName = firstMetric?.alias || firstMetric?.field || "Valeur";

  const f = draft.filterState;

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Constructeur de rapport" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
        <button
          onClick={() => navigate("/reports")}
          className="flex items-center gap-2 text-text-secondary text-sm mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux rapports
        </button>

        <div className="flex items-center gap-2 mb-5">
          <h1 className="text-text-primary font-bold text-xl">
            Constructeur de rapport
          </h1>
          {loadedId && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "#282828", color: "#B3B3B3" }}
            >
              Chargé
            </span>
          )}
        </div>

        {/* Filtres */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
            <p className="text-text-primary font-semibold text-sm">Filtres</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-text-tertiary text-[11px] mb-1 block">Période</label>
              <select
                value={f.period}
                onChange={(e) => setFilter("period", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs"
                style={{ backgroundColor: "#181818", color: "#fff", border: "1px solid #282828" }}
              >
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
                <option value="all">Tout</option>
              </select>
            </div>
            <div>
              <label className="text-text-tertiary text-[11px] mb-1 block">Type</label>
              <select
                value={f.type}
                onChange={(e) => setFilter("type", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs"
                style={{ backgroundColor: "#181818", color: "#fff", border: "1px solid #282828" }}
              >
                <option value="">Tous</option>
                <option value="INCOME">Entrées</option>
                <option value="EXPENSE">Sorties</option>
              </select>
            </div>
            <div>
              <label className="text-text-tertiary text-[11px] mb-1 block">Catégorie</label>
              <select
                value={f.categoryId}
                onChange={(e) => setFilter("categoryId", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs"
                style={{ backgroundColor: "#181818", color: "#fff", border: "1px solid #282828" }}
              >
                <option value="">Toutes</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.labelFr}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-text-tertiary text-[11px] mb-1 block">Caisse</label>
              <select
                value={f.sourceCaisseId}
                onChange={(e) => setFilter("sourceCaisseId", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs"
                style={{ backgroundColor: "#181818", color: "#fff", border: "1px solid #282828" }}
              >
                <option value="">Toutes</option>
                {(caisses || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Nom */}
        <div className="mb-5">
          <label className="text-text-tertiary text-xs mb-1.5 block">Nom du rapport</label>
          <input
            type="text"
            value={draft.name || ""}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Ex : Revenus par groupe"
            className="w-full px-4 py-3 rounded-xl text-text-primary text-sm"
            style={{ backgroundColor: "#212121", border: "1px solid #282828" }}
          />
        </div>

        {/* GroupBy */}
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
            <p className="text-text-primary font-semibold text-sm">Groupement</p>
            <span className="text-text-tertiary text-[11px]">(optionnel)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {GROUP_DIMS.map((dim) => {
              const on = draft.groupBy?.includes(dim.key);
              return (
                <button
                  key={dim.key}
                  onClick={() => toggleGroup(dim.key)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={
                    on
                      ? { backgroundColor: "var(--accent-primary)", color: "#fff" }
                      : {
                          backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                          color: "var(--accent-primary)",
                        }
                  }
                >
                  {dim.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Métriques */}
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
            <p className="text-text-primary font-semibold text-sm">Métriques</p>
          </div>

          {(draft.metrics || []).map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2.5 rounded-lg mb-2"
              style={{ backgroundColor: "#212121" }}
            >
              <span className="text-text-primary text-xs flex-1 truncate">
                {METRIC_FNS.find((x) => x.value === m.fn)?.label || m.fn} · {m.alias || m.field}
              </span>
              <button onClick={() => removeMetric(i)} style={{ color: "#E51332" }} aria-label="Retirer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Éditeur de nouvelle métrique */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <select
              value={draft.metric?.field}
              onChange={(e) => updateMetricDraft({ field: e.target.value })}
              className="px-2 py-2 rounded-lg text-xs"
              style={{ backgroundColor: "#181818", color: "#fff", border: "1px solid #282828" }}
            >
              <option value="amount">Montant</option>
            </select>
            <select
              value={draft.metric?.fn}
              onChange={(e) => updateMetricDraft({ fn: e.target.value as MetricExpr["fn"] })}
              className="px-2 py-2 rounded-lg text-xs"
              style={{ backgroundColor: "#181818", color: "#fff", border: "1px solid #282828" }}
            >
              {METRIC_FNS.map((fn) => (
                <option key={fn.value} value={fn.value}>{fn.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={draft.metric?.alias || ""}
              onChange={(e) => updateMetricDraft({ alias: e.target.value })}
              placeholder="Alias"
              className="px-2 py-2 rounded-lg text-xs"
              style={{ backgroundColor: "#181818", color: "#fff", border: "1px solid #282828" }}
            />
          </div>
          <button
            onClick={addMetric}
            className="w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
            style={{ backgroundColor: "#282828", color: "var(--accent-primary)" }}
          >
            <Plus className="w-3 h-3" /> Ajouter la métrique
          </button>
        </section>

        {error && <p className="text-xs mb-3" style={{ color: "#E51332" }}>{error}</p>}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            onClick={run}
            disabled={running}
            className="py-3 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #FF8533, var(--accent-primary))" }}
          >
            <Play className="w-4 h-4" /> {running ? "Exécution…" : "Exécuter"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: "#212121", color: "var(--accent-primary)", border: "1px solid #282828" }}
          >
            <Save className="w-4 h-4" /> {saving ? "…" : "Enregistrer"}
          </button>
        </div>

        {/* Aperçu */}
        {previewResult && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-primary font-semibold text-sm">Aperçu</p>
              <span className="text-text-tertiary text-xs">
                {previewResult.total} ligne{previewResult.total !== 1 ? "s" : ""}
              </span>
            </div>

            {chartData.length > 0 && firstMetric && (
              <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: "#212121" }}>
                <ChartContainer config={{}} className="h-44">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                    <XAxis dataKey="label" stroke={COLORS.text} tick={{ fontSize: 10 }} />
                    <YAxis
                      stroke={COLORS.text}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => formatCentsToFCFA(v)}
                    />
                    <Tooltip content={<ReportTooltip format={(v: number) => formatCentsFull(v)} />} />
                    <Bar dataKey="value" name={chartName} fill={COLORS.accent} radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ChartContainer>
              </div>
            )}

            {previewResult.rows.length === 0 ? (
              <div className="text-center py-8 rounded-xl" style={{ backgroundColor: "#212121" }}>
                <p className="text-text-tertiary text-sm">Aucune donnée pour ces filtres</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl" style={{ backgroundColor: "#212121" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {previewResult.columns.map((col, i) => (
                        <th
                          key={col}
                          className="text-left py-2 px-3 text-text-tertiary font-medium"
                        >
                          {i === 0 ? "Groupe" : col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.rows.map((row, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: "#282828" }}>
                        {previewResult.columns.map((col, j) => (
                          <td key={col} className="py-2 px-3 text-text-primary tabular-nums">
                            {j === 0
                              ? decodeKey(row[col], draft.groupBy || [], caisses || [], categories || [])
                              : formatCentsFull(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              onClick={exportCSV}
              disabled={!canExport}
              className="w-full mt-3 py-2.5 rounded-full text-xs font-medium flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ backgroundColor: "#212121", color: canExport ? "var(--accent-primary)" : "#808080", border: "1px solid #282828" }}
            >
              <Download className="w-3.5 h-3.5" /> Exporter les résultats (CSV)
            </button>
          </section>
        )}

        {/* Rapports sauvegardés */}
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
            <p className="text-text-primary font-semibold text-sm">Mes rapports</p>
            <span className="text-text-tertiary text-[11px]">({savedReports.length})</span>
          </div>
          {savedReports.length === 0 ? (
            <p className="text-text-tertiary text-xs">
              Aucun rapport sauvegardé. Configurez un rapport puis « Enregistrer ».
            </p>
          ) : (
            <div className="space-y-2">
              {savedReports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{ backgroundColor: "#212121", border: "1px solid #282828" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{r.name}</p>
                    <p className="text-text-tertiary text-[11px]">
                      {(r.groupBy?.length || 0) > 0
                        ? `Grouper : ${(r.groupBy || []).join(", ")}`
                        : "Sans groupement"}
                      {r.metrics?.length ? ` · ${r.metrics.length} métrique(s)` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => runSaved(r)}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-full"
                    style={{ backgroundColor: "var(--accent-primary)", color: "#fff" }}
                  >
                    Ouvrir
                  </button>
                  {canExport && (
                    <button
                      onClick={() => del(r.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#282828", color: "#E51332" }}
                      aria-label="Supprimer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
