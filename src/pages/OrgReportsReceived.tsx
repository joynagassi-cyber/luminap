/**
 * OrgReportsReceived v2 — Liste des rapports de gestion reçus.
 *
 * Design : fond sombre, cartes de rapport avec icône de format, badge de
 * statut, compteurs d'agrégats, filtres par annexe et période.
 * Tokens CSS `var(--*)`.
 *
 * Logique métier inchangée : watch-query des rapports reçus, résolution des
 * noms d'émetteurs, gating "mère", filtres, mark as read, navigation détail.
 */

import { useEffect, useMemo, useState } from "react";
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonSelect, IonSelectOption, IonLabel, IonItem } from "@ionic/react";
import {
  Inbox,
  FileText,
  File,
  Sheet,
  Image as ImageIcon,
  Check,
  ArrowRight,
  Loader2,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import Badge from "@/components/Badge";
import { REPORT_BADGES } from "@/lib/badges";
import {
  useReportsReceived,
  markReportRead,
  type PSOrgReports,
} from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { federation } from "@/capabilities/federation";
import { computePeriod, type OrgReportPayload } from "@/lib/orgReport";
import { formatDate } from "@/lib/utils";
import type { IonChangeCustomEvent } from "@/lib/ionic-types";

type PeriodFilter = "all" | "monthly" | "semiannual" | "annual";

function ReportStatusBadge({ status }: { status: string }) {
  return <Badge table={REPORT_BADGES} value={status} />;
}

function FormatIcon({ format, className = "w-4 h-4" }: { format: string; className?: string }) {
  const cls = className;
  const color = "var(--text-secondary)";
  switch (format) {
    case "pdf":
      return <FileText className={cls} style={{ color }} />;
    case "xlsx":
      return <Sheet className={cls} style={{ color }} />;
    case "png":
      return <ImageIcon className={cls} style={{ color }} />;
    default:
      return <File className={cls} style={{ color }} />;
  }
}

function parseContentSummary(
  content: string,
): Pick<OrgReportPayload["summary"], "eventCount" | "memberCount" | "documentCount"> | null {
  if (!content) return null;
  try {
    const obj = JSON.parse(content) as OrgReportPayload;
    return {
      eventCount: obj?.summary?.eventCount ?? 0,
      memberCount: obj?.summary?.memberCount ?? 0,
      documentCount: obj?.summary?.documentCount ?? 0,
    };
  } catch {
    return null;
  }
}

export default function OrgReportsReceived() {
  const navigate = useNavigate();
  const orgId = getOrganizationId();
  const { data: reports, isLoading, refetch } = useReportsReceived(orgId);

  const [annexFilter, setAnnexFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [emitterNames, setEmitterNames] = useState<Record<string, string>>({});

  const emitterIds = useMemo(
    () => Array.from(new Set((reports ?? []).map((r) => r.from_org_id))).filter(Boolean),
    [reports],
  );

  useEffect(() => {
    let cancelled = false;
    const missing = emitterIds.filter((id) => !emitterNames[id]);
    if (missing.length === 0) return;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(
        missing.map(async (id) => {
          try {
            const org = await federation.getOrg(id);
            if (org) results[id] = org.name;
          } catch {
            /* org introuvable — le nom est masqué (id affiché) */
          }
        }),
      );
      if (!cancelled && Object.keys(results).length > 0) {
        setEmitterNames((prev) => ({ ...prev, ...results }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitterIds.join("|")]);

  const [hasAnnex, setHasAnnex] = useState(false);
  const [gatingChecked, setGatingChecked] = useState(false);
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const children = await federation.getOrgChildren(orgId);
        if (!cancelled) setHasAnnex(children.length > 0);
      } catch {
        /* hors-ligne — le gating tombe sur les rapports reçus */
      } finally {
        if (!cancelled) setGatingChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const hasReceived = (reports ?? []).length > 0;
  const showList = hasReceived || hasAnnex;

  const filtered = useMemo(() => {
    const list = reports ?? [];
    if (annexFilter !== "all") {
      const fromSet = new Set(list.filter((r) => r.from_org_id === annexFilter).map((r) => r.from_org_id));
      if (fromSet.size === 0) return [];
    }
    if (periodFilter !== "all") {
      const p = computePeriod(periodFilter);
      return list.filter((r) => {
        const s = String(r.period_start ?? "").slice(0, 10);
        if (periodFilter === "monthly") return s.slice(0, 7) === p.start.slice(0, 7);
        if (periodFilter === "semiannual") {
          const year = p.start.slice(0, 4);
          const month = parseInt(s.slice(5, 7), 10);
          const isH1 = p.start.slice(5, 7) === "01";
          return s.slice(0, 4) === year && (isH1 ? month >= 1 && month <= 6 : month >= 7 && month <= 12);
        }
        return s.slice(0, 4) === p.start.slice(0, 4);
      });
    }
    return list;
  }, [reports, annexFilter, periodFilter]);

  const unreadCount = useMemo(
    () => (reports ?? []).filter((r) => !r.read_at).length,
    [reports],
  );

  const annexOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of reports ?? []) {
      if (r.from_org_id && !seen.has(r.from_org_id)) {
        seen.set(r.from_org_id, emitterNames[r.from_org_id] ?? r.from_org_id);
      }
    }
    return Array.from(seen.entries());
  }, [reports, emitterNames]);

  const [marking, setMarking] = useState<string | null>(null);
  const handleMarkRead = async (reportId: string) => {
    setMarking(reportId);
    try {
      await markReportRead(reportId);
      refetch();
    } catch {
      /* hors-ligne — la poussée ultérieure réglera */
    } finally {
      setMarking(null);
    }
  };

  // Gating non confirmé et aucun rapport reçu → EmptyState explicite
  if (gatingChecked && !showList) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin" />
            </IonButtons>
            <IonTitle>Rapports reçus</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="bg-canvas">
          <h1 className="sr-only">Rapports d'organisation reçus</h1>
          <div className="min-h-dvh">
            <TopHeader title="Rapports reçus" />
            <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
              <EmptyState
                icon={<Inbox className="w-8 h-8" />}
                title="Aucun rapport reçu pour le moment"
                description="Cette organisation n'a pas encore d'annexe émettrice de rapport de gestion. Créez une annexe (section « Mes annexes ») ou attendez l'envoi d'un rapport par une organisation affiliée."
              />
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Rapports reçus</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="bg-canvas">
        <h1 className="sr-only">Rapports d'organisation reçus</h1>
        <div className="min-h-dvh">
          <TopHeader title="Rapports reçus" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc space-y-4">
            {/* Header : badge de compteur + filtres */}
            <div className="rounded-xl p-4" style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}>
              <div className="flex items-center gap-2 mb-3">
                <Inbox className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                <span className="text-text-primary font-semibold text-sm">
                  {reports?.length ?? 0} rapport{(reports?.length ?? 0) > 1 ? "s" : ""} reçu{(reports?.length ?? 0) > 1 ? "s" : ""}
                </span>
                {unreadCount > 0 && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold" style={{
                    backgroundColor: "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
                    color: "var(--accent-primary)",
                  }} aria-label={`${unreadCount} rapport(s) non-lu(s)`}>
                    {unreadCount} non-lu{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Filtres : annexe émettrice + période */}
              <div className="space-y-2">
                {annexOptions.length > 1 && (
                  <div className="flex items-center gap-2">
                    <IonLabel className="text-xs" style={{ color: "var(--text-secondary)" }}>Annexe</IonLabel>
                    <IonSelect
                      data-testid="report-filter-annex"
                      value={annexFilter}
                      onIonChange={(e: IonChangeCustomEvent<string>) => setAnnexFilter(e.detail.value)}
                      interface="popover"
                      style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        fontSize: "0.85rem",
                      }}
                      aria-label="Filtrer par annexe émettrice"
                    >
                      <IonSelectOption value="all">Toutes les annexes</IonSelectOption>
                      {annexOptions.map(([id, name]) => (
                        <IonSelectOption key={id} value={id}>{name}</IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                  <IonSelect
                    data-testid="report-filter-period"
                    value={periodFilter}
                    onIonChange={(e: IonChangeCustomEvent<PeriodFilter>) => setPeriodFilter(e.detail.value)}
                    interface="popover"
                    style={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      fontSize: "0.85rem",
                    }}
                    aria-label="Filtrer par période"
                  >
                    <IonSelectOption value="all">Toutes les périodes</IonSelectOption>
                    <IonSelectOption value="monthly">Période mensuelle ({computePeriod("monthly").label})</IonSelectOption>
                    <IonSelectOption value="semiannual">Période semestrielle ({computePeriod("semiannual").label})</IonSelectOption>
                    <IonSelectOption value="annual">Période annuelle ({computePeriod("annual").label})</IonSelectOption>
                  </IonSelect>
                </div>
              </div>
            </div>

            {/* Liste des rapports (filtrée) */}
            {isLoading && (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--surface)" }}>
                <Loader2 className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Chargement des rapports…</p>
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <EmptyState
                icon={<Inbox className="w-8 h-8" />}
                title="Aucun rapport ne correspond aux filtres"
                description="Ajustez les filtres (annexe, période) ou revenez à « Toutes les annexes / Toutes les périodes » pour afficher l'ensemble des rapports reçus."
              />
            )}

            {!isLoading && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((r) => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    emitterName={emitterNames[r.from_org_id] ?? r.from_org_id}
                    marking={marking === r.id}
                    onMarkRead={() => handleMarkRead(r.id)}
                    onOpen={() => navigate(`/admin/reports/${r.id}`)}
                  />
                ))}
              </div>
            )}

            {(annexFilter !== "all" || periodFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setAnnexFilter("all");
                  setPeriodFilter("all");
                }}
                className="w-full text-center text-xs py-2 rounded-full font-medium transition-all active:scale-95"
                style={{
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface)",
                }}
                aria-label="Réinitialiser les filtres et afficher tous les rapports"
              >
                Voir tous les rapports
              </button>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}

