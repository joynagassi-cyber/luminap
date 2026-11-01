import { CheckCircle2, AlertTriangle, XCircle, Activity, Copy, Check, RefreshCw, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import SettingsShell from "@/components/SettingsShell";
import {
  useHealthSnapshot,
  buildDiagnosticReport,
  collectHealthInputs,
  HEALTH_LEVEL_LABEL,
} from "@/lib/health";
import type { HealthLevel } from "@/lib/health";
import { getRecentErrors, captureClientError } from "@/lib/clientErrors";
import {
  sendProblemReport,
  getLastProblemReport,
} from "@/lib/reportProblem";
import type { ProblemReport } from "@/lib/reportProblem";
import { performLocalRecovery } from "@/lib/localRecovery";
import {
  getUsageStats,
  clearUsageStats,
  isValidFeatureId,
} from "@/lib/usageStats";
import type { UsageStats } from "@/lib/usageStats";
import { disconnectPowerSync } from "@/lib/powersync";
import { deleteAllLocalData } from "@/lib/dataLayer";
import { resetOrganizationId } from "@/lib/orgContext";
import { showSuccess, showError } from "@/utils/toast";

const LEVEL_ICON: Record<HealthLevel, LucideIcon> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
};

const LEVEL_COLOR: Record<HealthLevel, string> = {
  ok: "var(--data-income, #22c55e)",
  warn: "#f59e0b",
  error: "var(--data-expense, #ef4444)",
};

const LEVEL_LABEL: Record<HealthLevel, string> = HEALTH_LEVEL_LABEL;

/** Libellés FR lisibles pour les identifiants de fonctionnalité suivis. */
const USAGE_LABELS: Record<string, string> = {
  "screen:dashboard": "Accueil",
  "screen:finance": "Finances",
  "screen:members": "Membres",
  "screen:groups": "Groupes",
  "screen:events": "Événements",
  "screen:reports": "Rapports",
  "screen:balance": "Bilan",
  "screen:budgets": "Budgets",
  "screen:giving": "Dons & campagnes",
  "screen:trace": "Trace",
  "screen:help": "Aide",
  "screen:settings": "Paramètres",
  "action:export-json": "Export JSON",
  "action:export-csv": "Export CSV",
};

/** Libellé affiché d'un identifiant : nom FR connu, sinon l'identifiant brut. */
function usageLabel(featureId: string): string {
  return USAGE_LABELS[featureId] ?? featureId;
}

/**
 * Page « État du système » (Phase 11, proposition PR4).
 * Affiche version, plateforme, réseau, synchronisation, organisation active
 * et dernières erreurs client — sans PII. Sert au support et à l'exploitation
 * autonome : un utilisateur peut décrire l'état réel de son app.
 */
