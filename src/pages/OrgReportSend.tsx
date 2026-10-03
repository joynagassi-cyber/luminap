/**
 * OrgReportSend — page d'émission du rapport de gestion inter-organisations
 * (Phase 3 Feature 2 — rapports organisations).
 *
 * Gating : visible uniquement si l'org courante a une MÈRE
 * (`federation.getOrgParent(currentOrgId)` non nul) — une org racine affiche
 * un message explicite (« pas de mère — racine »), pas de formulaire.
 *
 * Formulaire (grammaire ionique canonique : IonItem lines="none" bg-card
 * rounded-xl + IonLabel position="floating" + IonSelect slot="input",
 * pattern Versement.tsx L212-227) :
 *  - IonSelect période  : mensuelle / semestrielle / annuelle
 *  - IonSelect format   : PDF / DOCX / XLSX / PNG
 *  - DocumentPicker     : documents uploadés joints → `document_refs`
 *
 * Bouton « Générer et envoyer » (offline-first) :
 *  1. `buildOrgReport` depuis les données locales (useTransactions +
 *     useEvents + useMembers + useDocuments — SQLite PowerSync 100 % local).
 *  2. `exportOrgReport(payload, format)` → Blob (pdf/docx/xlsx/png).
 *  3. `uploadReportFile(blob → File, { from_org_id, period_start, format })`
 *     → `pdf_path` (bucket privé `org_reports`, idempotent via `upsert:true`
 *     + clé UNIQUE de la table `org_reports`).
 *  4. INSERT local PowerSync sur `org_reports` (`status: "PENDING"`,
 *     `content` = JSON.stringify(payload), `document_refs`, `created_by`)
 *     — outbox : l'INSERT est écrit dans le SQLite local et poussé au
 *     serveur au retour de connexion ; le RLS `org_reports_emitter`
 *     (fonction `current_org_id()`) ré-applique l'accès côté serveur.
 *  5. Historique local (PENDING/READ) + option « Marquer comme lu ».
 *
 * Route : `/admin/report-send` (montée dans `src/ionic/routes/admin.tsx`).
 * Les montants des transactions PowerSync sont en CENTIMES (convention du
 * projet) — agrégés tels quels par `buildOrgReport` et formatés par
 * `exportOrgReport` via `formatCurrencyCompact` (÷100).
 */

import { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonChangeCustomEvent,
} from "@ionic/react";
import {
  Send,
  FileText,
  File,
  Check,
  Loader2,
  Network,
  Inbox,
} from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import DocumentPicker from "@/components/DocumentPicker";
import {
  useCurrentUser,
  executeWrite,
} from "@/lib/dataLayer";
import { getPowerSyncDatabase } from "@/lib/powersync";
import { getOrganizationId } from "@/lib/orgContext";
import { federation, type FederationOrg } from "@/capabilities/federation";
import { buildOrgReport, computePeriod } from "@/lib/orgReport";
import { exportOrgReport, type OrgReportFormat } from "@/lib/export";
import { uploadReportFile } from "@/lib/storageService";
import { formatDate } from "@/lib/utils";

type PeriodKind = "monthly" | "semiannual" | "annual";

const PERIOD_LABELS: Record<PeriodKind, string> = {
  monthly: "Mensuelle",
  semiannual: "Semestrielle",
  annual: "Annuelle",
};

const FORMAT_LABELS: Record<OrgReportFormat, string> = {
  pdf: "PDF",
  docx: "Word (DOCX)",
  xlsx: "Excel (XLSX)",
  png: "Image (PNG)",
};

const MIME_BY_FORMAT: Record<OrgReportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  png: "image/png",
};

/** Vue locale d'un rapport émis (table `org_reports`, PowerSync outbox). */
interface SentReportLocal {
  id: string;
  status: string;
  title: string;
  period_start: string;
  period_end: string;
  format: string;
  created_at: string;
}

