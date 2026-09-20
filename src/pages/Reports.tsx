import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useTransactions,
  useCaisses,
  useCategories,
  useEvents,
  useAppConfig,
  useCurrentUser,
} from "@/lib/dataLayer";
import { formatCentsToFCFA, formatCentsFull, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  Plus,
  X,
  FileText,
  Building2,
  Calendar,
  Layers,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { ReportsSkeleton } from "@/components/PageSkeletons";
import { exportPDF, exportExcel, exportCSV } from "@/lib/export";
import { reportDefinitionRepo } from "@/lib/reporting";
import { security } from "@/capabilities/security";
import { IonPage, IonContent } from "@ionic/react";
import { ChartContainer } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportDefinition } from "@/types";

type Tab = "global" | "groupes" | "evenements";
type Period = "month" | "year" | "all";

const PIE_COLORS = ["#FF6B00", "#3B82F6", "#1DB954", "#8B5CF6", "#EC4899", "#14B8A6", "#F59E0B", "#E51332"];
const COLORS = { grid: "var(--surface-hover)", text: "var(--text-tertiary)", income: "#1DB954", expense: "#E51332", accent: "var(--accent-primary)" };

// La couche de données renvoie snake_case (PowerSync) OU camelCase (IndexedDB) :
// on normalise à la lecture pour rester correct dans les deux modes.
const txCaisse = (t: any) => t.sourceCaisseId ?? t.source_caisse_id;
const txCategory = (t: any) => t.categoryId ?? t.category_id;
const txEvent = (t: any) => t.eventId ?? t.event_id;
const catLabel = (c: any) => c.labelFr ?? c.label_fr ?? c.key ?? "Autre";

