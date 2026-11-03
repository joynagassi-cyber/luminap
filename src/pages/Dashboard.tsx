/**
 * Dashboard v2 (2026-10-05 B5) — Combo P2 + P1 + 1 charte P3.
 *
 * Structure retenue (cf. docs/design/2026-10-05-lumina-dashboard-premium-propositions.md) :
 *  - P2 : OrgSwitcher (gating multi-org) + bannière org active + stream unifié
 *         (approbations + rapports non lus + événements du jour + caisses
 *         en solde négatif, top 5) + section « Rapports reçus » (Feature 2).
 *  - P1 : carte héro « executive card » (solde + sync pill + sparkline 6M).
 *  - P3 : UNE seule charte (AreaChart 6 mois, 96 px) — plus de donut,
 *         plus de top 5 postes (densité contrôlée à 390 px).
 *
 * Non-régression (invariants du document §0) :
 *  - Les anchors Cypress existants restent TOUCHÉS mais PRÉSERVÉS :
 *      « Voir les détails de la caisse principale » (aria-label du héros,
 *      qui reste sur le héros),
 *      « Entrées du mois » / « Sorties du mois » (restant dans le héros),
 *      « Derniers mouvements », CircleAction (Entrée/Sortie/Versement/Événement),
 *      EmptyState (aucun mouvement).
 *  - Le BottomNav est figé — on ne le modifie pas ici.
 *  - Toutes les couleurs passent par les tokens Lumina (`var(--*)`),
 *    aucune couleur brute n'est introduite.
 *  - Zéro appel REST à l'ouverture : 100 % PowerSync (hooks dataLayer).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  type PSOrgReports,parseBudgetItems } from "@/lib/dataLayer";
import { formatCentsToFCFA, getPeriodRange, formatDate, tint } from "@/lib/utils";
import { useOrganizationContext, useMyOrgs } from "@/lib/organization-context";
import { usePowerSyncIndicator } from "@/lib/hooks/usePowerSyncIndicator";
import { IonContent, IonPage } from "@ionic/react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  TrendingUp,
  TrendingDown,
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

// ─── Héro financier (P1) ─────────────────────────────────────────────────────

/**
 * Héro « executive card » : le solde du mois + sync pill + sparkline 6M.
 *
 * Gating : ce héros est le point focal du dashboard — il s'affiche toujours
 * (même en solde 0), avec le même aria-label que l'actuel héros
 * (« Voir les détails de la caisse principale ») pour non-régression Cypress.
 */