export default function OrgReportSend() {
  const user = useCurrentUser();
  const orgId = getOrganizationId();

  const [parent, setParent] = useState<FederationOrg | null>(null);
  const [parentChecked, setParentChecked] = useState(false);

  const [periodKind, setPeriodKind] = useState<PeriodKind>("monthly");
  const [format, setFormat] = useState<OrgReportFormat>("pdf");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [docRefresh, setDocRefresh] = useState(0);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sentReports, setSentReports] = useState<SentReportLocal[]>([]);

  const period = computePeriod(periodKind);

  // Chargement du gating (mère de l'org courante) + historique local.
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await federation.getOrgParent(orgId);
        if (cancelled) return;
        setParent(p);
      } catch {
        if (cancelled) return;
      } finally {
        if (!cancelled) setParentChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // Historique local des rapports émis (PowerSync `org_reports`).
  const refreshHistory = async () => {
    try {
      const db = getPowerSyncDatabase();
      const res = await db.execute(
        `SELECT id, status, title, period_start, period_end, format, created_at
         FROM org_reports WHERE from_org_id = ? ORDER BY created_at DESC LIMIT 10`,
        [orgId],
      );
      setSentReports(((res?.array ?? []) as any[]).map((r) => ({
        id: String(r.id),
        status: String(r.status),
        title: String(r.title),
        period_start: String(r.period_start),
        period_end: String(r.period_end),
        format: String(r.format),
        created_at: String(r.created_at),
      })));
    } catch {
      setSentReports([]);
    }
  };

  useEffect(() => {
    refreshHistory();
  }, [orgId, success]);

  // ── Gating : pas de mère → message explicite, pas de formulaire ────────
  if (parentChecked && !parent) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/admin" />
            </IonButtons>
            <IonTitle>Envoyer un rapport</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="bg-canvas">
          <div className="min-h-dvh">
            <TopHeader title="Envoyer un rapport" />
            <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
              <div
                className="rounded-xl p-5 text-center"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <Network className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-text-primary font-semibold mb-1">
                  Cette organisation n'a pas de mère — elle est racine.
                </p>
                <p className="text-text-tertiary text-sm leading-relaxed">
                  Un rapport de gestion est envoyé par une annexe à son
                  organisation parente. Cette organisation étant racine de la
                  fédération, il n'y a pas de destinataire : elle ne peut que
                  recevoir des rapports de ses annexes.
                </p>
              </div>
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const handleSend = async () => {
    if (!user?.id || !parent) return;
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      // 1. Composition locale (pure) depuis les données PowerSync de l'org.
      //    Les hooks `use*` lisent l'org courante (getOrganizationId) :
      //    ici on utilise directement le DB local pour rester découplé du
      //    cycle de rendu (la page est la seule consommatrice de l'émission).
      const db = getPowerSyncDatabase();
      const txRes = await db.execute(
        `SELECT id, date, type, amount, person_name, source, event_id
         FROM transactions WHERE org_id = ?`,
        [orgId],
      );
      const eventsRes = await db.execute(
        `SELECT id, name, status, start_date, end_date, budget FROM events WHERE org_id = ?`,
        [orgId],
      );
      const membersRes = await db.execute(
        `SELECT id, first_name, last_name FROM members WHERE org_id = ?`,
        [orgId],
      );
      const docsRes = await db.execute(
        `SELECT id, title, purpose, mime_type FROM documents WHERE org_id = ? AND status != 'DELETED'`,
        [orgId],
      );
      const toRows = (res: Awaited<ReturnType<typeof db.execute>>) =>
        (res?.array ?? []) as any[];

      const payload = buildOrgReport({
        fromOrg: { id: orgId, name: user.org?.name ?? orgId },
        toOrg: { id: parent.id, name: parent.name },
        period,
        transactions: toRows(txRes),
        events: toRows(eventsRes),
        members: toRows(membersRes),
        documents: toRows(docsRes),
        document_refs: selectedDocs,
      });
      const title = `Rapport de gestion ${period.label} — ${user.org?.name ?? orgId}`;

      // 2. Export multi-format (Blob).
      const blob = await exportOrgReport(payload, format);
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error(`Export ${format.toUpperCase()} impossible.`);
      }

      // 3. Upload du fichier dans le bucket privé `org_reports`.
      const file = new File([blob], `rapport-${period.start}-${format}`, {
        type: MIME_BY_FORMAT[format],
      });
      const pdfPath = await uploadReportFile(file, {
        from_org_id: orgId,
        period_start: period.start,
        format,
      });

      // 4. INSERT local PowerSync (outbox — poussé au serveur à la
      //    reconnexion ; RLS `org_reports_emitter` côté serveur).
      const now = new Date().toISOString();
      const reportId = crypto.randomUUID();
      await executeWrite(
        `INSERT INTO org_reports
          (id, from_org_id, to_org_id, period_start, period_end, format,
           title, content, pdf_path, document_refs, status, read_at,
           created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NULL, ?, ?, ?)`,
        [
          reportId,
          orgId,
          parent.id,
          period.start,
          period.end,
          format,
          title,
          JSON.stringify(payload),
          pdfPath,
          JSON.stringify(selectedDocs),
          user.id,
          now,
          now,
        ],
      );

      setSuccess(
        `Rapport « ${title} » (${format.toUpperCase()}) mis en file d'envoi vers ${parent.name}.`,
      );
      setSelectedDocs([]);
      await refreshHistory();
    } catch (e: any) {
      setError(e?.message ?? "Échec de l'envoi du rapport.");
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (reportId: string) => {
    try {
      await executeWrite(
        `UPDATE org_reports SET status = 'READ', read_at = ?, updated_at = ? WHERE id = ? AND from_org_id = ?`,
        [new Date().toISOString(), new Date().toISOString(), reportId, orgId],
      );
      await refreshHistory();
    } catch {
      /* hors ligne ou refus RLS — la poussée ultérieure réglera */
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Envoyer un rapport</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="Envoyer un rapport" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc space-y-4">
            {/* Destinataire (la mère — gating, non modifiable) */}
            {parent && (
              <div
                className="rounded-xl p-4"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--accent-primary) 8%, var(--surface))",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                  <span className="text-text-primary font-semibold text-sm">
                    Destinataire : {parent.name}
                  </span>
                </div>
              </div>
            )}

            {/* Période */}
            <IonItem lines="none" className="bg-card rounded-xl">
              <IonLabel position="floating" className="text-sm text-text-secondary">
                Période du rapport
              </IonLabel>
              <IonSelect
                data-testid="report-period"
                value={periodKind}
                onIonChange={(e: IonChangeCustomEvent<PeriodKind>) => setPeriodKind(e.detail.value)}
                interface="popover"
                slot="input"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                {(Object.keys(PERIOD_LABELS) as PeriodKind[]).map((k) => (
                  <IonSelectOption key={k} value={k}>
                    {PERIOD_LABELS[k]} ({computePeriod(k).label})
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* Format */}
            <IonItem lines="none" className="bg-card rounded-xl">
              <IonLabel position="floating" className="text-sm text-text-secondary">
                Format du fichier
              </IonLabel>
              <IonSelect
                data-testid="report-format"
                value={format}
                onIonChange={(e: IonChangeCustomEvent<OrgReportFormat>) => setFormat(e.detail.value)}
                interface="popover"
                slot="input"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                {(Object.keys(FORMAT_LABELS) as OrgReportFormat[]).map((f) => (
                  <IonSelectOption key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>

            {/* Documents joints (picker des documents uploadés) */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <DocumentPicker
                selectedIds={selectedDocs}
                onChange={setSelectedDocs}
                refreshKey={docRefresh}
                onUploaded={() => setDocRefresh((k) => k + 1)}
              />
            </div>

            {/* Bouton d'envoi */}
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-full font-semibold text-on-accent text-sm transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: "var(--accent-primary)" }}
              aria-label="Générer et envoyer le rapport"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Génération...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Générer et envoyer
                </>
              )}
            </button>

            {/* Succès */}
            {success && (
              <div
                className="rounded-xl p-3 text-sm"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--data-income) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--data-income) 25%, transparent)",
                  color: "var(--data-income)",
                }}
              >
                {success}
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div
                className="rounded-xl p-3 text-sm"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--data-expense) 25%, transparent)",
                  color: "var(--data-expense)",
                }}
              >
                {error}
              </div>
            )}

            {/* Historique local des rapports émis */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Inbox className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                <span className="text-text-primary font-semibold text-sm">
                  Rapports envoyés (récent)
                </span>
              </div>
              {sentReports.length === 0 ? (
                <p className="text-text-tertiary text-sm">
                  Aucun rapport envoyé pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {sentReports.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">
                          {r.title}
                        </p>
                        <p className="text-text-tertiary text-xs truncate">
                          {formatDate(r.period_start)} → {formatDate(r.period_end)} ·{" "}
                          {r.format.toUpperCase()}
                        </p>
                      </div>
                      {r.status === "PENDING" ? (
                        <button
                          type="button"
                          onClick={() => markAsRead(r.id)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold transition-all active:scale-95"
                          style={{
                            color: "var(--data-pending)",
                            border: "1px solid var(--data-pending)",
                            background: "transparent",
                          }}
                          aria-label={`Marquer comme lu : ${r.title}`}
                        >
                          <Check className="w-3 h-3" /> Marquer comme lu
                        </button>
                      ) : (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--data-income) 12%, transparent)",
                            color: "var(--data-income)",
                          }}
                        >
                          {r.status === "READ" ? "Lu" : r.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-text-tertiary leading-snug">
              Génération 100 % locale (données PowerSync). L'envoi passe par
              l'outbox et est poussé au serveur au retour de connexion.
              Les documents joints sont référencés via{" "}
              <code className="text-text-secondary">document_refs</code>.
            </p>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
