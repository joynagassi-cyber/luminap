import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useTransactions,
  useAccounts,
  useOrgUnits,
  useEvents,
  useCategories,
  useAuditEntries,
} from "@/lib/dataLayer";
import {
  ArrowLeft,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  Building2,
  Activity,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { formatCentsToFCFA, formatDate } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
  Line,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

type TabKey =
  | "overview"
  | "monthly"
  | "caisse"
  | "group"
  | "event"
  | "category";

const TABS: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
  { key: "overview", label: "Vue d'ensemble", icon: BarChart3 },
  { key: "monthly", label: "Mensuel", icon: Calendar },
  { key: "caisse", label: "Par caisse", icon: Building2 },
  { key: "group", label: "Par groupe", icon: Users },
  { key: "event", label: "Par événement", icon: Activity },
  { key: "category", label: "Par catégorie", icon: PieChart },
];

const MONTHS_FR = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];
const COLORS = {
  income: "#1DB954",
  expense: "#E51332",
  pending: "#FFB800",
  accent: "var(--accent-primary)",
  purple: "#8B5CF6",
  blue: "#3B82F6",
  teal: "#14B8A6",
  pink: "#EC4899",
  grid: "#282828",
  text: "#808080",
};

function formatTooltipValue(value: number) {
  return formatCentsToFCFA(value);
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 shadow-2xl"
      style={{ backgroundColor: "#1E1E1E", border: "1px solid #282828" }}
    >
      <p className="text-text-tertiary text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-6 min-w-[140px]"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-secondary text-xs">{entry.name}</span>
          </div>
          <span className="text-text-primary text-xs font-bold tabular-nums">
            {formatTooltipValue(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const {
    data: transactions,
    isLoading: txLoading,
  } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: orgUnits } = useOrgUnits();
  const { data: events } = useEvents();
  const { data: categories } = useCategories();
  const { data: auditEntries } = useAuditEntries();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [period, setPeriod] = useState<"all" | "month" | "year">("all");

  if (txLoading) {
    return (
      <div className="min-h-screen bg-[#121212]">
        <TopHeader title="Historique" />
        <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-xl p-4 animate-pulse"
                style={{ backgroundColor: "#181818" }}
              >
                <div className="h-4 bg-[#282828] rounded w-1/3 mb-3" />
                <div className="h-20 bg-[#282828] rounded" />
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Filter by period
  const now = new Date();
  const filteredTransactions = transactions.filter((t: any) => {
    const txDate = new Date(t.date);
    if (period === "month") {
      return (
        txDate.getMonth() === now.getMonth() &&
        txDate.getFullYear() === now.getFullYear()
      );
    }
    if (period === "year") {
      return txDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const totalIncome = filteredTransactions
    .filter((t: any) => t.type === "INCOME" && t.status === "APPROVED")
    .reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpense = filteredTransactions
    .filter((t: any) => t.type === "EXPENSE" && t.status === "APPROVED")
    .reduce((s: number, t: any) => s + t.amount, 0);
  const pendingAmount = filteredTransactions
    .filter((t: any) => t.status === "PENDING")
    .reduce((s: number, t: any) => s + t.amount, 0);

  // Monthly data
  const monthlyData = MONTHS_FR.map((month, idx) => {
    const monthTxs = filteredTransactions.filter((t: any) => {
      const d = new Date(t.date);
      return d.getMonth() === idx;
    });
    const income = monthTxs
      .filter((t: any) => t.type === "INCOME" && t.status === "APPROVED")
      .reduce((s: number, t: any) => s + t.amount, 0);
    const expense = monthTxs
      .filter((t: any) => t.type === "EXPENSE" && t.status === "APPROVED")
      .reduce((s: number, t: any) => s + t.amount, 0);
    return { name: month, income, expense, result: income - expense };
  });

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Historique</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Historique" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            {/* Period selector */}
            <div className="flex gap-2 mb-5">
              {[
                { key: "all", label: "Tout" },
                { key: "month", label: "Ce mois" },
                { key: "year", label: "Cette année" },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key as any)}
                  className="flex-1 py-2 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: period === p.key ? "var(--accent-primary)" : "#212121",
                    color: period === p.key ? "#fff" : "#B3B3B3",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: "#212121" }}
              >
                <p className="text-text-tertiary text-xs mb-1">Entrées</p>
                <p className="text-[#1DB954] font-bold text-base">
                  +{formatCentsToFCFA(totalIncome)}
                </p>
              </div>
              <div
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: "#212121" }}
              >
                <p className="text-text-tertiary text-xs mb-1">Sorties</p>
                <p className="text-[#E51332] font-bold text-base">
                  -{formatCentsToFCFA(totalExpense)}
                </p>
              </div>
              <div
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: "#212121" }}
              >
                <p className="text-text-tertiary text-xs mb-1">Résultat</p>
                <p
                  className="font-bold text-base"
                  style={{
                    color:
                      totalIncome - totalExpense >= 0 ? "#1DB954" : "#E51332",
                  }}
                >
                  {totalIncome - totalExpense >= 0 ? "+" : "-"}
                  {formatCentsToFCFA(Math.abs(totalIncome - totalExpense))}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                  style={{
                    backgroundColor:
                      activeTab === tab.key ? "var(--accent-primary)" : "#212121",
                    color: activeTab === tab.key ? "#fff" : "#B3B3B3",
                  }}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Chart area */}
            <div
              className="rounded-xl p-4 mb-5"
              style={{ backgroundColor: "#212121" }}
            >
              <ChartContainer config={{}} className="h-48">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis
                    dataKey="name"
                    stroke={COLORS.text}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis stroke={COLORS.text} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stackId="1"
                    stroke={COLORS.income}
                    fill={COLORS.income}
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stackId="1"
                    stroke={COLORS.expense}
                    fill={COLORS.expense}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            {/* Recent activity */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-primary font-semibold text-sm">
                Activité récente
              </p>
              <button
                onClick={() => navigate("/trace")}
                className="text-xs"
                style={{ color: "var(--accent-primary)" }}
              >
                Voir tout →
              </button>
            </div>
            <div className="space-y-2 mb-6">
              {filteredTransactions.slice(0, 5).map((tx: any) => (
                <button
                  key={tx.id}
                  onClick={() => navigate(`/transaction/${tx.id}`)}
                  className="w-full text-left rounded-xl p-4 flex items-center gap-3"
                  style={{
                    backgroundColor: "#212121",
                    border: "1px solid #282828",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor:
                        tx.type === "INCOME" ? "#1DB95420" : "#E5133220",
                    }}
                  >
                    {tx.type === "INCOME" ? (
                      <ArrowUpRight
                        className="w-5 h-5"
                        style={{ color: "#1DB954" }}
                      />
                    ) : (
                      <ArrowDownRight
                        className="w-5 h-5"
                        style={{ color: "#E51332" }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">
                      {tx.description}
                    </p>
                    <p className="text-text-tertiary text-xs">
                      {formatDate(tx.date)}
                    </p>
                  </div>
                  <span
                    className="font-bold text-sm"
                    style={{
                      color: tx.type === "INCOME" ? "#1DB954" : "#E51332",
                    }}
                  >
                    {tx.type === "INCOME" ? "+" : "-"}
                    {formatCentsToFCFA(tx.amount)}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
