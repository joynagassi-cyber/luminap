/**
 * OrgReportsReceived — page de réception des rapports de gestion
 * inter-organisations (Phase 4 Feature 2 — rapports organisations).
 *
 * Route : `/admin/reports` (montée dans `src/ionic/routes/admin.tsx`).
 *
 * Gating (plan §Phase 4 T4.2) : l'org courante doit être en position
 * de « mère » — soit elle a ≥1 annexe directe (`federation.getOrgChildren`
 * non vide), soit elle a déjà au moins un rapport reçu
 * (`org_reports WHERE to_org_id = current`). Sinon : EmptyState
 * explicite « Aucun rapport reçu pour le moment » (sans masquer la page
 * elle-même — un user sans annexe mais avec un rapport reçu historique
 * doit pouvoir le consulter).
 *
 * Header : titre « Rapports reçus » + badge de compteur (non-lus =
 * `read_at IS NULL`) + 2 filtres (IonSelect annexe émettrice, IonSelect
 * période mensuelle/semestrielle/annuelle).
 *
 * Liste : `useReportsReceived` (PowerSync watch-query) — chaque item =
 * card `rounded-xl bg-surface p-4` avec titre + badge format + période
 * + nom de l'annexe émettrice + statut (badge PENDING/SENT/READ/FAILED)
 * + bouton « Marquer comme lu » si non-lu + bouton « Ouvrir » (navigate
 * vers `/admin/reports/:id` — Phase 4 T4.3).
 *
 * Non-régression : la page n'impacte ni `CentralAdmin.tsx` (le bouton
 * d'émission y reste intact) ni `OrgReportSend.tsx`. Tokens Lumina
 * uniquement (zéro couleur brute). RLS `org_reports_receiver` : la
 * watch-query `WHERE to_org_id = ?` ne renvoie que les lignes dont
 * l'org est destinataire (le stream PowerSync `org_reports` est
 * auto_subscribe:false + WHERE from_org = current OR to_org = current).
 */

import { useEffect, useMemo, useState } from "react";import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonItem,
  IonChangeCustomEvent,
} from "@ionic/react";
import {
  Inbox,
  FileText,
  File,
  Sheet,
  Check,
  ArrowRight,
  Loader2,
  Filter,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import {
  useReportsReceived,
  markReportRead,
  type PSOrgReports,
} from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { federation } from "@/capabilities/federation";
import { computePeriod, type OrgReportPayload } from "@/lib/orgReport";
import { formatDate } from "@/lib/utils";

type PeriodFilter = "all" | "monthly" | "semiannual" | "annual";

/** Badge de statut d'un rapport (PENDING/SENT/READ/FAILED) — tokens Lumina. */
function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    PENDING: "var(--data-pending)",
    SENT: "var(--data-income)",
    READ: "var(--data-income)",
    FAILED: "var(--data-expense)",
  };
  const labelMap: Record<string, string> = {
    PENDING: "En attente",
    SENT: "Envoyé",
    READ: "Lu",
    FAILED: "Échec",
  };
  const color = colorMap[status] ?? "var(--text-tertiary)";
  const label = labelMap[status] ?? status;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
      }}
      aria-label={`Statut : ${label}`}
    >
      {label}
    </span>
  );
}

/** Icône par format de fichier (pdf/docx/xlsx/png). */
function FormatIcon({ format }: { format: string }) {
  const cls = "w-4 h-4";
  const color = "var(--text-secondary)";
  switch (format) {
    case "pdf":
      return <FileText className={cls} style={{ color }} />;
    case "xlsx":
      return <Sheet className={cls} style={{ color }} />;
    case "png":
      return <File className={cls} style={{ color }} />;
    default:
      return <File className={cls} style={{ color }} />;
  }
}

/**
 * Décode les agrégats du rapport (`content` jsonb → text PowerSync) pour
 * afficher un compteur local de transactions dans la card (optionnel).
 * Retours `null` si le JSON est invalide (pas de crash de liste).
 */
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

/**
 * OrgReportsReceived — liste des rapports reçus + filtres + actions.
 */
