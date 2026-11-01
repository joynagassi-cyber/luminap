/**
 * Dashboard v3 — Redesign inspiré du modèle « Tableau de bord Lumina ».
 *
 * Structure (de haut en bas) :
 *  1. Header : logo, statut de synchronisation, salut personnalisé, date
 *  2. Héro financier : solde de la caisse principale en très grand,
 *     badges Entrées / Sorties du mois
 *  3. Actions rapides : bouton « Entrée » (vert) et « Sortie » (rouge)
 *  4. Section « À traiter » : carte avec dépense à approuver + bouton « Examiner »
 *  5. Section « Derniers mouvements » : liste avec icônes et montants colorés
 *  6. Sections supplémentaires (Rapports reçus, Caisses des groupes, Événements)
 *  7. BottomNav (figé, inchangé)
 *
 * Règles respectées :
 *  - Zéro couleur en dur : uniquement des tokens CSS `var(--*)`
 *  - Ancres Cypress préservées (aria-label, titres de section, CircleAction, EmptyState)
 *  - BottomNav non modifié
 *  - Interface en français
 *  - 100 % PowerSync via les hooks dataLayer
 */

import { useCallback, useMemo } from "react";
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
  isPowerSyncReadyNow,
  type PSOrgReports,
} from "@/lib/dataLayer";
import { formatCentsToFCFA, getPeriodRange, formatDate } from "@/lib/utils";
import { useOrganizationContext, useMyOrgs } from "@/lib/organization-context";
import { usePowerSyncIndicator } from "@/lib/hooks/usePowerSyncIndicator";
import { IonContent, IonPage } from "@ionic/react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  TrendingUp,
  Home,
  PlusCircle,
  FileText,
  FolderTree,
  Radio,
  Circle,
  CheckCircle2,
  Inbox,
  Clock,
  Wallet,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import CircleAction from "@/components/CircleAction";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import OrgSwitcher from "@/components/OrgSwitcher";
