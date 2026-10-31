import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { tint, CHART_COLORS } from "@/lib/utils";
import {
  TUTORIAL_SECTIONS,
  type SectionData,
} from "@/lib/tutorialContent";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  Lightbulb,
  AlertTriangle,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import {
  PieChart,
  Pie,
  Cell,
  LineChart as ReLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Type ────────────────────────────────────────────────────────────────────────

// ─── Recharts color palette ─────────────────────────────────────────────────────
// M17 : pointeurs sur les tokens --data-* (CHART_COLORS, DESIGN.md §2) ;
// #14B8A6 (teal-500, hors palette) remappé sur .advance (violet 8B5CF6, famille planifié).
const CATEGORY_COLORS = [
  CHART_COLORS.income,
  CHART_COLORS.expense,
  CHART_COLORS.pending,
  CHART_COLORS.planified,
  CHART_COLORS.advance,
  CHART_COLORS.advance,
  CHART_COLORS.pink,
  "var(--accent-primary)",
  "var(--text-tertiary)",
];

const DONUT_DATA = [
  { name: "Dîme", value: 4500000 },
  { name: "Offrande", value: 2800000 },
  { name: "Offrande mission", value: 900000 },
  { name: "Don", value: 650000 },
  { name: "Salaire pasteur", value: 3200000 },
  { name: "Frais fonctionnement", value: 1800000 },
  { name: "Mission", value: 750000 },
  { name: "Entretien", value: 420000 },
  { name: "Aumône", value: 310000 },
];

const HISTORY_LINE_DATA = [
  { name: "Jan", revenus: 4200000, dépenses: 2800000 },
  { name: "Fév", revenus: 3800000, dépenses: 3100000 },
  { name: "Mar", revenus: 5100000, dépenses: 2900000 },
  { name: "Avr", revenus: 4600000, dépenses: 3300000 },
  { name: "Mai", revenus: 5800000, dépenses: 3000000 },
  { name: "Jun", revenus: 4900000, dépenses: 3500000 },
  { name: "Jul", revenus: 6200000, dépenses: 3200000 },
  { name: "Août", revenus: 5500000, dépenses: 3800000 },
  { name: "Sep", revenus: 4800000, dépenses: 2900000 },
  { name: "Oct", revenus: 5300000, dépenses: 3100000 },
  { name: "Nov", revenus: 6100000, dépenses: 3400000 },
  { name: "Déc", revenus: 7200000, dépenses: 4100000 },
];

const BALANCE_AREA_DATA = HISTORY_LINE_DATA.map((d) => ({
  name: d.name,
  solde: d.revenus - d.dépenses,
}));

const GROUP_BAR_DATA = [
  { name: "Diacres", solde: 2850000, color: CHART_COLORS.planified },
  { name: "Jeunesse", solde: 1920000, color: CHART_COLORS.advance },
  { name: "Dames", solde: 3100000, color: CHART_COLORS.pink },
  { name: "Messieurs", solde: 1750000, color: CHART_COLORS.advance }, // teal 14B8A6 hors palette → .advance
  { name: "Chorale", solde: 2200000, color: "var(--accent-primary)" },
];

// ─── Sections data ──────────────────────────────────────────────────────────────
const SECTIONS: SectionData[] = TUTORIAL_SECTIONS;

// ─── SVG Diagrams ────────────────────────────────────────────────────────────────
function TransactionFlowDiagram() {
  return (
    <svg
      viewBox="0 0 400 160"
      className="w-full max-w-md mx-auto"
      role="img"
      aria-label="Diagramme de flux des transactions"
    >
      <title>Cycle de vie d'une transaction</title>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-tertiary)" />
        </marker>
        <style>{`
          @keyframes dash { to { stroke-dashoffset: -16; } }
          .flow-line { stroke-dasharray: 6 4; animation: dash 1s linear infinite; }
        `}</style>
      </defs>
      {/* Brouillon */}
      <rect
        x="8"
        y="55"
        width="80"
        height="50"
        rx="8"
        fill="color-mix(in srgb, var(--data-pending) 12%, transparent)"
        stroke={CHART_COLORS.pending}
        strokeWidth="1.5"
      />
      <text
        x="48"
        y="78"
        textAnchor="middle"
        fill={CHART_COLORS.pending}
        fontSize="11"
        fontWeight="600"
      >
        Brouillon
      </text>
      {/* En attente */}
      <rect
        x="140"
        y="55"
        width="80"
        height="50"
        rx="8"
        fill="color-mix(in srgb, var(--data-planified) 12%, transparent)"
        stroke={CHART_COLORS.planified}
        strokeWidth="1.5"
      />
      <text
        x="180"
        y="78"
        textAnchor="middle"
        fill={CHART_COLORS.planified}
        fontSize="11"
        fontWeight="600"
      >
        En attente
      </text>
      {/* Approuvé */}
      <rect
        x="272"
        y="8"
        width="80"
        height="50"
        rx="8"
        fill="color-mix(in srgb, var(--data-income) 12%, transparent)"
        stroke={CHART_COLORS.income}
        strokeWidth="1.5"
      />
      <text
        x="312"
        y="31"
        textAnchor="middle"
        fill={CHART_COLORS.income}
        fontSize="11"
        fontWeight="600"
      >
        Approuvé
      </text>
      {/* Rejeté */}
      <rect
        x="272"
        y="102"
        width="80"
        height="50"
        rx="8"
        fill="color-mix(in srgb, var(--data-expense) 12%, transparent)"
        stroke={CHART_COLORS.expense}
        strokeWidth="1.5"
      />
      <text
        x="312"
        y="125"
        textAnchor="middle"
        fill={CHART_COLORS.expense}
        fontSize="11"
        fontWeight="600"
      >
        Rejeté
      </text>
      {/* Flèches */}
      <line
        x1="88"
        y1="80"
        x2="138"
        y2="80"
        stroke="var(--text-tertiary)"
        strokeWidth="1.5"
        markerEnd="url(#arrowhead)"
        className="flow-line"
      />
      <text x="113" y="72" textAnchor="middle" fill="var(--text-tertiary)" fontSize="9">
        Soumettre
      </text>
      <line
        x1="220"
        y1="80"
        x2="268"
        y2="33"
        stroke="var(--text-tertiary)"
        strokeWidth="1.5"
        markerEnd="url(#arrowhead)"
        className="flow-line"
      />
      <text
        x="250"
        y="58"
        textAnchor="middle"
        fill={CHART_COLORS.income}
        fontSize="9"
        fontWeight="600"
      >
        Approuver
      </text>
      <line
        x1="220"
        y1="80"
        x2="268"
        y2="127"
        stroke="var(--text-tertiary)"
        strokeWidth="1.5"
        markerEnd="url(#arrowhead)"
        className="flow-line"
      />
      <text
        x="250"
        y="95"
        textAnchor="middle"
        fill={CHART_COLORS.expense}
        fontSize="9"
        fontWeight="600"
      >
        Rejeter
      </text>
      {/* Badges */}
      <rect
        x="228"
        y="48"
        width="44"
        height="16"
        rx="4"
        fill={CHART_COLORS.income}
        opacity="0.8"
      />
      <text
        x="250"
        y="59"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="8"
        fontWeight="600"
      >
        Trésorier
      </text>
      <rect
        x="228"
        y="88"
        width="44"
        height="16"
        rx="4"
        fill={CHART_COLORS.expense}
        opacity="0.8"
      />
      <text
        x="250"
        y="99"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="8"
        fontWeight="600"
      >
        Pasteur
      </text>
      {/* Immutabilité */}
      <text
        x="356"
        y="28"
        textAnchor="middle"
        fill={CHART_COLORS.income}
        fontSize="8"
        fontWeight="500"
      >
        Immuable
      </text>
      {/* Modifier → Brouillon */}
      <path
        d="M 312 152 L 312 158 L 48 158 L 48 107"
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth="1.5"
        markerEnd="url(#arrowhead)"
        className="flow-line"
      />
      <text x="180" y="156" textAnchor="middle" fill="var(--text-tertiary)" fontSize="9">
        Modifier
      </text>
    </svg>
  );
}

function VersementFlowDiagram() {
  return (
    <svg
      viewBox="0 0 400 140"
      className="w-full max-w-md mx-auto"
      role="img"
      aria-label="Flux de versement"
    >
      <title>Flux de versement</title>
      {/* Caisse Groupe */}
      <rect
        x="20"
        y="30"
        width="120"
        height="80"
        rx="10"
        fill="color-mix(in srgb, var(--data-pending) 12%, transparent)"
        stroke={CHART_COLORS.pending}
        strokeWidth="1.5"
      />
      <rect
        x="50"
        y="38"
        width="24"
        height="24"
        rx="4"
        fill={CHART_COLORS.pending}
        opacity="0.2"
      />
      <path
        d="M62 44 L62 56 M56 48 L68 48"
        stroke={CHART_COLORS.pending}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="80"
        y="65"
        textAnchor="middle"
        fill={CHART_COLORS.pending}
        fontSize="11"
        fontWeight="600"
      >
        Caisse Groupe
      </text>
      <text x="80" y="82" textAnchor="middle" fill="var(--text-tertiary)" fontSize="9">
        sourceCaisseId
      </text>
      <text x="80" y="96" textAnchor="middle" fill={CHART_COLORS.expense} fontSize="9">
        Sortie (-montant)
      </text>
      {/* Caisse Principale */}
      <rect
        x="260"
        y="30"
        width="120"
        height="80"
        rx="10"
        fill="color-mix(in srgb, var(--data-income) 12%, transparent)"
        stroke={CHART_COLORS.income}
        strokeWidth="1.5"
      />
      <rect
        x="290"
        y="38"
        width="24"
        height="24"
        rx="4"
        fill={CHART_COLORS.income}
        opacity="0.2"
      />
      <path
        d="M296 50 L302 44 L308 50 M302 44 L302 56"
        stroke={CHART_COLORS.income}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x="320"
        y="65"
        textAnchor="middle"
        fill={CHART_COLORS.income}
        fontSize="11"
        fontWeight="600"
      >
        Caisse Principale
      </text>
      <text x="320" y="82" textAnchor="middle" fill="var(--text-tertiary)" fontSize="9">
        id: main
      </text>
      <text x="320" y="96" textAnchor="middle" fill={CHART_COLORS.income} fontSize="9">
        Entrée (+montant)
      </text>
      {/* Flèche épaisse */}
      <line
        x1="140"
        y1="70"
        x2="256"
        y2="70"
        stroke={CHART_COLORS.pending}
        strokeWidth="3"
        markerEnd="url(#arrowhead)"
        className="flow-line"
      />
      <rect x="180" y="52" width="80" height="18" rx="4" fill={CHART_COLORS.pending} />
      <text
        x="220"
        y="64"
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize="9"
        fontWeight="600"
      >
        versementId
      </text>
      {/* Badge */}
      <rect
        x="140"
        y="100"
        width="120"
        height="20"
        rx="4"
        fill="color-mix(in srgb, var(--data-planified) 12%, transparent)"
        stroke={CHART_COLORS.planified}
        strokeWidth="1"
      />
      <text
        x="200"
        y="113"
        textAnchor="middle"
        fill={CHART_COLORS.planified}
        fontSize="9"
        fontWeight="600"
      >
        Crée 2 transactions
      </text>
    </svg>
  );
}

function GroupTreeDiagram() {
  return (
    <svg
      viewBox="0 0 400 200"
      className="w-full max-w-md mx-auto"
      role="img"
      aria-label="Arborescence organisationnelle"
    >
      <title>Arborescence organisationnelle</title>
      {/* Niveau 1 — Église */}
      <rect
        x="130"
        y="8"
        width="140"
        height="48"
        rx="10"
        stroke="var(--accent-primary)"
        strokeWidth="1.5"
        style={{ fill: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
      />
      <text
        x="200"
        y="28"
        textAnchor="middle"
        fill="var(--accent-primary)"
        fontSize="12"
        fontWeight="700"
      >
        Église MFE-JC
      </text>
      <text x="200" y="44" textAnchor="middle" fill="var(--text-tertiary)" fontSize="9">
        Caisse principale (main)
      </text>
      {/* Ligne verticale */}
      <line
        x1="200"
        y1="56"
        x2="200"
        y2="90"
        stroke="var(--text-tertiary)"
        strokeWidth="1.5"
      />
      {/* Ligne horizontale */}
      <line
        x1="50"
        y1="90"
        x2="350"
        y2="90"
        stroke="var(--text-tertiary)"
        strokeWidth="1.5"
      />
      {/* Niveau 2 — Groupes */}
      {["Diacres", "Jeunesse", "Dames"].map((name, i) => {
        const x = 50 + i * 150;
        const colors = [CHART_COLORS.planified, CHART_COLORS.advance, CHART_COLORS.pink];
        return (
          <g key={name}>
            <line
              x1={x + 50}
              y1="90"
              x2={x + 50}
              y2="110"
              stroke="var(--text-tertiary)"
              strokeWidth="1.5"
            />
            <rect
              x={x}
              y="110"
              width="100"
              height="44"
              rx="8"
              fill={colors[i] + "20"}
              stroke={colors[i]}
              strokeWidth="1.5"
            />
            <text
              x={x + 50}
              y="130"
              textAnchor="middle"
              fill={colors[i]}
              fontSize="11"
              fontWeight="600"
            >
              {name}
            </text>
            <text
              x={x + 50}
              y="146"
              textAnchor="middle"
              fill="var(--text-tertiary)"
              fontSize="9"
            >
              Caisse groupe
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Chart helpers ───────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl p-3 shadow-pop"
      style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-text-tertiary text-xs mb-2 font-medium">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div
          key={entry.dataKey ?? entry.name ?? idx}
          className="flex items-center justify-between gap-6 min-w-[120px]"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-secondary text-xs">{entry.name}</span>
          </div>
          <span className="text-text-primary text-xs font-bold tabular-nums">
            {entry.value.toLocaleString()} F
          </span>
        </div>
      ))}
    </div>
  );
}

function TransactionDonutChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart aria-label="Répartition des transactions par catégorie">
        <Pie
          data={DONUT_DATA}
          cx="50%"
          cy="50%"
          innerRadius={45}
          outerRadius={75}
          paddingAngle={3}
          dataKey="value"
        >
          {DONUT_DATA.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function HistoryLineChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ReLineChart
        data={HISTORY_LINE_DATA}
        aria-label="Revenus vs dépenses sur 12 mois"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-hover)" />
        <XAxis dataKey="name" stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} />
        <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} hide />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="revenus"
          stroke={CHART_COLORS.income}
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Revenus"
        />
        <Line
          type="monotone"
          dataKey="dépenses"
          stroke={CHART_COLORS.expense}
          strokeWidth={2}
          dot={{ r: 3 }}
          name="Dépenses"
        />
      </ReLineChart>
    </ResponsiveContainer>
  );
}

function BalanceAreaChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={BALANCE_AREA_DATA} aria-label="Solde cumulé sur 12 mois">
        <defs>
          <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
            {/* Solde : cyan 06B6D4 hors palette → .planified */}
            <stop offset="5%" stopColor={CHART_COLORS.planified} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS.planified} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-hover)" />
        <XAxis dataKey="name" stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} />
        <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} hide />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="solde"
          stroke={CHART_COLORS.planified}
          strokeWidth={2}
          fill="url(#balanceGrad)"
          name="Solde"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function GroupBarChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={GROUP_BAR_DATA}
        layout="vertical"
        aria-label="Solde par groupe"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--surface-hover)"
          orientation="right"
        />
        <XAxis type="number" stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} hide />
        <YAxis
          type="category"
          dataKey="name"
          stroke="var(--text-tertiary)"
          tick={{ fontSize: 10 }}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="solde"
          radius={4}
          label={{
            position: "right",
            fontSize: 10,
            fill: "var(--text-secondary)",
            formatter: (v: number) => `${(v / 100).toLocaleString()} F`,
          }}
        >
          {GROUP_BAR_DATA.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const ChartMap: Record<string, React.ReactNode> = {
  "transaction-donut": <TransactionDonutChart />,
  "history-line": <HistoryLineChart />,
  "balance-area": <BalanceAreaChart />,
  "group-bar": <GroupBarChart />,
};

const DiagramMap: Record<string, React.ReactNode> = {
  "transaction-flow": <TransactionFlowDiagram />,
  "versement-flow": <VersementFlowDiagram />,
  "group-tree": <GroupTreeDiagram />,
};

// ─── Main Component ──────────────────────────────────────────────────────────────
export default function Tutorial() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const tabListRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<{ startX: number; startY: number } | null>(null);

  const current = SECTIONS.find((s) => s.id === activeSection) || SECTIONS[0];

  // Scroll active tab into view
  useEffect(() => {
    const tab = tabRefs.current.get(activeSection);
    if (tab) {
      tab.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      tab.focus({ preventScroll: true });
    }
  }, [activeSection]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const idx = SECTIONS.findIndex((s) => s.id === activeSection);
        if (e.key === "ArrowRight" && idx < SECTIONS.length - 1) {
          setActiveSection(SECTIONS[idx + 1].id);
        } else if (e.key === "ArrowLeft" && idx > 0) {
          setActiveSection(SECTIONS[idx - 1].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSection]);

  // Swipe detection
  const handleTouchStart = useCallback((e: TouchEvent) => {
    swipeRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!swipeRef.current) return;
      const dx = e.changedTouches[0].clientX - swipeRef.current.startX;
      const dy = e.changedTouches[0].clientY - swipeRef.current.startY;
      // Only trigger swipe if horizontal movement > 50px and less than vertical
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        const idx = SECTIONS.findIndex((s) => s.id === activeSection);
        if (dx < 0 && idx < SECTIONS.length - 1) {
          setActiveSection(SECTIONS[idx + 1].id);
        } else if (dx > 0 && idx > 0) {
          setActiveSection(SECTIONS[idx - 1].id);
        }
      }
      swipeRef.current = null;
    },
    [activeSection],
  );

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  const setTabRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) tabRefs.current.set(id, el);
    else tabRefs.current.delete(id);
  }, []);

  const prevSection = () => {
    const idx = SECTIONS.findIndex((s) => s.id === activeSection);
    if (idx > 0) setActiveSection(SECTIONS[idx - 1].id);
  };

  const nextSection = () => {
    const idx = SECTIONS.findIndex((s) => s.id === activeSection);
    if (idx < SECTIONS.length - 1) setActiveSection(SECTIONS[idx + 1].id);
  };

  return (
    <IonPage>
      <IonContent className="bg-canvas">
      <h1 className="sr-only">Tutoriel</h1>
        <div data-screen-state="ready" className="min-h-dvh">
          <TopHeader title="Tutoriel" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            {/* Back button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-text-secondary text-sm mb-5 transition-all duration-200 hover:text-text-primary"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </button>

            {/* Tab navigation — horizontal scrollable */}
            <div
              ref={tabListRef}
              className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide -mx-5 px-5"
              role="tablist"
              aria-label="Sections du tutoriel"
            >
              {SECTIONS.map((s) => {
                const SIcon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    ref={(el) => setTabRef(s.id, el)}
                    onClick={() => setActiveSection(s.id)}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${s.id}`}
                    tabIndex={isActive ? 0 : -1}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 focus-visible:ring-2 focus-visible:ring-dashed"
                    style={
                      isActive
                        ? {
                            backgroundColor: tint(s.color, 12),
                            color: s.color,
                            outline: "none",
                          }
                        : {
                            backgroundColor: "var(--card)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border)",
                          }
                    }
                  >
                    <SIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {s.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Current section panel */}
            <div
              id={`panel-${current.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${current.id}`}
              className="mb-6 animate-in fade-in"
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105"
                  style={{ backgroundColor: current.iconBg }}
                >
                  <current.icon
                    className="w-5 h-5"
                    style={{ color: current.color }}
                  />
                </div>
                <h2
                  tabIndex={-1}
                  className="text-text-primary font-bold text-xl overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px]"
                >
                  {current.title}
                </h2>
              </div>

              {/* Paragraphs */}
              <div className="space-y-3 mb-5">
                {current.paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className="text-text-secondary text-sm leading-relaxed"
                  >
                    {p}
                  </p>
                ))}
              </div>

              {/* SVG Diagram */}
              {current.diagram && (
                <div
                  className="mb-5 rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                      Diagramme
                    </p>
                  </div>
                  <div className="px-4 pb-4">{DiagramMap[current.diagram]}</div>
                </div>
              )}

              {/* Recharts Chart */}
              {current.chart && (
                <div
                  className="mb-5 rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                      Visualisation
                    </p>
                  </div>
                  <div className="px-4 pb-4">
                    {ChartMap[current.chart] || (
                      <p className="text-text-tertiary text-sm text-center py-6">
                        Aucune donnée disponible
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tips */}
              {current.tips && current.tips.length > 0 && (
                <div
                  className="rounded-xl p-4 mb-5 transition-all duration-200"
                  style={{ backgroundColor: current.iconBg }}
                >
                  <p
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: current.color }}
                  >
                    <Lightbulb className="w-4 h-4 flex-shrink-0" /> Conseils
                  </p>
                  <div className="space-y-2">
                    {current.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: CHART_COLORS.income }} />
                        <p className="text-text-secondary text-sm">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {current.warnings && current.warnings.length > 0 && (
                <div
                  className="rounded-xl p-4 mb-5 transition-all duration-200"
                  style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)" }}
                >
                  <p
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: CHART_COLORS.expense }}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />{" "}
                    Précautions
                  </p>
                  <div className="space-y-2">
                    {current.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: CHART_COLORS.expense }} />
                        <p className="text-text-secondary text-sm">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {current.errors && current.errors.length > 0 && (
                <div className="space-y-3 mb-5">
                  {current.errors.map((err, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 transition-all duration-200"
                      style={{ backgroundColor: "var(--card)" }}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: CHART_COLORS.expense }} />
                        <p className="text-text-primary text-sm font-medium">
                          {err.title}
                        </p>
                      </div>
                      <p className="text-text-tertiary text-sm ml-6">
                        {err.solution}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* FAQ */}
              {current.faqs && current.faqs.length > 0 && (
                <div className="space-y-3 mb-5">
                  {current.faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4 transition-all duration-200"
                      style={{ backgroundColor: "var(--card)" }}
                    >
                      <div className="flex items-start gap-2 mb-1.5">
                        <HelpCircle
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
                          style={{ color: current.color }}
                        />
                        <p className="text-text-primary text-sm font-medium">
                          {faq.q}
                        </p>
                      </div>
                      <p className="text-text-tertiary text-sm ml-6">{faq.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <button
                onClick={prevSection}
                disabled={activeSection === SECTIONS[0].id}
                className="px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-dashed"
                style={{
                  backgroundColor: "var(--card)",
                  color:
                    activeSection === SECTIONS[0].id ? "var(--text-placeholder)" : "var(--text-secondary)",
                  border:
                    activeSection === SECTIONS[0].id
                      ? "none"
                      : "1px solid var(--surface-hover)",
                  cursor:
                    activeSection === SECTIONS[0].id ? "default" : "pointer",
                }}
                aria-label="Section précédente"
              >
                ← Précédent
              </button>
              <button
                onClick={nextSection}
                disabled={activeSection === SECTIONS[SECTIONS.length - 1].id}
                className="px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-dashed"
                style={{
                  backgroundColor:
                    activeSection === SECTIONS[SECTIONS.length - 1].id
                      ? "var(--card)"
                      : tint(current.color, 12),
                  color:
                    activeSection === SECTIONS[SECTIONS.length - 1].id
                      ? "var(--text-placeholder)"
                      : current.color,
                  border:
                    activeSection === SECTIONS[SECTIONS.length - 1].id
                      ? "1px solid var(--surface-hover)"
                      : "none",
                  cursor:
                    activeSection === SECTIONS[SECTIONS.length - 1].id
                      ? "default"
                      : "pointer",
                }}
                aria-label="Section suivante"
              >
                {activeSection === SECTIONS[SECTIONS.length - 1].id
                  ? "Terminé"
                  : "Suivant"}
              </button>
            </div>

            <p className="text-text-tertiary text-xs text-center mt-6">
              Lumina v2.0 · Guide d'utilisation complet
            </p>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
