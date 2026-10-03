/**
 * OrgReportDetail — page de détail d'un rapport de gestion inter-organisations
 * (Phase 4 Feature 2 — rapports organisations).
 *
 * Route : `/admin/reports/:id` (montée dans `src/ionic/routes/admin.tsx`).
 *
 * Lecture : `org_reports WHERE id = ?` (PowerSync watch-query) +
 * `organizations WHERE id = ?` (nom de l'annexe émettrice).
 *
 * Header : titre du rapport + badge format + période + annoter `read_at`
 * (marque lu à l'ouverture — `executeWrite` UPDATE `read_at = now(),
 * status = 'READ' WHERE id = ? AND read_at IS NULL` — idempotent si déjà
 * lu).
 *
 * Section `content` (jsonb) : rendu des agrégats du rapport
 * (`totalIncome` / `totalExpense` / `netResult` + compteurs
 * `eventCount` / `memberCount` / `documentCount`) — cards grid 2×2.
 *
 * Preview du fichier (`pdf_path`) : selon `format` :
 *  - `pdf`  → `<PdfPreview>` (react-pdf canvas, zoom 0.5–2.0, pagination,
 *              download via `getReportUrl`) ;
 *  - `docx` → bouton « Télécharger » (URL signée) + notice « Aperçu non
 *              disponible pour DOCX — téléchargez pour consulter dans Word » ;
 *  - `xlsx` → bouton « Télécharger » (URL signée) + notice « Aperçu non
 *              disponible pour XLSX — téléchargez pour consulter dans
 *              Excel » ;
 *  - `png`  → `<img src={getReportUrl(pdfPath)}>` (canvas render +
 *              toDataURL, rendu natif).
 *
 * Liste des documents joints (`document_refs`) : `useDocuments()` +
 * filtre local sur les ids + `getDocumentUrl` pour chaque → cards
 * miniatures (titre + icône par `mime_type`).
 *
 * Bouton « Partager » : `navigator.share` (Web Share API) sur l'URL
 * signée du rapport (si `pdf_path`) ou le contenu JSON (si pas de
 * fichier) — fallback `navigator.clipboard` si `share` est absent.
 *
 * Tokens Lumina uniquement (zéro couleur brute). Non-régression : la
 * page n'impacte ni `CentralAdmin.tsx` ni `OrgReportSend.tsx` (le
 * bouton d'émission y reste intact). RLS `org_reports_receiver` : la
 * lecture `WHERE id = ?` passe par la policy (l'org ne voit que ce qui
 * lui est destiné).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
} from "@ionic/react";
import {
  FileText,
  File,
  Sheet,
  Download,
  Share,
  Loader2,
  Inbox,
  Paperclip,
  WifiOff,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import {
  getPowerSyncDatabase,
} from "@/lib/powersync";
import {
  useDocuments,
  markReportRead,
  type PSDocument,
} from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { federation } from "@/capabilities/federation";
import { getReportUrl, getDocumentUrl } from "@/lib/storageService";
import { formatCurrencyCompact, formatDate } from "@/lib/utils";
import PdfPreview from "@/components/PdfPreview";

/** Vue locale d'un rapport `org_reports` (PowerSync — snake_case). */
interface OrgReportRow {
  id: string;
  from_org_id: string;
  to_org_id: string;
  period_start: string;
  period_end: string;
  format: string;
  title: string;
  content: string;
  pdf_path: string | null;
  document_refs: string;
  status: string;
  read_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Agrégats du rapport (`content` jsonb → text PowerSync). */
interface ReportSummary {
  totalIncome: number;
  totalExpense: number;
  netResult: number;
  eventCount: number;
  memberCount: number;
  documentCount: number;
}

/** Icône par format de fichier (pdf/docx/xlsx/png). */
function FormatIcon({ format, className = "w-4 h-4" }: { format: string; className?: string }) {
  const color = "var(--text-secondary)";
  switch (format) {
    case "pdf":
      return <FileText className={className} style={{ color }} />;
    case "xlsx":
      return <Sheet className={className} style={{ color }} />;
    case "png":
      return <ImageIcon className={className} style={{ color }} />;
    case "docx":
      return <File className={className} style={{ color }} />;
    default:
      return <File className={className} style={{ color }} />;
  }
}

/**
 * Décode les agrégats du rapport (`content` jsonb → text PowerSync).
 * Retours `null` si le JSON est invalide (pas de crash de page).
 */
function parseSummary(content: string): ReportSummary | null {
  if (!content) return null;
  try {
    const obj = JSON.parse(content) as {
      summary?: Partial<ReportSummary>;
    };
    const s = obj?.summary ?? {};
    return {
      totalIncome: Number(s.totalIncome) || 0,
      totalExpense: Number(s.totalExpense) || 0,
      netResult: Number(s.netResult) || 0,
      eventCount: Number(s.eventCount) || 0,
      memberCount: Number(s.memberCount) || 0,
      documentCount: Number(s.documentCount) || 0,
    };
  } catch {
    return null;
  }
}

/** Décode `document_refs` (text[] PG → JSON stringifié PowerSync). */
function parseDocumentRefs(raw: string): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * OrgReportDetail — page de détail d'un rapport reçu.
 */
export default function OrgReportDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgId = getOrganizationId();