export default function OrgReportsReceived() {
  const navigate = useNavigate();
  const orgId = getOrganizationId();
  const { data: reports, isLoading, refetch } = useReportsReceived(orgId);

  // Filtres (état local — pas de URL : filtre transitoire de la page).
  const [annexFilter, setAnnexFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");

  // Nom des annexes émettrices (`from_org_id` → `organizations.name`) —
  // `federation.getOrgChildren` ne donne que les enfants de l'org courante,
  // pas les émetteurs : on consulte la table `organizations` (PowerSync)
  // via `federation.getOrg(id)` pour le nom de chaque émetteur distinct.
  const [emitterNames, setEmitterNames] = useState<Record<string, string>>({});

  // Identifiants émetteurs distincts (pour ne requêter que les nouveaux).
  const emitterIds = useMemo(
    () => Array.from(new Set((reports ?? []).map((r) => r.from_org_id))).filter(Boolean),
    [reports],
  );

  // Chargement des noms des émetteurs (cache local — pas de re-fetch si
  // déjà connu). `federation.getOrg` lit la table `organizations` (PowerSync
  // outbox ; le RLS `orgs_select_federation_recursive` donne accès à toute
  // la famille, pas seulement les enfants directs).
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

  // Gating « mère » : l'org a ≥1 annexe (elle reçoit) OU ≥1 rapport reçu.
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

  // Filtrage : annexe émettrice + période (mensuelle/semestrielle/annuelle).
  // Le filtre `period` compare `period_start` à la borne début de la période
  // canonique de `computePeriod` (mensuelle = mois courant, semestrielle =
  // S1/S2 de l'année, annuelle = année courante). `all` = pas de filtre.
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
        // Le rapport couvre la période si sa `period_start` tombe dans la
        // même année/mois/semestre que la période canonique demandée.
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

  // Compteurs (badge du header) : total, non-lus (`read_at IS NULL`).
  const unreadCount = useMemo(
    () => (reports ?? []).filter((r) => !r.read_at).length,
    [reports],
  );

  // Annexe émettrice distinctes (pour le IonSelect de filtre).
  const annexOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of reports ?? []) {
      if (r.from_org_id && !seen.has(r.from_org_id)) {
        seen.set(r.from_org_id, emitterNames[r.from_org_id] ?? r.from_org_id);
      }
    }
    return Array.from(seen.entries());
  }, [reports, emitterNames]);

  // « Marquer comme lu » (idempotent — cf. `markReportRead`).
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
  // (pas de crash, pas de page vide silencieuse).
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
        <IonContent className="bg-canvas">
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
      <IonContent className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="Rapports reçus" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc space-y-4">
            {/* Header : badge de compteur + filtres */}
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Inbox className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                <span className="text-text-primary font-semibold text-sm">
                  {reports?.length ?? 0} rapport{(reports?.length ?? 0) > 1 ? "s" : ""} reçu{(reports?.length ?? 0) > 1 ? "s" : ""}
                </span>
                {unreadCount > 0 && (
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
                      color: "var(--accent-primary)",
                    }}
                    aria-label={`${unreadCount} rapport(s) non-lu(s)`}
                  >
                    {unreadCount} non-lu{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Filtres : annexe émettrice + période */}
              <div className="space-y-2">
                {annexOptions.length > 1 && (
                  <div className="flex items-center gap-2">
                    <IonLabel className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      Annexe
                    </IonLabel>
                    <IonSelect
                      data-testid="report-filter-annex"
                      value={annexFilter}
                      onIonChange={(e: IonChangeCustomEvent<string>) =>
                        setAnnexFilter(e.detail.value)
                      }
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
                        <IonSelectOption key={id} value={id}>
                          {name}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                  <IonSelect
                    data-testid="report-filter-period"
                    value={periodFilter}
                    onIonChange={(e: IonChangeCustomEvent<PeriodFilter>) =>
                      setPeriodFilter(e.detail.value)
                    }
                    interface="popover"
                    style={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      fontSize: "0.85rem",
                    }}
                    aria-label="Filtrer par période"
                  >
                    <IonSelectOption value="all">Toutes les périodes</IonSelectOption>
                    <IonSelectOption value="monthly">
                      Période mensuelle ({computePeriod("monthly").label})
                    </IonSelectOption>
                    <IonSelectOption value="semiannual">
                      Période semestrielle ({computePeriod("semiannual").label})
                    </IonSelectOption>
                    <IonSelectOption value="annual">
                      Période annuelle ({computePeriod("annual").label})
                    </IonSelectOption>
                  </IonSelect>
                </div>
              </div>
            </div>

            {/* Liste des rapports (filtrée) */}
            {isLoading && (
              <div className="rounded-xl p-8 text-center animate-pulse" style={{ backgroundColor: "var(--surface)" }}>
                <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  Chargement des rapports...
                </p>
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

            {/* Footer : « Voir tous les rapports » (optionnel si filtré) */}
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

/**
 * Card d'un rapport reçu (titre + badge format + période + émetteur +
 * statut + actions). `rounded-xl bg-surface p-4` — tokens Lumina.
 */
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
    <article
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      aria-label={`Rapport ${report.title} de ${emitterName}`}
    >
      {/* Titre + icône format + statut */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-primary) 10%, transparent)",
          }}
        >
          <FormatIcon format={report.format} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {report.title}
            </h3>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>
            De <strong style={{ color: "var(--text-secondary)" }}>{emitterName}</strong> · {periodLabel}
          </p>

          {/* Compteurs d'agrégats (si `content` jsonb valide) */}
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
              color: "var(--data-pending)",
              border: "1px solid var(--data-pending)",
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