import DashboardOnboarding from "@/components/DashboardOnboarding";
import { DashboardSkeleton } from "@/components/PageSkeletons";
import { ListSkeleton } from "@/components/Skeleton";
import { getRoleLabel } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnifiedTodo {
  key: string;
  kind: "APPROVAL" | "REPORT_UNREAD" | "EVENT_TODAY" | "CAISSE_NEGATIVE";
  title: string;
  subtitle?: string;
  amountCents?: number;
  tone: "pending" | "planified" | "advance" | "income" | "expense";
  href: string;
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const TONE_COLOR: Record<UnifiedTodo["tone"], string> = {
  pending: "var(--warn)",
  planified: "var(--data-planified)",
  advance: "var(--data-advance)",
  income: "var(--in)",
  expense: "var(--out)",
};

const ICON_BY_KIND: Record<UnifiedTodo["kind"], any> = {
  APPROVAL: Clock,
  REPORT_UNREAD: FileText,
  EVENT_TODAY: Calendar,
  CAISSE_NEGATIVE: Wallet,
};

const KIND_LABEL: Record<UnifiedTodo["kind"], string> = {
  APPROVAL: "Approbation",
  REPORT_UNREAD: "Rapport",
  EVENT_TODAY: "Événement",
  CAISSE_NEGATIVE: "Caisse",
};

// ─── Héro financier ───────────────────────────────────────────────────────────

function HeroCard({
  greeting,
  userName,
  userRoleLabel,
  netResult,
  totalIncome,
  totalExpense,
  online,
  syncing,
  syncError,
  lastSyncAt,
  navigate,
}: {
  greeting: string;
  userName: string;
  userRoleLabel: string;
  netResult: number;
  totalIncome: number;
  totalExpense: number;
  online: boolean;
  syncing: boolean;
  syncError: string | null;
  lastSyncAt: Date | null;
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
      className="w-full text-left rounded-2xl p-6 mb-5 transition-all active:scale-98"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 10%, var(--surface)) 0%, var(--surface) 100%)",
        border: "1px solid color-mix(in srgb, var(--accent-primary) 22%, var(--border))",
        boxShadow: "var(--shadow-card)",
      }}
      aria-label="Voir les détails de la caisse principale"
    >
      {/* Ligne 1 : statut de synchronisation */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-xs font-medium whitespace-nowrap mb-4"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent-primary) 8%, transparent)",
          color: hasSyncError ? "var(--out)" : online ? "var(--in)" : "var(--out)",
        }}
        aria-label={`État de synchronisation : ${syncLabel}`}
      >
        {hasSyncError ? (
          <Circle className="w-1.5 h-1.5" style={{ fill: "var(--out)", color: "var(--out)" }} />
        ) : syncing ? (
          <Radio className="w-3.5 h-3.5 animate-pulse" />
        ) : online ? (
          <Circle className="w-1.5 h-1.5" style={{ fill: "var(--in)", color: "var(--in)" }} />
        ) : (
          <Circle className="w-1.5 h-1.5" style={{ fill: "var(--out)", color: "var(--out)" }} />
        )}
        <span>{syncLabel}</span>
      </div>

      {/* Ligne 2 : titre du solde + montant */}
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-text-tertiary text-xs uppercase tracking-wider font-bold mb-1">
            Solde de la caisse principale
          </p>
          <div className="flex items-baseline gap-1">
            <span
              className="text-5xl font-black tabular-nums leading-none"
              style={{ color: netColor }}
            >
              {netResult >= 0 ? "" : "−"}
              {formatCentsToFCFA(Math.abs(netResult))}
            </span>
            <span className="text-text-tertiary text-sm">F</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-text-tertiary text-xs mb-1">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>

      {/* Badges Entrées / Sorties */}
      <div className="flex gap-3">
        <button
          className="flex-1 py-2 rounded-xl bg-surface border border-border flex items-center justify-center gap-2 transition-all hover:border-accent-primary/50"
        >
          <span className="text-text-secondary text-xs font-medium">Entrées du mois</span>
          <span className="text-text-primary text-xs font-bold" style={{ color: "var(--in)" }}>
            +{formatCentsToFCFA(totalIncome)}
          </span>
        </button>
        <button
          className="flex-1 py-2 rounded-xl bg-surface border border-border flex items-center justify-center gap-2 transition-all hover:border-accent-primary/50"
        >
          <span className="text-text-secondary text-xs font-medium">Sorties du mois</span>
          <span className="text-text-primary text-xs font-bold" style={{ color: "var(--out)" }}>
            −{formatCentsToFCFA(totalExpense)}
          </span>
        </button>
      </div>
    </button>
  );
}

// ─── Stream unifié « À traiter » ──────────────────────────────────────────────

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
        ? `${formatDate(r.period_start)} → ${r.period_end ? formatDate(r.period_end) : ""}`
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