function ChartTooltip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 shadow-2xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
      {label != null && <p className="text-text-tertiary text-xs mb-2 font-medium">{label}</p>}
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center justify-between gap-6 min-w-[140px]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.payload?.fill || COLORS.accent }} />
            <span className="text-text-secondary text-xs">{entry.name}</span>
          </div>
          <span className="text-text-primary text-xs font-bold tabular-nums">
            {money ? formatCentsToFCFA(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { churchName, churchLogoUrl } = useAppConfig().config;
  const { data: transactions, isLoading } = useTransactions();
  const { data: caisses } = useCaisses();
  const { data: categories } = useCategories();
  const { data: events } = useEvents();

  const [activeTab, setActiveTab] = useState<Tab>("global");
  const [period, setPeriod] = useState<Period>("month");
  const [showExport, setShowExport] = useState(false);
  const [savedReports, setSavedReports] = useState<ReportDefinition[]>([]);

  const canExport = security.hasPermission(user.role as any, "report:export");
  const canRead = security.hasPermission(user.role as any, "report:read");

  useEffect(() => {
    reportDefinitionRepo
      .list()
      .then(setSavedReports)
      .catch(() => {
        /* hors ligne — liste vide */
      });
  }, []);

  // ── Filtrage par période ───────────────────────────────────────────────────
  const now = new Date();
  const inPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (period === "all") return true;
    if (period === "month")
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return d.getFullYear() === now.getFullYear();
  };

  const approved = useMemo(
    () => ((transactions as any[]) || []).filter((t) => t.status === "APPROVED" && inPeriod(t.date)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, period],
  );

  // ── Global ─────────────────────────────────────────────────────────────────
  const totalIncome = approved.filter((t: any) => t.type === "INCOME").reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpense = approved.filter((t: any) => t.type === "EXPENSE").reduce((s: number, t: any) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const monthlyData = MONTHS_FR.map((m, i) => {
    const txs = ((transactions as any[]) || []).filter((t: any) => {
      if (t.status !== "APPROVED") return false;
      const d = new Date(t.date);
      return d.getMonth() === i && d.getFullYear() === now.getFullYear();
    });
    const income = txs.filter((t: any) => t.type === "INCOME").reduce((s: number, t: any) => s + t.amount, 0);
    const expense = txs.filter((t: any) => t.type === "EXPENSE").reduce((s: number, t: any) => s + t.amount, 0);
    return { name: m, income, expense };
  });

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of approved as any[]) {
      if (t.type !== "EXPENSE") continue;
      const k = txCategory(t) || "unknown";
      map[k] = (map[k] || 0) + t.amount;
    }
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([id, value]) => ({ id, name: catLabel((categories as any[] || []).find((c) => c.id === id) || {}), value }));
  }, [approved, categories]);

  // ── Groupes (par caisse) ─────────────────────────────────────────────────
  const caisseData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const t of approved as any[]) {
      const k = txCaisse(t) || "main";
      map[k] = map[k] || { income: 0, expense: 0 };
      if (t.type === "INCOME") map[k].income += t.amount;
      else map[k].expense += t.amount;
    }
    const list = ((caisses as any[]) || []).map((c) => {
      const m = map[c.id] || { income: 0, expense: 0 };
      return { id: c.id, name: c.name, income: m.income, expense: m.expense, solde: m.income - m.expense };
    });
    // La caisse principale doit toujours figurer, même sans caisse explicitement listée.
    if (!((caisses as any[]) || []).some((c) => c.id === "main")) {
      const m = map["main"] || { income: 0, expense: 0 };
      list.unshift({ id: "main", name: "Caisse principale", income: m.income, expense: m.expense, solde: m.income - m.expense });
    }
    return list;
  }, [approved, caisses]);

  // ── Événements ─────────────────────────────────────────────────────────────
  const eventData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    for (const t of approved as any[]) {
      const k = txEvent(t);
      if (!k) continue;
      map[k] = map[k] || { income: 0, expense: 0 };
      if (t.type === "INCOME") map[k].income += t.amount;
      else map[k].expense += t.amount;
    }
    return ((events as any[]) || []).map((e) => {
      const m = map[e.id] || { income: 0, expense: 0 };
      return {
        id: e.id,
        name: e.name,
        budget: e.budget || 0,
        income: m.income,
        expense: m.expense,
        net: m.income - m.expense,
        active: m.income > 0 || m.expense > 0,
      };
    });
  }, [approved, events]);

  const periodLabel = period === "month" ? "Ce mois" : period === "year" ? "Cette année" : "Tout";

  const doExport = (fmt: "pdf" | "excel" | "csv") => {
    const opts = {
      churchName,
      churchLogoUrl,
      transactions: approved as any,
      caisses: (caisses as any) || [],
      title: `Rapport — ${periodLabel}`,
      period: periodLabel,
      totalIncome,
      totalExpense,
      netResult,
    };
    if (fmt === "pdf") exportPDF(opts);
    else if (fmt === "excel") exportExcel(opts);
    else exportCSV(opts);
    setShowExport(false);
  };

  if (isLoading) {
    return (
      <IonPage>
        <IonContent className="bg-canvas">
          <div className="min-h-screen bg-canvas">
            <TopHeader title="Rapports" />
            <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
              <ReportsSkeleton />
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Rapports" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* Période */}
            <div className="flex gap-2 mb-5">
              {([
                { id: "month" as Period, label: "Ce mois" },
                { id: "year" as Period, label: "Cette année" },
                { id: "all" as Period, label: "Tout" },
              ]).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className="flex-1 py-2 rounded-full text-xs font-medium transition-all"
                  style={
                    period === p.id
                      ? { backgroundColor: "var(--accent-primary)", color: "#fff" }
                      : { backgroundColor: "var(--surface)", color: "var(--text-secondary)" }
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Onglets */}
            <div className="flex rounded-xl p-1 mb-5" style={{ backgroundColor: "var(--surface)" }}>
              {([
                { id: "global" as Tab, label: "Global", icon: Layers },
                { id: "groupes" as Tab, label: "Groupes", icon: Building2 },
                { id: "evenements" as Tab, label: "Événements", icon: Calendar },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5"
                  style={
                    activeTab === tab.id
                      ? { backgroundColor: "var(--accent-primary)", color: "#fff" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── GLOBAL ── */}
            {activeTab === "global" && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--surface)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: "#1DB95420" }}>
                      <TrendingUp className="w-4 h-4" style={{ color: "#1DB954" }} />
                    </div>
                    <p className="text-text-tertiary text-xs">Entrées</p>
                    <p className="text-income font-bold text-sm mt-1">+{formatCentsToFCFA(totalIncome)}</p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--surface)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: "#E5133220" }}>
                      <TrendingDown className="w-4 h-4" style={{ color: "#E51332" }} />
                    </div>
                    <p className="text-text-tertiary text-xs">Sorties</p>
                    <p className="text-expense font-bold text-sm mt-1">-{formatCentsToFCFA(totalExpense)}</p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--surface)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}>
                      <BarChart3 className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                    </div>
                    <p className="text-text-tertiary text-xs">Résultat</p>
                    <p className="font-bold text-sm mt-1" style={{ color: netResult >= 0 ? "#1DB954" : "#E51332" }}>
                      {netResult >= 0 ? "+" : "-"}{formatCentsToFCFA(Math.abs(netResult))}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl p-3" style={{ backgroundColor: "var(--surface)" }}>
                  <p className="text-text-tertiary text-xs mb-2">Évolution (12 mois)</p>
                  <ChartContainer config={{}} className="h-40">
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={COLORS.text} tick={{ fontSize: 10 }} />
                      <YAxis stroke={COLORS.text} tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCentsToFCFA(v)} />
                      <Tooltip content={<ChartTooltip money />} />
                      <Area type="monotone" dataKey="income" name="Entrées" stroke={COLORS.income} fill={COLORS.income} fillOpacity={0.3} stackId="1" />
                      <Area type="monotone" dataKey="expense" name="Sorties" stroke={COLORS.expense} fill={COLORS.expense} fillOpacity={0.3} stackId="1" />
                    </AreaChart>
                  </ChartContainer>
                </div>

                <div className="rounded-xl p-3" style={{ backgroundColor: "var(--surface)" }}>
                  <p className="text-text-tertiary text-xs mb-2">Sorties par catégorie</p>
                  {pieData.length === 0 ? (
                    <p className="text-text-tertiary text-xs py-6 text-center">Aucune sortie sur la période</p>
                  ) : (
                    <ChartContainer config={{}} className="h-56">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip money />} />
                      </PieChart>
                    </ChartContainer>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                    {pieData.map((d, i) => (
                      <div key={d.id} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-text-secondary text-[11px] flex-1 truncate">{d.name}</span>
                        <span className="text-text-tertiary text-[11px] tabular-nums">{formatCentsToFCFA(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── GROUPES ── */}
            {activeTab === "groupes" && (
              <div className="space-y-4">
                <div className="rounded-xl p-3" style={{ backgroundColor: "var(--surface)" }}>
                  <p className="text-text-tertiary text-xs mb-2">Solde par caisse</p>
                  <ChartContainer config={{}} className="h-44">
                    <BarChart data={caisseData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={COLORS.text} tick={{ fontSize: 10 }} interval={0} />
                      <YAxis stroke={COLORS.text} tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCentsToFCFA(v)} />
                      <Tooltip content={<ChartTooltip money />} />
                      <Bar dataKey="solde" name="Solde" fill={COLORS.accent} radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ChartContainer>
                </div>
                <div className="space-y-2">
                  {caisseData.map((c) => (
                    <div key={c.id} className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: "var(--surface)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}>
                        <Building2 className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">{c.name}</p>
                        <p className="text-text-tertiary text-[11px]">
                          {formatCentsToFCFA(c.income)} entrées · {formatCentsToFCFA(c.expense)} sorties
                        </p>
                      </div>
                      <span className="text-sm font-bold tabular-nums" style={{ color: c.solde >= 0 ? "#1DB954" : "#E51332" }}>
                        {c.solde >= 0 ? "+" : "-"}{formatCentsToFCFA(Math.abs(c.solde))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── ÉVÉNEMENTS ── */}
            {activeTab === "evenements" && (
              <div className="space-y-4">
                {eventData.length === 0 ? (
                  <div className="text-center py-10 rounded-xl" style={{ backgroundColor: "var(--surface)" }}>
                    <p className="text-text-tertiary text-sm">Aucun événement</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--surface)" }}>
                      <p className="text-text-tertiary text-xs mb-2">Entrées / sorties par événement</p>
                      <ChartContainer config={{}} className="h-44">
                        <BarChart data={eventData.filter((e) => e.active)} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                          <XAxis dataKey="name" stroke={COLORS.text} tick={{ fontSize: 9 }} interval={0} />
                          <YAxis stroke={COLORS.text} tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatCentsToFCFA(v)} />
                          <Tooltip content={<ChartTooltip money />} />
                          <Bar dataKey="income" name="Entrées" fill={COLORS.income} radius={[4, 4, 0, 0]} barSize={14} />
                          <Bar dataKey="expense" name="Sorties" fill={COLORS.expense} radius={[4, 4, 0, 0]} barSize={14} />
                        </BarChart>
                      </ChartContainer>
                    </div>
                    <div className="space-y-2">
                      {eventData.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => navigate(`/event/${e.id}`)}
                          className="w-full text-left rounded-xl p-3 flex items-center gap-3"
                          style={{ backgroundColor: "var(--surface)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-text-primary text-sm font-medium truncate">{e.name}</p>
                            <p className="text-text-tertiary text-[11px]">
                              Budget {formatCentsToFCFA(e.budget)} · Net {formatCentsToFCFA(Math.abs(e.net))}
                            </p>
                          </div>
                          <span className="text-sm font-bold tabular-nums" style={{ color: e.net >= 0 ? "#1DB954" : "#E51332" }}>
                            {e.net >= 0 ? "+" : "-"}{formatCentsToFCFA(Math.abs(e.net))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Mes rapports */}
            {canRead && (
              <section className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                    <p className="text-text-primary font-semibold text-sm">Mes rapports</p>
                    <span className="text-text-tertiary text-[11px]">({savedReports.length})</span>
                  </div>
                  <button
                    onClick={() => navigate("/report-builder")}
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Nouveau
                  </button>
                </div>
                {savedReports.length === 0 ? (
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--surface)" }}>
                    <p className="text-text-tertiary text-xs">
                      Aucun rapport personnalisé. Créez-en un avec le constructeur.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedReports.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => navigate(`/report-builder?open=${r.id}`)}
                        className="w-full text-left rounded-xl p-3 flex items-center gap-3"
                        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}>
                          <FileText className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text-primary text-sm font-medium truncate">{r.name}</p>
                          <p className="text-text-tertiary text-[11px]">
                            {(r.groupBy?.length || 0) > 0 ? `Grouper : ${(r.groupBy || []).join(", ")}` : "Sans groupement"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Export */}
            {canExport && (
              <button
                onClick={() => setShowExport(true)}
                className="w-full mt-5 py-3.5 rounded-full font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #FF8533, var(--accent-primary))" }}
              >
                <Download className="w-4 h-4" /> Exporter le rapport
              </button>
            )}
          </div>
          <BottomNav />

          {/* Modale d'export */}
          {showExport && (
            <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowExport(false)}>
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative w-full max-w-lg rounded-t-2xl p-5 pb-8" style={{ backgroundColor: "var(--card)" }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-text-primary font-bold text-lg">Exporter le rapport</h2>
                  <button onClick={() => setShowExport(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--surface-hover)" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {([
                    { fmt: "pdf" as const, label: "PDF", desc: "Document professionnel", color: "#E51332" },
                    { fmt: "excel" as const, label: "Excel", desc: "Feuilles multiples", color: "#1DB954" },
                    { fmt: "csv" as const, label: "CSV", desc: "Compatible tableurs", color: "#3B82F6" },
                  ]).map((o) => (
                    <button
                      key={o.fmt}
                      onClick={() => doExport(o.fmt)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform"
                      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${o.color}20` }}>
                        <FileText className="text-lg" style={{ color: o.color }} />
                      </div>
                      <div className="text-left">
                        <p className="text-text-primary text-sm font-semibold">{o.label}</p>
                        <p className="text-text-tertiary text-xs">{o.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