  const [report, setReport] = useState<OrgReportRow | null>(null);
  const [emitterName, setEmitterName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "shared" | "copied" | "error">("idle");
  const [markedRead, setMarkedRead] = useState(false);

  // Chargement du rapport + nom de l'annexe émettrice (`organizations`).
  const loadReport = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const db = getPowerSyncDatabase();
      const res = await db.execute(
        `SELECT id, from_org_id, to_org_id, period_start, period_end, format,
                title, content, pdf_path, document_refs, status, read_at,
                created_by, created_at, updated_at
         FROM org_reports WHERE id = ?`,
        [id],
      );
      const row = (res?.array ?? [])[0] as any;
      if (!row) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const parsed: OrgReportRow = {
        id: String(row.id),
        from_org_id: String(row.from_org_id),
        to_org_id: String(row.to_org_id),
        period_start: String(row.period_start),
        period_end: String(row.period_end),
        format: String(row.format),
        title: String(row.title),
        content: String(row.content ?? "{}"),
        pdf_path: row.pdf_path ? String(row.pdf_path) : null,
        document_refs: String(row.document_refs ?? "[]"),
        status: String(row.status),
        read_at: row.read_at ? String(row.read_at) : null,
        created_by: row.created_by ? String(row.created_by) : null,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
      };
      setReport(parsed);

      // Nom de l'annexe émettrice (PowerSync `organizations`).
      try {
        const org = await federation.getOrg(parsed.from_org_id);
        if (org) setEmitterName(org.name);
      } catch {
        /* org introuvable — le nom est masqué (id affiché) */
      }

      // Marquer lu à l'ouverture (idempotent — cf. `markReportRead`).
      if (!parsed.read_at && orgId) {
        try {
          await markReportRead(parsed.id);
          setMarkedRead(true);
        } catch {
          /* hors-ligne — la poussée ultérieure réglera */
        }
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, orgId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = useMemo(() => parseSummary(report?.content ?? ""), [report?.content]);
  const docRefs = useMemo(
    () => parseDocumentRefs(report?.document_refs ?? ""),
    [report?.document_refs],
  );

  // Documents joints (`useDocuments` + filtre local sur les ids).
  const { data: allDocs } = useDocuments();
  const joinedDocs = useMemo<PSDocument[]>(() => {
    if (!report || docRefs.length === 0) return [];
    const refSet = new Set(docRefs);
    return (allDocs ?? []).filter((d) => refSet.has(d.id));
  }, [allDocs, docRefs, report]);

  // Gating : le rapport doit exister et appartenir à l'org courante
  // (RLS `org_reports_receiver` — la watch-query ne renvoie que ce qui
  // est destiné à l'org ; ici on double-check côté client si `to_org_id`).
  const isAuthorized =
    report && orgId && report.to_org_id === orgId;

  // Chargement → EmptyState (loading ou not-found).
  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/reports" />
            </IonButtons>
            <IonTitle>Rapport</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="bg-canvas">
          <div className="min-h-dvh flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (notFound || !isAuthorized || !report) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin/reports" />
            </IonButtons>
            <IonTitle>Rapport</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="bg-canvas">
          <div className="min-h-dvh">
            <TopHeader title="Rapport introuvable" />
            <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
              <EmptyState
                icon={<Inbox className="w-8 h-8" />}
                title="Rapport introuvable"
                description="Ce rapport n'existe pas ou vous n'êtes pas autorisé à le consulter (RLS). Revenez à la liste des rapports reçus."
                actionLabel="Retour aux rapports"
                onAction={() => navigate("/admin/reports")}
              />
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const fileName = report.title
    ? `${report.title}.${report.format}`
    : `rapport-${report.period_start}-${report.format}`;

  // Bouton « Partager » (Web Share API ou fallback clipboard).
  const handleShare = async () => {
    if (!report) return;
    setShareState("idle");
    try {
      let shareUrl: string | null = null;
      if (report.pdf_path) {
        shareUrl = await getReportUrl(report.pdf_path);
      }
      if (shareUrl && typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: report.title,
          text: `Rapport de gestion ${report.period_start} → ${report.period_end} (${report.format.toUpperCase()})`,
          url: shareUrl,
        });
        setShareState("shared");
        return;
      }
      // Fallback : copier l'URL signée ou le contenu JSON.
      const payload = shareUrl ?? report.content;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
        setShareState("copied");
        return;
      }
      setShareState("error");
    } catch (e: unknown) {
      // `AbortError` = l'utilisateur a annulé le partage — pas une erreur.
      if (e instanceof Error && e.name === "AbortError") {
        setShareState("idle");
        return;
      }
      setShareState("error");
    }
  };

  const previewSection = <ReportFilePreview report={report} fileName={fileName} />;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin/reports" />
          </IonButtons>
          <IonTitle>Rapport reçu</IonTitle>
          <IonButtons slot="end">
            <button
              type="button"
              onClick={handleShare}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                backgroundColor: "var(--surface)",
              }}
              aria-label="Partager le rapport"
            >
              <Share className="w-4 h-4" />
            </button>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="Rapport reçu" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc space-y-4">
            {/* Header : titre + badge format + période + émetteur + statut lu */}
            <div
              className="rounded-xl p-4"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--accent-primary) 10%, transparent)",
                  }}
                >
                  <FormatIcon format={report.format} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {report.title}
                  </h2>
                  <p className="text-xs mt-1 truncate" style={{ color: "var(--text-tertiary)" }}>
                    De <strong style={{ color: "var(--text-secondary)" }}>{emitterName ?? report.from_org_id}</strong> ·{" "}
                    {formatDate(report.period_start)} → {formatDate(report.period_end)} ·{" "}
                    <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                      {report.format.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
              {markedRead && report.read_at && (
                <div
                  className="mt-3 flex items-center gap-2 text-xs rounded-lg p-2"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--data-income) 10%, transparent)",
                    color: "var(--data-income)",
                  }}
                  role="status"
                >
                  <Check className="w-3.5 h-3.5" />
                  Marqué comme lu le {formatDate(report.read_at)}
                </div>
              )}
            </div>

            {/* Section agrégats (cards grid 2×2) */}
            {summary && <ReportSummaryCards summary={summary} />}

            {/* Preview du fichier (selon `format`) */}
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                Aperçu du fichier
              </h3>
              {previewSection}
            </div>

            {/* Liste des documents joints */}
            {docRefs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                  Documents joints ({docRefs.length})
                </h3>
                {joinedDocs.length === 0 ? (
                  <div
                    className="rounded-xl p-4 flex items-center gap-2"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Paperclip className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {docRefs.length} document(s) référencé(s), non présent(s)
                      dans le cache local (hors-ligne ?).
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {joinedDocs.map((d) => (
                      <JoinedDocCard key={d.id} doc={d} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bouton « Partager » (fallback sous le header) */}
            <button
              type="button"
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-full font-semibold text-sm transition-all active:scale-95"
              style={{
                color: "var(--on-accent)",
                backgroundColor: "var(--accent-primary)",
              }}
              aria-label="Partager le rapport"
            >
              <Share className="w-4 h-4" />
              {shareState === "shared"
                ? "Partagé"
                : shareState === "copied"
                  ? "Copié dans le presse-papier"
                  : shareState === "error"
                    ? "Partage impossible — URL copiée"
                    : "Partager le rapport"}
            </button>

            {/* Notice RLS (contexte sécurité) */}
            <p className="text-xs text-center leading-snug" style={{ color: "var(--text-tertiary)" }}>
              Accès contrôlé par RLS (`org_reports_receiver`) — seule cette
              organisation peut consulter ce rapport. Les URLs sont signées
              (30 min) et ne sont jamais publiques.
            </p>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}

/**
 * Cards grid 2×2 des agrégats du rapport (`totalIncome` / `totalExpense` /
 * `netResult` / compteurs). Tokens Lumina uniquement.
 */
function ReportSummaryCards({ summary }: { summary: ReportSummary }) {
  const netPositive = summary.netResult >= 0;
  const netColor = netPositive ? "var(--data-income)" : "var(--data-expense)";
  const cellStyle = {
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border)",
  } as const;
  return (
    <div className="grid grid-cols-2 gap-2">
      <SummaryCard label="Revenus" value={formatCurrencyCompact(summary.totalIncome)} color="var(--data-income)" />
      <SummaryCard label="Dépenses" value={formatCurrencyCompact(summary.totalExpense)} color="var(--data-expense)" />
      <SummaryCard label="Résultat net" value={formatCurrencyCompact(summary.netResult)} color={netColor} />
      <div
        className="rounded-xl p-3"
        style={cellStyle}
      >
        <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
          Compteurs
        </p>
        <p className="text-sm font-semibold tabular-nums mt-1" style={{ color: "var(--text-primary)" }}>
          {summary.eventCount} év. · {summary.memberCount} m. · {summary.documentCount} doc.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <p
        className="text-lg font-bold tabular-nums mt-1"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Preview du fichier selon le `format` du rapport :
 *  - `pdf`  → `<PdfPreview>` (canvas react-pdf) ;
 *  - `docx` / `xlsx` → bouton « Télécharger » (URL signée) + notice ;
 *  - `png`  → `<img>` (URL signée) ;
 *  - sans `pdf_path` → notice « Aucun fichier joint ».
 */
function ReportFilePreview({
  report,
  fileName,
}: {
  report: OrgReportRow;
  fileName: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUrl = useCallback(() => {
    if (!report.pdf_path) return;
    setLoading(true);
    setError(null);
    getReportUrl(report.pdf_path)
      .then((signed) => setUrl(signed))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "URL signée impossible."),
      )
      .finally(() => setLoading(false));
  }, [report.pdf_path]);

  useEffect(() => {
    loadUrl();
  }, [loadUrl]);

  const handleDownload = async () => {
    if (!url || !report.pdf_path) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      /* hors-ligne ou CORS */
    }
  };

  // Pas de fichier joint → notice.
  if (!report.pdf_path) {
    return (
      <div
        className="rounded-xl p-6 flex flex-col items-center gap-2 text-center"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <WifiOff className="w-6 h-6" style={{ color: "var(--text-tertiary)" }} />
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>
          Aucun fichier joint à ce rapport.
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Les agrégats ci-dessus restent consultables.
        </p>
      </div>
    );
  }

  const noticeByFormat: Record<string, string> = {
    docx: "Aperçu non disponible pour DOCX — téléchargez pour consulter dans Word.",
    xlsx: "Aperçu non disponible pour XLSX — téléchargez pour consulter dans Excel.",
  };

  return (
    <div className="space-y-3">
      {report.format === "pdf" && (
        <PdfPreview src={report.pdf_path} height={480} fileName={fileName} />
      )}

      {report.format === "png" && (
        <div
          className="rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            minHeight: 200,
          }}
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
          ) : error ? (
            <p className="text-sm p-4" style={{ color: "var(--text-tertiary)" }}>
              {error}
            </p>
          ) : url ? (
            <img
              src={url}
              alt={fileName}
              className="max-w-full h-auto"
              style={{ maxHeight: 480 }}
            />
          ) : null}
        </div>
      )}

      {(report.format === "docx" || report.format === "xlsx") && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {noticeByFormat[report.format]}
          </p>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || !url}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{
              color: "var(--on-accent)",
              backgroundColor: "var(--accent-primary)",
            }}
            aria-label={`Télécharger ${fileName}`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Télécharger {fileName}
          </button>
          {error && (
            <p className="text-xs" style={{ color: "var(--data-expense)" }}>
              {error}
            </p>
          )}
        </div>
      )}

      {/* Bouton download secondaire pour PDF/PNG (si le preview est présent) */}
      {(report.format === "pdf" || report.format === "png") && url && (
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-full text-xs font-medium transition-all active:scale-95"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--surface)",
          }}
          aria-label={`Télécharger ${fileName}`}
        >
          <Download className="w-3.5 h-3.5" />
          Télécharger {fileName}
        </button>
      )}
    </div>
  );
}