function ReportCard({
  report,
  emitterName,
  marking,
  onMarkRead,
  onOpen,
}: {
  report: PSOrgReports;
  emitterName: string;
  marking: boolean;
  onMarkRead: () => void;
  onOpen: () => void;
}) {
  const unread = !report.read_at;
  const summary = parseContentSummary(report.content);
  const periodLabel = `${formatDate(report.period_start)} → ${formatDate(report.period_end)}`;

  return (
    <article className="rounded-xl p-4" style={{
      backgroundColor: "var(--surface)",
      border: "1px solid var(--border)",
    }} aria-label={`Rapport ${report.title} de ${emitterName}`}>
      {/* Titre + icône format + statut */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg" style={{
          backgroundColor: "color-mix(in srgb, var(--accent-primary) 10%, transparent)",
        }}>
          <FormatIcon format={report.format} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {report.title}
            </h3>
            <ReportStatusBadge status={report.status} />
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
            De <strong style={{ color: "var(--text-secondary)" }}>{emitterName}</strong> · {periodLabel}
          </p>

          {summary && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                {summary.eventCount} événement{summary.eventCount > 1 ? "s" : ""}
              </span>
              <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                {summary.memberCount} membre{summary.memberCount > 1 ? "s" : ""}
              </span>
              <span className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                {summary.documentCount} document{summary.documentCount > 1 ? "s" : ""} joint{summary.documentCount > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions : « Marquer comme lu » (si non-lu) + « Ouvrir */}
      <div className="flex items-center gap-2 mt-3">
        {unread && (
          <button
            type="button"
            onClick={onMarkRead}
            disabled={marking}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{
              color: "var(--warn)",
              border: "1px solid var(--warn)",
              backgroundColor: "transparent",
            }}
            aria-label={`Marquer « ${report.title} » comme lu`}
          >
            {marking ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Marquer comme lu
          </button>
        )}
        <button
          type="button"
          onClick={onOpen}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-all active:scale-95"
          style={{
            color: "var(--on-accent)",
            backgroundColor: "var(--accent-primary)",
          }}
          aria-label={`Ouvrir le rapport ${report.title}`}
        >
          Ouvrir
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </article>
  );
}

// ── Export pour test unitaire / réutilisation ──────────────────────────────
export { parseContentSummary, type PeriodFilter };