export default function Health() {
  const report = useHealthSnapshot();
  const OverallIcon = LEVEL_ICON[report.overall];
  const [copied, setCopied] = useState(false);
  const [recovering, setRecovering] = useState(false);
  // PR5 — « Signaler un problème » envoie désormais réellement le diagnostic.
  // `reportOpen` affiche la zone de saisie de la note optionnelle ; `sending`
  // verrouille le bouton le temps de l'envoi ; `lastReport` alimente la ligne
  // « dernier signalement » (preuve locale, même sans Sentry).
  const [reportOpen, setReportOpen] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [sending, setSending] = useState(false);
  const [lastReport, setLastReport] = useState<ProblemReport | null>(() =>
    getLastProblemReport(),
  );
  // PR15 — statistiques d'usage locales (compteurs anonymes). Lues à
  // l'ouverture ; remises à zéro par l'utilisateur (jamais automatiquement).
  const [usage, setUsage] = useState<UsageStats>(() => getUsageStats());
  const usageEntries = Object.entries(usage)
    .filter(([id]) => isValidFeatureId(id))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const currentInputs = () =>
    collectHealthInputs(
      typeof navigator !== "undefined" ? navigator.onLine : true,
    );

  // PR5 — envoi réel : Sentry (si DSN configuré) + enregistrement local.
  const submitReport = () => {
    setSending(true);
    try {
      const result = sendProblemReport(
        currentInputs(),
        getRecentErrors(),
        reportNote,
      );
      setLastReport(result.report);
      setReportNote("");
      setReportOpen(false);
      if (result.sentToSentry) {
        showSuccess("Merci ! Votre signalement a été envoyé.");
      } else {
        // Dégradation gracieuse : Sentry non configuré → trace locale seule.
        showSuccess(
          "Signalement enregistré localement (envoi automatique indisponible).",
        );
      }
    } catch (err) {
      showError("Impossible d'envoyer le signalement. Réessayez.");
      // Instrumenté, jamais avalé (règle R88).
      captureClientError(err, { message: "Échec du signalement de problème" });
    } finally {
      setSending(false);
    }
  };

  const copyDiagnostic = async () => {
    const text = buildDiagnosticReport(
      collectHealthInputs(typeof navigator !== "undefined" ? navigator.onLine : true),
      getRecentErrors(),
      new Date().toISOString(),
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Repli : le presse-papiers peut être refusé (permission/ contexte non
      // sécurisé). On expose le texte dans une alerte pour copie manuelle.
      window.prompt("Copiez le diagnostic ci-dessous :", text);
    }
  };

  // PM15 — récupération locale sûre : base locale corrompue/pleine → purge
  // locale + rechargement. Ne touche jamais au cloud ; confirmation obligatoire.
  const runRecovery = async () => {
    const confirmed = window.confirm(
      "Réinitialiser les données locales de cet appareil ?\n\n" +
        "Les données non encore synchronisées peuvent être perdues. " +
        "Les données déjà enregistrées côté serveur seront rechargées. " +
        "Vous resterez connecté.",
    );
    if (!confirmed) return;
    setRecovering(true);
    await performLocalRecovery({
      disconnect: () => disconnectPowerSync(),
      purgeLocalData: () => deleteAllLocalData(),
      resetOrg: () => resetOrganizationId(),
      reload: () => window.location.reload(),
    });
  };

  // PR15 — remise à zéro des compteurs d'usage (action explicite).
  const resetUsage = () => {
    clearUsageStats();
    setUsage({});
  };

  return (
    <SettingsShell
      title="État du système"
      subtitle="Diagnostic de l'application"
    >
      <div
        className="rounded-xl p-4 mb-4 flex items-center gap-3"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        data-testid="health.overall"
        data-health-overall={report.overall}
      >
        <OverallIcon className="w-6 h-6" style={{ color: LEVEL_COLOR[report.overall] }} />
        <div>
          <div className="text-text-primary font-semibold text-sm">
            État général : {LEVEL_LABEL[report.overall]}
          </div>
          <div className="text-text-tertiary text-xs">
            Relevé à {new Date(report.generatedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {report.checks.map((c) => {
          const Icon = LEVEL_ICON[c.level];
          return (
            <div
              key={c.id}
              className="rounded-lg p-3 flex items-start gap-3"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              data-testid={`health.check.${c.id}`}
              data-health-level={c.level}
            >
              <Icon
                className="w-5 h-5 mt-0.5 shrink-0"
                style={{ color: LEVEL_COLOR[c.level] }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-text-primary text-sm font-medium">{c.label}</div>
                <div className="text-text-tertiary text-xs break-words">{c.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PR5 — « Signaler un problème » : ENVOI réel (Sentry + journal local).
          La note est optionnelle ; le diagnostic est joint automatiquement. */}
      <div
        className="mt-4 rounded-xl p-4"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
        data-testid="health.report-block"
      >
        <button
          type="button"
          onClick={() => setReportOpen((v) => !v)}
          aria-expanded={reportOpen}
          aria-label="Signaler un problème"
          data-testid="health.report-problem"
          className="w-full rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
          style={{
            minHeight: 44,
            backgroundColor: "var(--accent-primary)",
            color: "#fff",
          }}
        >
          <Flag className="w-4 h-4" aria-hidden="true" />
          Signaler un problème
        </button>

        {reportOpen && (
          <div className="mt-3">
            <label
              htmlFor="health.report-note"
              className="block text-text-secondary text-xs mb-1"
            >
              Décrivez le problème (facultatif)
            </label>
            <textarea
              id="health.report-note"
              data-testid="health.report-note"
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Ce qui s'est passé, à quel moment…"
              className="w-full rounded-lg p-2 text-sm"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                resize: "vertical",
              }}
            />
            <p className="mt-1 text-text-tertiary text-xs">
              Aucune donnée personnelle n'est transmise : version, plateforme,
              état du système et codes d'erreur uniquement.
            </p>
            <button
              type="button"
              onClick={submitReport}
              disabled={sending}
              aria-label="Envoyer le signalement"
              data-testid="health.report-send"
              className="mt-3 w-full rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
              style={{
                minHeight: 44,
                backgroundColor: "var(--accent-primary)",
                color: "#fff",
                opacity: sending ? 0.6 : 1,
              }}
            >
              <Flag className="w-4 h-4" aria-hidden="true" />
              {sending ? "Envoi…" : "Envoyer le signalement"}
            </button>
          </div>
        )}

        {lastReport && (
          <p
            className="mt-3 text-text-tertiary text-xs"
            data-testid="health.last-report"
          >
            Dernier signalement :{" "}
            {new Date(lastReport.generatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Affordance séparée : copier le diagnostic pour le support. */}
      <button
        type="button"
        onClick={copyDiagnostic}
        aria-label="Copier le diagnostic"
        data-testid="health.copy-diagnostic"
        className="mt-3 w-full rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
        style={{
          minHeight: 44,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      >
        {copied ? (
          <Check className="w-4 h-4" aria-hidden="true" />
        ) : (
          <Copy className="w-4 h-4" aria-hidden="true" />
        )}
        {copied ? "Diagnostic copié" : "Copier le diagnostic"}
      </button>

      <div className="flex items-center gap-2 mt-4 text-text-tertiary text-xs">
        <Activity className="w-4 h-4" aria-hidden="true" />
        <span>Actualisation automatique toutes les 5 s.</span>
      </div>

      {/* PM15 — récupération locale sûre (base locale corrompue/pleine). */}
      <button
        type="button"
        onClick={() => void runRecovery()}
        disabled={recovering}
        aria-label="Réinitialiser les données locales de cet appareil"
        data-testid="health.local-recovery"
        className="mt-4 w-full rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
        style={{
          minHeight: 44,
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--data-expense, #ef4444)",
          opacity: recovering ? 0.6 : 1,
        }}
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        {recovering ? "Réinitialisation…" : "Réinitialiser les données locales"}
      </button>
      <p className="mt-2 text-text-tertiary text-xs">
        En cas de base locale corrompue ou pleine. Les données déjà enregistrées
        côté serveur sont rechargées ; vous restez connecté.
      </p>

      {/* PR15 — Statistiques d'usage ANONYMISÉES (compteurs locaux uniquement).
          Aucune donnée personnelle : ni utilisateur, ni organisation, ni
          contenu — seulement « combien de fois telle fonctionnalité ». */}
      <div
        className="mt-4 rounded-xl p-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        data-testid="health.usage-block"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-text-primary text-sm font-semibold">
            Statistiques d'usage
          </span>
          {usageEntries.length > 0 && (
            <button
              type="button"
              onClick={resetUsage}
              aria-label="Réinitialiser les statistiques d'usage"
              data-testid="health.usage-reset"
              className="rounded-lg px-3 text-xs font-medium"
              style={{
                minHeight: 32,
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>
        <p className="text-text-tertiary text-xs mb-3">
          Compteurs anonymes conservés sur cet appareil : aucune donnée
          personnelle, aucun contenu.
        </p>

        {usageEntries.length === 0 ? (
          <p className="text-text-tertiary text-xs" data-testid="health.usage-empty">
            Aucune activité enregistrée.
          </p>
        ) : (
          <ul className="space-y-1.5" data-testid="health.usage-list">
            {usageEntries.map(([id, count]) => (
              <li
                key={id}
                className="flex items-center justify-between text-sm"
                data-testid={`health.usage.${id}`}
              >
                <span className="text-text-secondary">{usageLabel(id)}</span>
                <span className="text-text-tertiary tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsShell>
  );
}