/**
 * Card miniature d'un document joint (titre + icône par `mime_type` +
 * bouton download via `getDocumentUrl` URL signée).
 */
function JoinedDocCard({ doc }: { doc: PSDocument }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mime = doc.mime_type ?? "";
  const iconColor = "var(--text-secondary)";
  const iconClass = "w-5 h-5";
  const icon = mime.startsWith("image/") ? (
    <ImageIcon className={iconClass} style={{ color: iconColor }} />
  ) : mime === "application/pdf" ? (
    <FileText className={iconClass} style={{ color: iconColor }} />
  ) : (
    <File className={iconClass} style={{ color: iconColor }} />
  );

  const handleDownload = async () => {
    if (!doc.file_path) return;
    setLoading(true);
    try {
      const signed = await getDocumentUrl(doc.bucket as "archives", doc.file_path);
      setUrl(signed);
      // Déclenche le téléchargement (ouverture dans un nouvel onglet /
      // trigger du navigateur mobile).
      window.open(signed, "_blank", "noopener,noreferrer");
    } catch {
      /* hors-ligne — l'URL signée n'a pas pu être obtenue */
    } finally {
      setLoading(false);
    }
  };

  void url; // l'URL est ouverte via window.open ; pas de rendu <a>

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading || !doc.file_path}
      className="rounded-xl p-3 flex flex-col gap-2 text-left transition-all active:scale-95 disabled:opacity-50"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      aria-label={`Télécharger ${doc.title}`}
    >
      <div className="flex items-center gap-2">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-tertiary)" }} />
        ) : (
          icon
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
            {doc.title}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
            {doc.purpose || doc.entity_type || "Document"}
          </p>
        </div>
      </div>
      {doc.file_size != null && doc.file_size > 0 && (
        <p className="text-xs tabular-nums" style={{ color: "var(--text-tertiary)" }}>
          {formatBytes(doc.file_size)}
        </p>
      )}
    </button>
  );
}

/** Formatage d'une taille en octets (Ko/Mo) — utilitaire local. */
function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

// ── Export pour test unitaire / réutilisation ──────────────────────────────
export { parseSummary, parseDocumentRefs, type OrgReportRow, type ReportSummary };