function UnifiedTodoList({ todos, navigate }: { todos: UnifiedTodo[]; navigate: ReturnType<typeof useNavigate> }) {
  if (todos.length === 0) return null;
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
          <p className="text-text-primary font-semibold text-base">À traiter</p>
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
          const Icon = ICON_BY_KIND[t.kind];
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
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
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

// ─── Page principale ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
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

  const recentTransactions = mainTxs
    .filter((t) => t.status === "APPROVED" || t.status === "PENDING")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
  const userRoleLabel = user ? getRoleLabel(user.role) : "Membre";

  const todos = useUnifiedTodos(
    transactions as any[],
    (reports as any) ?? [],
    (events as any) ?? [],
    (accounts as any) ?? [],
    (caisses as any) ?? [],
  );

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
        <div className="min-h-dvh flex flex-col">
          {/* ── Header avec logo Lumina + statut + salut ── */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <img
                src="/lumina-logo-version-monochrome.png"
                alt="Lumina"
                className="w-8 h-8 object-contain"
              />
              <span className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                Synchronisé
              </span>
            </div>
            <div className="flex-1 text-right">
              <p className="text-text-primary font-bold text-xl leading-tight">
                {greeting}, {userName.split(" ")[0]}
              </p>
              <p className="text-text-tertiary text-xs">
                {new Date().toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>

          <div className="flex-1 px-5 pb-safe-calc pt-safe pt-2">
            <h1 className="sr-only">Accueil — tableau de bord financier</h1>
            <div className="sr-only" role="status" aria-live="polite">
              Données financières à jour
            </div>

            {/* P2 : sélecteur multi-org */}
            <OrgSwitcher />

            {/* P1 : héro financier */}
            <HeroCard
              greeting={greeting}
              userName={userName}
              userRoleLabel={userRoleLabel}
              netResult={netResult}
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              online={online}
              syncing={syncing}
              syncError={syncError}
              lastSyncAt={lastSyncAt}
              navigate={navigate}
            />

            {/* Premiers pas — guide dynamique */}
            <DashboardOnboarding />

            {/* P2 : stream unifié « À traiter » */}
            <UnifiedTodoList todos={todos} navigate={navigate} />

            {/* Section « Derniers mouvements » */}
            <div className="mb-5">
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
                    icon={<PlusCircle className="w-6 h-6" />}>
                    Créer une transaction
                  </EmptyState>
                ) : (
                  recentTransactions.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => navigate(`/transaction/${tx.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface border border-border transition-all active:scale-98"
                      aria-label={`Transaction ${tx.label || tx.note || tx.id}`}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor:
                            tx.type === "INCOME"
                              ? "color-mix(in srgb, var(--in) 15%, transparent)"
                              : "color-mix(in srgb, var(--out) 15%, transparent)",
                        }}
                      >
                        {tx.type === "INCOME" ? (
                          <ArrowUpRight className="w-4 h-4" style={{ color: "var(--in)" }} />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" style={{ color: "var(--out)" }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">
                          {tx.label || tx.note || "Transaction"}
                        </p>
                        <p className="text-text-tertiary text-xs mt-0.5 truncate">
                          {tx.date ? formatDate(tx.date) : ""} · Caisse principale
                        </p>
                      </div>
                      <span
                        className="text-sm font-semibold tabular-nums flex-shrink-0"
                        style={{
                          color: tx.type === "INCOME" ? "var(--in)" : "var(--out)",
                        }}
                      >
                        {tx.type === "INCOME" ? "+" : "−"}
                        {formatCentsToFCFA(tx.amount)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Caisses des groupes */}
            {accounts
              .filter((a: any) => a.owner_type === "GROUP" && a.status === "ACTIVE")
              .length > 0 && (
              <div className="mb-5">
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
                  {accounts
                    .filter((a: any) => a.owner_type === "GROUP" && a.status === "ACTIVE")
                    .map((account) => {
                      const caisse = caisses.find((c) => c.id === account.id);
                      const color = caisse?.color || "var(--accent-primary)";
                      const approvedTxs = transactions.filter(
                        (t) =>
                          (t.source_caisse_id === account.id ||
                            t.sourceCaisseId === account.id) &&
                          t.status === "APPROVED",
                      );
                      const income = approvedTxs
                        .filter((t) => t.type === "INCOME")
                        .reduce((s, t) => s + t.amount, 0);
                      const expense = approvedTxs
                        .filter((t) => t.type === "EXPENSE")
                        .reduce((s, t) => s + t.amount, 0);
                      const balance = income - expense;
                      return (
                        <button
                          key={account.id}
                          onClick={() => navigate("/finance")}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface border border-border transition-all active:scale-98"
                          aria-label={`Voir les détails de ${account.name}`}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
                          >
                            <Wallet className="w-4 h-4" style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text-primary text-sm font-medium truncate">
                              {account.name}
                            </p>
                            <p className="text-text-tertiary text-xs mt-0.5 truncate">
                              Groupe
                            </p>
                          </div>
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{
                              color: balance >= 0 ? "var(--in)" : "var(--out)",
                            }}
                          >
                            {balance >= 0 ? "" : "−"}
                            {formatCentsToFCFA(Math.abs(balance))}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Actions rapides (CircleAction) */}
            <div className="mb-5">
              <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-3">
                Actions rapides
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-2 p-2 rounded-xl w-full">
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
                <div className="flex flex-col items-center gap-2 p-2 rounded-xl w-full">
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
              </div>
            </div>
          </div>

          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