function HeroCard({
  greeting,
  userName,
  userRoleLabel,
  userInitials,
  netResult,
  totalIncome,
  totalExpense,
  previousNetResult,
  previousMonthLabel,
  trend,
  trendLabels,
  trendHasData,
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
  /** Net approuvé du mois précédent ; null si ce mois n'a aucune donnée (delta masqué). */
  previousNetResult: number | null;
  previousMonthLabel: string;
  trend: number[];
  trendLabels: string[];
  /** False = aucune transaction approuvée sur 6 mois → état vide explicite, pas de fausse courbe. */
  trendHasData: boolean;
  online: boolean;
  lastSyncAt: Date | null;
  syncing: boolean;
  syncError: string | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const netColor =
    netResult > 0 ? "var(--in)" : netResult < 0 ? "var(--out)" : "var(--text-primary)";
  // Sens de tendance pour la sparkline : delta vs mois précédent si
  // disponible, sinon signe du cumul 6 mois — jamais vert arbitraire.
  const trendTotal = trend.reduce((acc, v) => acc + v, 0);
  const trendUp =
    previousNetResult !== null ? netResult >= previousNetResult : trendTotal >= 0;
  const trendColor = trendUp ? "var(--in)" : "var(--out)";
  const deltaPct =
    previousNetResult !== null && previousNetResult !== 0
      ? Math.round(
          ((netResult - previousNetResult) / Math.abs(previousNetResult)) * 100,
        )
      : null;
  const now = new Date();
  // PM19 — une erreur d'envoi (uploadError/downloadError) doit être VISIBLE :
  // sinon une saisie en file jamais envoyée restait muette (le pill affichait
  // « sync HH:MM » comme si tout allait bien).
  const syncLabel = syncError
    ? "échec d'envoi"
    : !online
      ? "hors ligne"
      : syncing
        ? "synchronisation…"
        : lastSyncAt
          ? `sync ${now.toDateString() === lastSyncAt.toDateString()
              ? lastSyncAt.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : formatDate(lastSyncAt.toISOString())}`
          : "en attente";
  const hasSyncError = syncError !== null;

  return (
    <button
      onClick={() => navigate("/finance")}
      className="w-full text-left rounded-2xl p-5 mb-6 transition-all active:scale-98"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 10%, var(--surface)) 0%, var(--surface) 100%)",
        border: "1px solid color-mix(in srgb, var(--accent-primary) 22%, var(--border))",
        boxShadow: "var(--shadow-card)",
      }}
      aria-label="Voir les détails de la caisse principale"
    >
      {/* Ligne 1 : profil + sync pill */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-primary) 16%, transparent)",
            }}
            aria-label={`Profil de ${userName}`}
          >
            <span className="text-sm font-bold" style={{ color: "var(--accent-primary)" }}>
              {userInitials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-text-primary font-semibold text-sm truncate">
              {greeting} <span className="text-text-tertiary font-normal">·</span>{" "}
              {userName}
            </p>
            <p className="text-text-tertiary text-xs truncate">{userRoleLabel}</p>
          </div>
        </div>
        {/* Sync pill (P1) */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-primary) 8%, transparent)",
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
            <Circle className="w-1.5 h-1.5" style={{ fill: "var(--in)", color: "var(--in)" }} />
          ) : (
            <Circle className="w-1.5 h-1.5" style={{ fill: "var(--out)", color: "var(--out)" }} />
          )}
          <span>{syncLabel}</span>
        </div>
      </div>

      {/* Ligne 2 : résultat net + delta vs mois précédent */}
      <div className="mb-4">
        <p className="text-text-tertiary text-xs mb-1">Résultat net du mois</p>
        <span
          className="text-3xl font-black tabular-nums leading-none whitespace-nowrap"
          style={{ color: netColor }}
        >
          {netResult >= 0 ? "" : "−"}
          {formatCentsToFCFA(Math.abs(netResult))}
        </span>
        {previousNetResult !== null && (
          <p
            className="text-xs mt-1.5 flex items-center gap-1"
            style={{ color: trendUp ? "var(--in)" : "var(--out)" }}
          >
            {trendUp ? (
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {deltaPct !== null
              ? `${Math.abs(deltaPct)} % vs ${previousMonthLabel}`
              : `${netResult >= previousNetResult ? "+" : "−"}${formatCentsToFCFA(
                  Math.abs(netResult - previousNetResult),
                )} vs ${previousMonthLabel}`}
          </p>
        )}
      </div>

      {/* Ligne 2bis : sous-tuiles Entrées / Sorties (largeurs égales,
          montants sans retour à la ligne, signe omis à zéro) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div
          className="rounded-xl p-3 flex items-center gap-2.5 min-w-0"
          style={{ backgroundColor: "var(--surface-hover)" }}
        >
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: tint("var(--in)", 12) }}
            aria-hidden="true"
          >
            <ArrowUpRight className="w-4 h-4" style={{ color: "var(--in)" }} />
          </span>
          <span className="min-w-0">
            <span className="block text-text-tertiary text-xs">Entrées du mois</span>
            <span
              className="block font-semibold text-base whitespace-nowrap"
              style={{ color: "var(--in)" }}
            >
              {totalIncome > 0
                ? `+${formatCentsToFCFA(totalIncome)}`
                : formatCentsToFCFA(0)}
            </span>
          </span>
        </div>
        <div
          className="rounded-xl p-3 flex items-center gap-2.5 min-w-0"
          style={{ backgroundColor: "var(--surface-hover)" }}
        >
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: tint("var(--out)", 12) }}
            aria-hidden="true"
          >
            <ArrowDownRight className="w-4 h-4" style={{ color: "var(--out)" }} />
          </span>
          <span className="min-w-0">
            <span className="block text-text-tertiary text-xs">Sorties du mois</span>
            <span
              className="block font-semibold text-base whitespace-nowrap"
              style={{ color: "var(--out)" }}
            >
              {totalExpense > 0
                ? `−${formatCentsToFCFA(totalExpense)}`
                : formatCentsToFCFA(0)}
            </span>
          </span>
        </div>
      </div>

      {/* Ligne 3 : sparkline pleine largeur (6 mois) */}
      <div className="rounded-xl p-3" style={{ backgroundColor: "var(--surface-hover)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-tertiary text-xs">Tendance (6 mois)</span>
          {trendHasData &&
            (trendUp ? (
              <TrendingUp className="w-3.5 h-3.5" style={{ color: trendColor }} aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" style={{ color: trendColor }} aria-hidden="true" />
            ))}
        </div>
        {trendHasData ? (
          <TrendChart
            values={trend}
            labels={trendLabels}
            height={96}
            color={trendColor}
            withTooltip
            formatValue={(v) =>
              `${v < 0 ? "−" : ""}${formatCentsToFCFA(Math.abs(v))}`
            }
          />
        ) : (
          <div
            className="flex items-center justify-center text-text-tertiary text-xs"
            style={{ height: 96 }}
          >
            Pas encore assez de données
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Stream unifié (P2) ────────────────────────────────────────────────────────

export interface UnifiedTodo {
  key: string;
  kind: "APPROVAL" | "REPORT_UNREAD" | "EVENT_TODAY" | "CAISSE_NEGATIVE";
  title: string;
  subtitle?: string;
  amountCents?: number;
  tone: "pending" | "planified" | "advance" | "income" | "expense";
  href: string;
}

/**
 * Combine PENDING transactions, rapports non lus, événements du jour et
 * caisses en solde négatif dans un seul stream, trié par priorité
 * (APPROVAL > REPORT_UNREAD > EVENT_TODAY > CAISSE_NEGATIVE), plafonné
 * à 5 items (le reste est accessible via les sections dédiées).
 */
function useUnifiedTodos(
  transactions: any[],
  reports: PSOrgReports[],
  events: any[],
  accounts: any[],
  caisses: any[],
): UnifiedTodo[] {
  const todos: UnifiedTodo[] = [];

  // 1. Transactions en attente d'approbation.
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

  // 2. Rapports reçus non lus (Feature 2).
  reports.filter((r) => !r.read_at).slice(0, 3).forEach((r) => {
    todos.push({
      key: `rep-${r.id}`,
      kind: "REPORT_UNREAD",
      title: r.title || `Rapport ${r.format.toUpperCase()} à lire`,
      subtitle: r.period_start ? `${formatDate(r.period_start)} → ${r.period_end ? formatDate(r.period_end) : ""}` : undefined,
      tone: "advance",
      href: `/admin/reports/${r.id}`,
    });
  });

  // 3. Événements du jour (PLANIFIED / ONGOING).
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

  // 4. Caisses de groupes en solde négatif.
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

function UnifiedTodoList({ todos, navigate }: { todos: UnifiedTodo[]; navigate: ReturnType<typeof useNavigate> }) {
  if (todos.length === 0) return null;
  const KIND_LABEL: Record<UnifiedTodo["kind"], string> = {
    APPROVAL: "Approbation",
    REPORT_UNREAD: "Rapport",
    EVENT_TODAY: "Événement",
    CAISSE_NEGATIVE: "Caisse",
  };
  const ICON: Record<UnifiedTodo["kind"], any> = {
    APPROVAL: Clock,
    REPORT_UNREAD: FileText,
    EVENT_TODAY: Calendar,
    CAISSE_NEGATIVE: Circle,
  };
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
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
      <div className="space-y-2">
        {todos.map((t) => {
          const Icon = ICON[t.kind];
          return (
            <button
              key={t.key}
              onClick={() => navigate(t.href)}
              className="w-full text-left rounded-xl p-3 transition-all active:scale-98"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
              aria-label={`${KIND_LABEL[t.kind]} : ${t.title}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: tint(TONE_COLOR[t.tone], 12) }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: TONE_COLOR[t.tone] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{t.title}</p>
                  {t.subtitle && (
                    <p className="text-text-tertiary text-xs mt-0.5 truncate">{t.subtitle}</p>
                  )}
                </div>
                {typeof t.amountCents === "number" && (
                  <span
                    className="text-xs font-semibold tabular-nums flex-shrink-0"
                    style={{
                      color: t.amountCents >= 0 ? "var(--in)" : "var(--out)",
                    }}
                  >
                    {t.amountCents >= 0 ? "+" : "−"}
                    {formatCentsToFCFA(Math.abs(t.amountCents))}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section « Rapports reçus » (P2 / Feature 2) ─────────────────────────────

function ReceivedReportsSection({
  reports,
  navigate,
}: {
  reports: PSOrgReports[];
  navigate: ReturnType<typeof useNavigate>;
}) {
  // Gating : ne s'affiche que si l'org a reçu au moins un rapport.
  if (reports.length === 0) return null;
  const unread = reports.filter((r) => !r.read_at);
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4" style={{ color: "var(--data-advance)" }} />
          <p className="text-text-primary text-sm font-semibold">
            Rapports reçus
          </p>
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
          <button
            key={r.id}
            onClick={() => navigate(`/admin/reports/${r.id}`)}
            className="w-full text-left rounded-xl p-3 transition-all active:scale-98"
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              opacity: r.read_at ? 0.65 : 1,
            }}
            aria-label={`Ouvrir le rapport : ${r.title || "rapport"}${
              r.read_at ? "" : " (non lu)"
            }`}
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
                    ? `${formatDate(r.period_start)} → ${r.period_end ? formatDate(r.period_end) : ""}`
                    : "Période non précisée"}{" "}
                  · {r.format.toUpperCase()}
                </p>
              </div>
              {r.read_at ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--in)" }} />
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
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CaisseCard (refonte P1 : + sparkline, + badge attente) ─────────────────

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

  // Sparkline 6M : NET mensuel (entrées - sorties approuvées), mois ET
  // année comparés — l'ancienne version ne sommait que les revenus (une
  // caisse en dépenses paraissait plate) et confondait les années.
  const sparkValues: number[] = [];
  let sparkHasData = false;
  for (let i = 5; i >= 0; i -= 1) {
    const nowD = new Date();
    const d = new Date(nowD.getFullYear(), nowD.getMonth() - i, 1);
    const monthTxs = approvedTxs.filter((t) => {
      const td = new Date(t.date);
      return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
    });
    if (monthTxs.length > 0) sparkHasData = true;
    sparkValues.push(
      monthTxs.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0),
    );
  }

  return (
    <button
      onClick={() => navigate("/finance")}
      className="w-full text-left rounded-xl p-4 transition-all active:scale-98"
      style={{ backgroundColor: "var(--surface)", border: `1px solid ${tint(color, 19)}` }}
      aria-label={`Voir les détails de ${account.name}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: tint(color, 12) }}
          >
            <span className="text-sm font-bold" style={{ color }}>
              {String(account.name).charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-text-primary text-sm font-semibold truncate">{account.name}</p>
            <p className="text-text-tertiary text-xs truncate">
              {account.ownerType === "ORGANIZATION" || account.owner_type === "ORGANIZATION"
                ? "Église"
                : "Groupe"}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p
            className="font-bold text-lg tabular-nums"
            style={{
              color: balance >= 0 ? "var(--in)" : "var(--out)",
            }}
          >
            {balance >= 0 ? "" : "−"}
            {formatCentsToFCFA(Math.abs(balance))}
          </p>
          {pendingCount > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-block mt-0.5"
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
        {sparkHasData ? (
          <TrendChart
            values={sparkValues}
            height={40}
            color={balance >= 0 ? "var(--in)" : "var(--out)"}
          />
        ) : (
          <p className="text-text-tertiary text-[11px] flex items-center h-full">
            Pas encore assez de données
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Bannière org active (P2) ────────────────────────────────────────────────

function OrgBanner() {
  const ctx = useOrganizationContext();
  const { data: myOrgs } = useMyOrgs();
  const { data: orgs } = useOrganizations("mine");

  // Gating : n'affiche que si l'utilisateur a ≥2 orgs (sinon P1 seul suffit).
  const current = myOrgs?.find((o) => o.orgId === ctx.orgId);
  const multiOrg = (myOrgs?.length ?? 0) > 1;
  if (!multiOrg) return null;

  const orgData = orgs?.find((o: any) => o.id === ctx.orgId);
  const label = current?.name || orgData?.name || ctx.label;

  return (
    <div
      className="mb-4 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: "color-mix(in srgb, var(--accent-primary) 8%, var(--surface))",
        border: "1px solid color-mix(in srgb, var(--accent-primary) 20%, var(--border))",
      }}
    >
      <div className="flex items-center gap-2">
        <Home className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent-primary)" }} />
        <div className="min-w-0 flex-1">
          <p className="text-text-tertiary text-[11px] uppercase tracking-wider">Organisation active</p>
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
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const openTransaction = useCallback((id: string) => navigate(`/transaction/${id}`), [navigate]);
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

  // R52.l — la réplique PowerSync n'est pas encore prête : « Pas encore de
  // mouvement » serait un fait FAUX (l'écran d'accueil est la 1re chose vue).
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

  // Sparkline 6M : NET mensuel approuvé (entrées - sorties). L'ancienne
  // version ne sommait que les revenus : un mois de dépenses affichait
  // une ligne plate verte (bug P2-3). `trendHasData` pilote l'état vide.
  const { trend, trendLabels, trendHasData } = useMemo(() => {
    const labels: string[] = [];
    const values: number[] = [];
    let hasData = false;
    const now = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = d.toLocaleDateString("fr-FR", { month: "short" });
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 10);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0).toISOString().slice(0, 10);
      const monthTxs = mainTxs.filter(
        (t) => t.status === "APPROVED" && t.date >= mStart && t.date <= mEnd,
      );
      if (monthTxs.length > 0) hasData = true;
      labels.push(mLabel);
      values.push(
        monthTxs.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0),
      );
    }
    return { trend: values, trendLabels: labels, trendHasData: hasData };
  }, [mainTxs]);

  // Delta vs mois précédent (spéc. dashboard §5.3) : seulement si le mois
  // N-1 a des données approuvées, sinon masqué (null).
  const { previousNetResult, previousMonthLabel } = useMemo(() => {
    const now = new Date();
    const pStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const pEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    const label = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString(
      "fr-FR",
      { month: "long" },
    );
    const prevTxs = mainTxs.filter(
      (t) => t.status === "APPROVED" && t.date >= pStart && t.date <= pEnd,
    );
    if (prevTxs.length === 0) {
      return { previousNetResult: null as number | null, previousMonthLabel: label };
    }
    return {
      previousNetResult: prevTxs.reduce(
        (s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount),
        0,
      ) as number | null,
      previousMonthLabel: label,
    };
  }, [mainTxs]);

  // « Derniers mouvements » : tout ce qui vient d'être saisi doit y figurer,
  // y compris un brouillon hérité/importé (DRAFT) — sinon l'utilisateur
  // croit sa saisie perdue (bug P0-1). Seul REJECTED est écarté. Les TOTAUX
  // ci-dessus restent, eux, sur les seules transactions APPROVED (règle
  // comptable) ; le badge de statut de la ligne signale DRAFT/PENDING.
  const recentTransactions = mainTxs
    .filter((t) => t.status !== "REJECTED")
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        new Date((b as any).created_at ?? b.date).getTime() -
          new Date((a as any).created_at ?? a.date).getTime(),
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

  // Salutation sur le prénom/nom d'affichage — jamais un email ou un
  // identifiant technique qui aurait pu se glisser dans ces champs (P2-2).
  const nameParts = [user?.firstName, user?.lastName]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0 && !part.includes("@"));
  const userName = nameParts.join(" ") || "Utilisateur";
  const userInitials = (
    (nameParts[0]?.[0] || "U") + (nameParts[1]?.[0] || "")
  ).toUpperCase();

  const todos = useUnifiedTodos(
    transactions as any[],
    (reports as any) ?? [],
    (events as any) ?? [],
    (accounts as any) ?? [],
    (caisses as any) ?? [],
  );

  if (isLoading) {
    return (
      <IonPageWrapper>
        <div data-screen-state="loading">
          <TopHeader title="Lumina" />
          <DashboardSkeleton />
        </div>
        <BottomNav />
      </IonPageWrapper>
    );
  }

  return (
    <IonPageWrapper>
      <div data-screen-state="ready">
      <TopHeader title="Lumina" />
      <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
        <h1 className="sr-only">Accueil — tableau de bord financier</h1>
        <div className="sr-only" role="status" aria-live="polite">
          Données financières à jour
        </div>

        {/* P2 : sélecteur multi-org (s'auto-masque si ≤1 org) */}
        <OrgSwitcher />

        {/* P2 : bannière org active */}
        {(myOrgsData?.length ?? 0) > 1 && <OrgBanner />}

        {/* P1 : héro executive */}
        <HeroCard
          greeting={greeting}
          userName={userName}
          userRoleLabel={user ? getRoleLabel(user.role) : "Membre"}
          userInitials={userInitials}
          netResult={netResult}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          previousNetResult={previousNetResult}
          previousMonthLabel={previousMonthLabel}
          trend={trend}
          trendLabels={trendLabels}
          trendHasData={trendHasData}
          online={online}
          lastSyncAt={lastSyncAt}
          syncing={syncing}
          syncError={syncError}
          navigate={navigate}
        />

        {/* Premiers pas — guide dynamique, s'auto-masque une fois terminé */}
        <DashboardOnboarding />

        {/* P2 : stream unifié (s'auto-masque si 0 item) */}
        <UnifiedTodoList todos={todos} navigate={navigate} />

        {/* P2 : section rapports reçus (s'auto-masque si 0) */}
        <ReceivedReportsSection reports={(reports as any) ?? []} navigate={navigate} />

        {/* Événements à venir (existant) */}
        {upcomingEvents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: "var(--data-advance)" }} />
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
                const overBudget = event.budget > 0 && budgetSpent > event.budget;
                const EVENT_COLORS: Record<string, string> = {
                  PLANIFIED: "var(--data-planified)",
                  ONGOING: "var(--in)",
                };
                const color = EVENT_COLORS[event.status] || "var(--text-tertiary)";
                return (
                  <button
                    key={event.id}
                    onClick={() => navigate(`/event/${event.id}`)}
                    className="w-full text-left rounded-xl p-4 transition-all active:scale-95"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: `1px solid ${overBudget ? tint("var(--out)", 25) : "var(--border)"}`,
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
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="flex-1 h-1 rounded-full overflow-hidden"
                              style={{ backgroundColor: "var(--surface-hover)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, (budgetSpent / event.budget) * 100)}%`,
                                  backgroundColor: overBudget
                                    ? "var(--out)"
                                    : "var(--accent-primary)",
                                }}
                              />
                            </div>
                            <span
                              className={`text-xs ${overBudget ? "text-expense" : "text-text-tertiary"}`}
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
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Caisses des groupes (refonte P1 : + sparkline + badge attente) */}
        {groupAccounts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
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
          </div>
        )}

        {/* Actions rapides (existant M23 CircleAction) */}
        <div className="mb-6">
          <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">
            Actions rapides
          </p>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col items-center gap-2 p-1 rounded-xl w-full">
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
            <div className="flex flex-col items-center gap-2 p-1 rounded-xl w-full">
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
            <div className="flex flex-col items-center gap-2 p-1 rounded-xl w-full">
              <CircleAction
                soft
                onClick={() => navigate("/versement")}
                aria-label="Nouveau versement"
              >
                <TrendingUp className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
              </CircleAction>
              <span className="text-text-primary text-xs font-medium text-center">Versement</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-1 rounded-xl w-full">
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
        </div>

        {/* Derniers mouvements (existant, ancre Cypress) */}
        <div className="flex items-center justify-between mb-3">
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
        <div className="space-y-2 pb-4">
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
    </IonPageWrapper>
  );
}

// ─── Wrapper IonPage (factorisé pour charger/skeleton + rendu final) ─────────

function IonPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="min-h-dvh">{children}</div>
      </IonContent>
    </IonPage>
  );
}
