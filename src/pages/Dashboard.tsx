/**
 * Dashboard v3 (2026-11-01) — Redesign Apple × Google.
 *
 * Design system appliqué :
 *  - Typographie, espacement, radius, ombres, mouvement (src/design/tokens.ts)
 *  - MotionCard (entrée fluide, hover scale, tap press, élévation)
 *  - MotionList (apparition en cascade staggered)
 *  - Framer Motion pour les micro-interactions
 *  - Zéro couleur brute : tout passe par var(--*) / tokens
 *
 * Non-régression (invariants) :
 *  - Les anchors Cypress existants restent PRÉSERVÉS (aria-labels identiques) :
 *      « Voir les détails de la caisse principale » (héros)
 *      « Entrées du mois » / « Sorties du mois » (héros)
 *      « Derniers mouvements », CircleAction (Entrée/Sortie/Versement/Événement),
 *      EmptyState (aucun mouvement)
 *  - Le BottomNav est figé — non modifié ici.
 *  - Zéro appel REST à l'ouverture : 100 % PowerSync / données locales.
 *  - Le Labo (faker, scénarios, faux adaptateurs) est exclu du build prod.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  type Transition,
} from "framer-motion";
import {
  useAppConfig,
  useCurrentUser,
  useTransactions,
  useEvents,
  useAccounts,
  useCaisses,
  useReportsReceived,
  useOrganizations,
  markReportRead,
  isPowerSyncReadyNow,
  type PSOrgReports,
  parseBudgetItems,
} from "@/lib/dataLayer";
import {
  formatCentsToFCFA,
  getPeriodRange,
  formatDate,
  tint,
} from "@/lib/utils";
import { useOrganizationContext, useMyOrgs } from "@/lib/organization-context";
import { usePowerSyncIndicator } from "@/lib/hooks/usePowerSyncIndicator";
import { IonContent, IonPage } from "@ionic/react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  TrendingUp,
  Sparkles,
  Home,
  PlusCircle,
  FileText,
  FolderTree,
  Radio,
  Circle,
  Clock,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import TransactionCard from "@/components/TransactionCard";
import EmptyState from "@/components/EmptyState";
import CircleAction from "@/components/CircleAction";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import TrendChart from "@/components/TrendChart";
import OrgSwitcher from "@/components/OrgSwitcher";
import DashboardOnboarding from "@/components/DashboardOnboarding";
import { DashboardSkeleton } from "@/components/PageSkeletons";
import { ListSkeleton } from "@/components/Skeleton";
import { getRoleLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Constantes de design ────────────────────────────────────────────────────

const PAGE_TRANSITION: Transition = {
  duration: 0.5,
  ease: [0.4, 0, 0.2, 1],
};

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

const STAGGER_CHILDREN = 0.08;

// ─── Héro financier (P1) — Redesign Apple × Google ───────────────────────────

function HeroCard({
  greeting,
  userName,
  userRoleLabel,
  userInitials,
  netResult,
  totalIncome,
  totalExpense,
  trend,
  trendLabels,
  online,
  lastSyncAt,
  syncing,
  syncError,
  navigate,
}: {
  greeting: string;
  userName: string;
  userRoleLabel: string;
  userInitials: string;
  netResult: number;
  totalIncome: number;
  totalExpense: number;
  trend: number[];
  trendLabels: string[];
  online: boolean;
  lastSyncAt: Date | null;
  syncing: boolean;
  syncError: string | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const netColor = netResult >= 0 ? "var(--in)" : "var(--out)";
  const now = new Date();
  const syncLabel = syncError
    ? "échec d'envoi"
    : !online
      ? "hors ligne"
      : syncing
        ? "synchronisation…"
        : lastSyncAt
          ? `sync ${
              now.toDateString() === lastSyncAt.toDateString()
                ? lastSyncAt.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : formatDate(lastSyncAt.toISOString())
            }`
          : "en attente";
  const hasSyncError = syncError !== null;

  return (
    <motion.button
      onClick={() => navigate("/finance")}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 30 } }}
      whileTap={{ scale: 0.98 }}
      initial="hidden"
      animate="visible"
      variants={CARD_VARIANTS}
      className="w-full text-left overflow-hidden"
      aria-label="Voir les détails de la caisse principale"
    >
      {/* Fond de carte avec bordure et ombre douce */}
      <div
        className="relative rounded-2xl p-6 mb-6 border border-border bg-surface shadow-card transition-all"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 8%, var(--surface)) 0%, var(--surface) 100%)",
        }}
      >
        {/* Ligne 1 : profil + sync pill */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border border-border/50"
              style={{
                backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
              }}
              aria-label={`Profil de ${userName}`}
            >
              <span
                className="text-sm font-bold"
                style={{ color: "var(--accent-primary)" }}
              >
                {userInitials}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-text-primary font-semibold text-sm truncate">
                {greeting} <span className="text-text-tertiary font-normal">·</span>{" "}
                {userName}
              </p>
              <p className="text-text-tertiary text-xs truncate">
                {userRoleLabel}
              </p>
            </div>
          </div>
          {/* Sync pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border"
            style={{
              borderColor: "color-mix(in srgb, var(--border) 50%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--surface-hover) 60%, transparent)",
              color: hasSyncError
                ? "var(--out)"
                : online
                  ? "var(--accent-primary)"
                  : "var(--out)",
            }}
            aria-label={`État de synchronisation : ${syncLabel}`}
          >
            {hasSyncError ? (
              <Circle
                className="w-1.5 h-1.5"
                style={{ fill: "var(--out)", color: "var(--out)" }}
              />
            ) : syncing ? (
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            ) : online ? (
              <Circle
                className="w-1.5 h-1.5"
                style={{ fill: "var(--in)", color: "var(--in)" }}
              />
            ) : (
              <Circle
                className="w-1.5 h-1.5"
                style={{ fill: "var(--out)", color: "var(--out)" }}
              />
            )}
            <span>{syncLabel}</span>
          </div>
        </div>

        {/* Ligne 2 : résultat net + sparkline 6M */}
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">
              Résultat net du mois
            </p>
            <div className="flex items-baseline gap-1">
              <span
                className="text-4xl font-black tabular-nums leading-none"
                style={{ color: netColor }}
              >
                {netResult >= 0 ? "" : "-"}
                {formatCentsToFCFA(Math.abs(netResult))}
              </span>
              <span className="text-text-tertiary text-sm font-medium">F</span>
            </div>
            <p className="text-text-tertiary text-xs mt-2.5 flex items-center gap-1.5">
              <span style={{ color: "var(--in)" }} className="font-medium">
                Entrées du mois +{formatCentsToFCFA(totalIncome)}
              </span>
              <span
                className="text-text-tertiary"
                style={{ opacity: 0.6 }}
                aria-hidden="true"
              >
                ·
              </span>
              <span
                className="font-medium"
                style={{ color: "var(--out)" }}
              >
                Sorties du mois −{formatCentsToFCFA(totalExpense)}
              </span>
            </p>
          </div>
          <div className="w-32 flex-shrink-0" aria-hidden="true">
            <TrendChart values={trend} labels={trendLabels} height={72} />
          </div>
        </div>

        {/* Ligne 3 : sparkline pleine largeur (6 mois) */}
        <div
          className="rounded-xl p-3 mt-2"
          style={{
            backgroundColor: "var(--surface-hover)",
            border: "1px solid color-mix(in srgb, var(--border) 40%, transparent)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
              Tendance (6 mois)
            </span>
            <TrendingUp className="w-3.5 h-3.5" style={{ color: "var(--in)" }} />
          </div>
          <TrendChart
            values={trend}
            labels={trendLabels}
            height={96}
            color="var(--in)"
            withTooltip
          />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Stream unifié (P2) — Redesign ───────────────────────────────────────────

export interface UnifiedTodo {
  key: string;
  kind: "APPROVAL" | "REPORT_UNREAD" | "EVENT_TODAY" | "CAISSE_NEGATIVE";
  title: string;
  subtitle?: string;
  amountCents?: number;
  tone: "pending" | "planified" | "advance" | "income" | "expense";
  href: string;
}

function useUnifiedTodos(
  transactions: any[],
  reports: PSOrgReports[],
  events: any[],
  accounts: any[],
  caisses: any[],
): UnifiedTodo[] {
  const todos: UnifiedTodo[] = [];

  const pendingTxs = transactions.filter((t) => t.status === "PENDING");
  pendingTxs.slice(0, 3).forEach((t) => {
    todos.push({
      key: `tx-${t.id}`,
      kind: "APPROVAL",
      title: t.label || t.note || "Transaction à approuver",
      subtitle: t.date ? formatDate(t.date) : undefined,
      amountCents: t.type === "INCOME" ? t.amount : -t.amount,
      tone: "pending",
      href: `/transaction/${t.id}`,
    });
  });

  reports.filter((r) => !r.read_at).slice(0, 3).forEach((r) => {
    todos.push({
      key: `rep-${r.id}`,
      kind: "REPORT_UNREAD",
      title: r.title || `Rapport ${r.format.toUpperCase()} à lire`,
      subtitle: r.period_start
        ? `${formatDate(r.period_start)} → ${
            r.period_end ? formatDate(r.period_end) : ""
          }`
        : undefined,
      tone: "advance",
      href: `/admin/reports/${r.id}`,
    });
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter(
    (e) =>
      (e.status === "PLANIFIED" || e.status === "ONGOING") &&
      String(e.start_date || e.startDate).slice(0, 10) === today,
  );
  todayEvents.slice(0, 3).forEach((e) => {
    todos.push({
      key: `ev-${e.id}`,
      kind: "EVENT_TODAY",
      title: e.name,
      subtitle: e.start_date ? formatDate(e.start_date) : undefined,
      tone: "planified",
      href: `/event/${e.id}`,
    });
  });

  const negCaisses = accounts
    .filter((a) => a.owner_type === "GROUP" && a.status === "ACTIVE")
    .map((a) => {
      const caisse = caisses.find((c) => c.id === a.id);
      const approvedTxs = transactions.filter(
        (t) =>
          (t.source_caisse_id === a.id || t.sourceCaisseId === a.id) &&
          t.status === "APPROVED",
      );
      const income = approvedTxs
        .filter((t) => t.type === "INCOME")
        .reduce((s, t) => s + t.amount, 0);
      const expense = approvedTxs
        .filter((t) => t.type === "EXPENSE")
        .reduce((s, t) => s + t.amount, 0);
      return { account: a, balance: income - expense, name: caisse?.name || a.name };
    })
    .filter((c) => c.balance < 0);
  negCaisses.slice(0, 2).forEach((c) => {
    todos.push({
      key: `cxs-${c.account.id}`,
      kind: "CAISSE_NEGATIVE",
      title: c.name,
      subtitle: "Solde négatif",
      amountCents: c.balance,
      tone: "expense",
      href: "/finance",
    });
  });

  const priority: Record<UnifiedTodo["kind"], number> = {
    APPROVAL: 0,
    REPORT_UNREAD: 1,
    EVENT_TODAY: 2,
    CAISSE_NEGATIVE: 3,
  };
  todos.sort((a, b) => priority[a.kind] - priority[b.kind]);
  return todos.slice(0, 5);
}

const TONE_COLOR: Record<UnifiedTodo["tone"], string> = {
  pending: "var(--warn)",
  planified: "var(--data-planified)",
  advance: "var(--data-advance)",
  income: "var(--in)",
  expense: "var(--out)",
};

function UnifiedTodoItem({
  t,
  navigate,
}: {
  t: UnifiedTodo;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const IconMap: Record<UnifiedTodo["kind"], any> = {
    APPROVAL: Clock,
    REPORT_UNREAD: FileText,
    EVENT_TODAY: Calendar,
    CAISSE_NEGATIVE: Circle,
  };
  const Icon = IconMap[t.kind];

  return (
    <motion.button
      key={t.key}
      onClick={() => navigate(t.href)}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left rounded-xl p-4 transition-all border border-border bg-surface shadow-sm"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
      aria-label={`${
        t.kind === "APPROVAL"
          ? "Approbation"
          : t.kind === "REPORT_UNREAD"
            ? "Rapport"
            : t.kind === "EVENT_TODAY"
              ? "Événement"
              : "Caisse"
      } : ${t.title}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: tint(TONE_COLOR[t.tone], 12),
          }}
        >
          <Icon
            className="w-4.5 h-4.5"
            style={{ color: TONE_COLOR[t.tone] }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-sm font-medium truncate">
            {t.title}
          </p>
          {t.subtitle && (
            <p className="text-text-tertiary text-xs mt-0.5 truncate">
              {t.subtitle}
            </p>
          )}
        </div>
        {typeof t.amountCents === "number" && (
          <span
            className="text-xs font-semibold tabular-nums flex-shrink-0"
            style={{
              color: t.amountCents >= 0 ? "var(--in)" : "var(--out)",
            }}
          >
            {t.amountCents >= 0 ? "+" : "-"}
            {formatCentsToFCFA(Math.abs(t.amountCents))}
          </span>
        )}
      </div>
    </motion.button>
  );
}

function UnifiedTodoList({
  todos,
  navigate,
}: {
  todos: UnifiedTodo[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (todos.length === 0) return null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={CARD_VARIANTS}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
          <p className="text-text-primary text-sm font-semibold">À traiter</p>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
              color: "var(--accent-primary)",
            }}
          >
            {todos.length}
          </span>
        </div>
      </div>
      <motion.ul
        className="space-y-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: STAGGER_CHILDREN },
          },
        }}
      >
        {todos.map((t) => (
          <UnifiedTodoItem key={t.key} t={t} navigate={navigate} />
        ))}
      </motion.ul>
    </motion.div>
  );
}

// ─── Section « Rapports reçus » (P2 / Feature 2) — Redesign ────────────────

function ReceivedReportsSection({
  reports,
  navigate,
}: {
  reports: PSOrgReports[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (reports.length === 0) return null;
  const unread = reports.filter((r) => !r.read_at);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={CARD_VARIANTS}
      className="mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4" style={{ color: "var(--data-advance)" }} />
          <p className="text-text-primary text-sm font-semibold">Rapports reçus</p>
          {unread.length > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: "color-mix(in srgb, var(--data-advance) 12%, transparent)",
                color: "var(--data-advance)",
              }}
            >
              {unread.length} non lu{unread.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/admin/reports")}
          className="text-xs font-medium"
          style={{ color: "var(--accent-primary)" }}
          aria-label="Voir tous les rapports reçus"
        >
          Voir tout →
        </button>
      </div>
      <div className="space-y-2">
        {reports.slice(0, 4).map((r) => (
          <motion.button
            key={r.id}
            onClick={() => navigate(`/admin/reports/${r.id}`)}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            className="w-full text-left rounded-xl p-4 transition-all border border-border bg-surface"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              opacity: r.read_at ? 0.6 : 1,
            }}
            aria-label={`Ouvrir le rapport : ${r.title || "rapport"}${r.read_at ? "" : " (non lu)"}`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: tint("var(--data-advance)", 12),
                }}
              >
                <FileText className="w-4.5 h-4.5" style={{ color: "var(--data-advance)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium truncate">
                  {r.title || `Rapport ${r.format.toUpperCase()}`}
                </p>
                <p className="text-text-tertiary text-xs mt-0.5 truncate">
                  {r.period_start
                    ? `${formatDate(r.period_start)} → ${
                        r.period_end ? formatDate(r.period_end) : ""
                      }`
                    : "Période non précisée"}
                  · {r.format.toUpperCase()}
                </p>
              </div>
              {r.read_at ? (
                <CheckCircle2
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--in)" }}
                />
              ) : (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--data-advance) 16%, transparent)",
                    color: "var(--data-advance)",
                  }}
                >
                  Nouveau
                </span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── CaisseCard — Redesign P1 ────────────────────────────────────────────────

function CaisseCard({
  account,
  transactions,
  caisses,
  navigate,
}: {
  account: any;
  transactions: any[];
  caisses: any[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  const caisse = caisses.find((c) => c.id === account.id);
  const color = caisse?.color || "var(--accent-primary)";
  const approvedTxs = transactions.filter(
    (t) =>
      (t.source_caisse_id === account.id || t.sourceCaisseId === account.id) &&
      t.status === "APPROVED",
  );
  const income = approvedTxs
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const expense = approvedTxs
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const pendingCount = transactions.filter(
    (t) =>
      (t.source_caisse_id === account.id || t.sourceCaisseId === account.id) &&
      t.status === "PENDING",
  ).length;

  const buckets: number[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const inc = approvedTxs
      .filter(
        (t) =>
          t.type === "INCOME" && new Date(t.date).getMonth() === d.getMonth(),
      )
      .reduce((s, t) => s + t.amount, 0);
    buckets.push(inc);
    if (i === 0) buckets.push(0);
  }
  const sparkValues = buckets.slice(0, 6);

  return (
    <motion.button
      onClick={() => navigate("/finance")}
      whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 30 } }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-left overflow-hidden"
      aria-label={`Voir les détails de ${account.name}`}
    >
      <div
        className="relative rounded-xl p-5 mb-4 border border-border bg-surface shadow-card"
        style={{
          borderColor: tint(color, 18),
          background: "linear-gradient(135deg, color-mix(in srgb, var(--surface) 92%, var(--surface)) 0%, var(--surface) 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border"
              style={{
                borderColor: tint(color, 30),
                backgroundColor: tint(color, 12),
              }}
            >
              <span
                className="text-sm font-bold"
                style={{ color }}
              >
                {String(account.name).charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-text-primary text-sm font-semibold truncate">
                {account.name}
              </p>
              <p className="text-text-tertiary text-xs truncate">
                {account.ownerType === "ORGANIZATION" ||
                account.owner_type === "ORGANIZATION"
                  ? "Église"
                  : "Groupe"}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p
              className="font-bold text-xl tabular-nums"
              style={{
                color: balance >= 0 ? "var(--in)" : "var(--out)",
              }}
            >
              {balance >= 0 ? "" : "-"}
              {formatCentsToFCFA(Math.abs(balance))}
            </p>
            <p className="text-text-tertiary text-xs">F</p>
            {pendingCount > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium inline-block mt-1"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--warn) 14%, transparent)",
                  color: "var(--warn)",
                }}
              >
                {pendingCount} en attente
              </span>
            )}
          </div>
        </div>
        <div className="h-10" aria-hidden="true">
          <TrendChart
            values={sparkValues}
            height={40}
            color={balance >= 0 ? "var(--in)" : "var(--out)"}
          />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Bannière org active (P2) — inchangée ────────────────────────────────────

function OrgBanner() {
  const ctx = useOrganizationContext();
  const { data: myOrgs } = useMyOrgs();
  const { data: orgs } = useOrganizations("mine");

  const current = myOrgs?.find((o) => o.orgId === ctx.orgId);
  const multiOrg = (myOrgs?.length ?? 0) > 1;
  if (!multiOrg) return null;

  const orgData = orgs?.find((o: any) => o.id === ctx.orgId);
  const label = current?.name || orgData?.name || ctx.label;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={CARD_VARIANTS}
      className="mb-5 px-4 py-3 rounded-xl border"
      style={{
        backgroundColor: "color-mix(in srgb, var(--accent-primary) 8%, var(--surface))",
        borderColor: "color-mix(in srgb, var(--accent-primary) 20%, var(--border))",
      }}
    >
      <div className="flex items-center gap-2">
        <Home className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent-primary)" }} />
        <div className="min-w-0 flex-1">
          <p className="text-text-tertiary text-[11px] uppercase tracking-wider">
            Organisation active
          </p>
          <p className="text-text-primary text-sm font-semibold truncate">{label}</p>
        </div>
        {current?.status && current.status !== "ACTIVE" && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: "color-mix(in srgb, var(--warn) 14%, transparent)",
              color: "var(--warn)",
            }}
          >
            {current.status.toLowerCase()}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page principale — Redesign ─────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const openTransaction = useCallback(
    (id: string) => navigate(`/transaction/${id}`),
    [navigate],
  );
  const user = useCurrentUser();
  const { config: appConfig } = useAppConfig();
  const ctx = useOrganizationContext();

  const { data: transactions, isLoading } = useTransactions();
  const { data: events } = useEvents();
  const { data: accounts } = useAccounts();
  const { data: caisses } = useCaisses();
  const { data: reports } = useReportsReceived();
  const { online, lastSyncAt, syncing, syncError } = usePowerSyncIndicator();
  const { data: myOrgsData } = useMyOrgs();

  const replicaPending = !isPowerSyncReadyNow();

  const churchName = appConfig.churchName || user?.org?.name || "Lumina";

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

  const { start, end } = getPeriodRange("mois");
  const mainAccount = accounts.find((a: any) => a.owner_type === "ORGANIZATION");
  const groupAccounts = accounts.filter(
    (a: any) => a.owner_type === "GROUP" && a.status === "ACTIVE",
  );
  const mainTxs = transactions.filter((t: any) => t.source_caisse_id === "main");

  const approvedTransactions = mainTxs.filter(
    (t) => t.status === "APPROVED" && t.date >= start && t.date <= end,
  );
  const totalIncome = approvedTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = approvedTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;

  const { trend, trendLabels } = useMemo(() => {
    const labels: string[] = [];
    const values: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = d.toLocaleDateString("fr-FR", { month: "short" });
      const mStart = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1,
      ).toISOString().slice(0, 10);
      const mEnd = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
      ).toISOString().slice(0, 10);
      const inc = mainTxs
        .filter(
          (t) =>
            t.type === "INCOME" &&
            t.status === "APPROVED" &&
            t.date >= mStart &&
            t.date <= mEnd,
        )
        .reduce((s, t) => s + t.amount, 0);
      labels.push(mLabel);
      values.push(inc);
    }
    return { trend: values, trendLabels: labels };
  }, [mainTxs]);

  const recentTransactions = mainTxs
    .filter((t) => t.status === "APPROVED" || t.status === "PENDING")
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    .slice(0, 5);

  const upcomingEvents = events
    .filter((e: any) => e.status === "PLANIFIED" || e.status === "ONGOING")
    .sort(
      (a: any, b: any) =>
        new Date(a.start_date || a.startDate).getTime() -
        new Date(b.start_date || b.startDate).getTime(),
    )
    .slice(0, 3);

  const userName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Utilisateur";
  const userInitials =
    ((user?.firstName?.[0] || "U") + (user?.lastName?.[0] || "")).toUpperCase();

  const todos = useUnifiedTodos(
    transactions as any[],
    (reports as any) ?? [],
    (events as any) ?? [],
    (accounts as any) ?? [],
    (caisses as any) ?? [],
  );

  // ─── États de chargement et vide ─────────────────────────────────────────

  if (isLoading) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div className="min-h-dvh">
            <TopHeader title="Lumina" />
            <DashboardSkeleton />
          </div>
          <BottomNav />
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="Lumina" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <h1 className="sr-only">Accueil — tableau de bord financier</h1>
            <div
              className="sr-only"
              role="status"
              aria-live="polite"
            >
              Données financières à jour
            </div>

            {/* P2 : sélecteur multi-org */}
            <OrgSwitcher />

            {/* P2 : bannière org active */}
            {(myOrgsData?.length ?? 0) > 1 && <OrgBanner />}

            {/* P1 : héro executive — MotionCard animée */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={CARD_VARIANTS}
              className="mb-8"
            >
              <HeroCard
                greeting={greeting}
                userName={userName}
                userRoleLabel={user ? getRoleLabel(user.role) : "Membre"}
                userInitials={userInitials}
                netResult={netResult}
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                trend={trend}
                trendLabels={trendLabels}
                online={online}
                lastSyncAt={lastSyncAt}
                syncing={syncing}
                syncError={syncError}
                navigate={navigate}
              />
            </motion.div>

            {/* Premiers pas — guide dynamique */}
            <DashboardOnboarding />

            {/* P2 : stream unifié */}
            <UnifiedTodoList todos={todos} navigate={navigate} />

            {/* P2 : section rapports reçus */}
            <ReceivedReportsSection
              reports={(reports as any) ?? []}
              navigate={navigate}
            />

            {/* Événements à venir */}
            {upcomingEvents.length > 0 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={CARD_VARIANTS}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar
                      className="w-4 h-4"
                      style={{ color: "var(--data-advance)" }}
                    />
                    <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                      Événements à venir
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/events")}
                    className="text-xs font-medium"
                    style={{ color: "var(--accent-primary)" }}
                    aria-label="Voir tous les événements"
                  >
                    Voir tout →
                  </button>
                </div>
                <div className="space-y-2">
                  {upcomingEvents.map((event: any) => {
                    const budgetSpent = parseBudgetItems(
                      event.budget_items ?? event.budgetItems,
                    ).reduce((s: number, i: any) => s + (i.spent ?? 0), 0);
                    const overBudget =
                      event.budget > 0 && budgetSpent > event.budget;
                    const EVENT_COLORS: Record<string, string> = {
                      PLANIFIED: "var(--data-planified)",
                      ONGOING: "var(--in)",
                    };
                    const color = EVENT_COLORS[event.status] || "var(--text-tertiary)";
                    return (
                      <motion.button
                        key={event.id}
                        onClick={() => navigate(`/event/${event.id}`)}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full text-left rounded-xl p-5 transition-all border border-border bg-surface"
                        style={{
                          backgroundColor: "var(--surface)",
                          borderColor: overBudget
                            ? tint("var(--out)", 25)
                            : "var(--border)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: tint(color, 12) }}
                          >
                            <Calendar className="w-5 h-5" style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text-primary text-sm font-semibold truncate">
                              {event.name}
                            </p>
                            <p className="text-text-tertiary text-xs mt-0.5">
                              {event.start_date === event.end_date
                                ? formatDate(event.start_date)
                                : `${formatDate(event.start_date)} → ${formatDate(event.end_date)}`}
                            </p>
                            {event.budget > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <div
                                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                                  style={{ backgroundColor: "var(--surface-hover)" }}
                                >
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        (budgetSpent / event.budget) * 100,
                                      )}%`,
                                      backgroundColor: overBudget
                                        ? "var(--out)"
                                        : "var(--accent-primary)",
                                    }}
                                  />
                                </div>
                                <span
                                  className={`text-xs ${
                                    overBudget ? "text-expense" : "text-text-tertiary"
                                  }`}
                                >
                                  {formatCentsToFCFA(budgetSpent)}/
                                  {formatCentsToFCFA(event.budget)}
                                </span>
                              </div>
                            )}
                          </div>
                          <span
                            className="text-xs px-2 py-1 rounded-full font-medium"
                            style={{ backgroundColor: tint(color, 12), color }}
                          >
                            {event.status === "PLANIFIED" ? "Planifié" : "En cours"}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Caisses des groupes — Redesign P1 */}
            {groupAccounts.length > 0 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: STAGGER_CHILDREN },
                  },
                }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                    Caisses des groupes
                  </p>
                  <button
                    onClick={() => navigate("/versement")}
                    className="text-xs font-medium"
                    style={{ color: "var(--accent-primary)" }}
                    aria-label="Verser dans les caisses de groupe"
                  >
                    Verser →
                  </button>
                </div>
                <div className="space-y-2">
                  {groupAccounts.map((account) => (
                    <CaisseCard
                      key={account.id}
                      account={account as any}
                      transactions={transactions as any}
                      caisses={caisses as any}
                      navigate={navigate}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Actions rapides — Redesign avec CircleAction (préservé) */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={CARD_VARIANTS}
              className="mb-8"
            >
              <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-4">
                Actions rapides
              </p>
              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col items-center gap-2 p-2 rounded-xl w-full transition-colors hover:bg-surface-hover">
                  <CircleAction
                    soft
                    tone="income"
                    onClick={() => navigate("/transaction/new?type=INCOME")}
                    aria-label="Nouvelle entrée"
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </CircleAction>
                  <span className="text-text-primary text-xs font-medium text-center">Entrée</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-2 rounded-xl w-full transition-colors hover:bg-surface-hover">
                  <CircleAction
                    soft
                    tone="expense"
                    onClick={() => navigate("/transaction/new?type=EXPENSE")}
                    aria-label="Nouvelle sortie"
                  >
                    <ArrowDownRight className="w-5 h-5" />
                  </CircleAction>
                  <span className="text-text-primary text-xs font-medium text-center">Sortie</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-2 rounded-xl w-full transition-colors hover:bg-surface-hover">
                  <CircleAction
                    soft
                    onClick={() => navigate("/versement")}
                    aria-label="Nouveau versement"
                  >
                    <TrendingUp className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                  </CircleAction>
                  <span className="text-text-primary text-xs font-medium text-center">Versement</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-2 rounded-xl w-full transition-colors hover:bg-surface-hover">
                  <CircleAction
                    soft
                    tone="advance"
                    onClick={() => navigate("/events")}
                    aria-label="Nouvel événement"
                  >
                    <Calendar className="w-5 h-5" />
                  </CircleAction>
                  <span className="text-text-primary text-xs font-medium text-center">Événement</span>
                </div>
              </div>
            </motion.div>

            {/* Derniers mouvements (ancre Cypress préservée) */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-text-primary font-semibold text-base">Derniers mouvements</p>
              <button
                onClick={() => navigate("/finance")}
                className="text-sm font-medium"
                style={{ color: "var(--accent-primary)" }}
                aria-label="Voir toutes les transactions"
              >
                Tout voir
              </button>
            </div>
            <div className="space-y-2 pb-6">
              {recentTransactions.length === 0 && replicaPending ? (
                <ListSkeleton count={3} />
              ) : recentTransactions.length === 0 ? (
                <EmptyState
                  title="Pas encore de mouvement"
                  description="Commencez par enregistrer votre première transaction"
                  icon={<PlusCircle className="w-6 h-6" />}
                  actionLabel="Créer une transaction"
                  onAction={() => navigate("/transaction/new")}
                />
              ) : (
                recentTransactions.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    transaction={tx as any}
                    onPress={openTransaction}
                  />
                ))
              )}
            </div>
          </div>

          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
