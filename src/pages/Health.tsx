import { CheckCircle2, AlertTriangle, XCircle, Activity, Copy, Check } from "lucide-react";
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
import { getRecentErrors } from "@/lib/clientErrors";

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

      <button
        type="button"
        onClick={copyDiagnostic}
        aria-label="Signaler un problème : copier le diagnostic"
        data-testid="health.report-problem"
        className="mt-4 w-full rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
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
        {copied ? "Diagnostic copié" : "Signaler un problème"}
      </button>

      <div className="flex items-center gap-2 mt-4 text-text-tertiary text-xs">
        <Activity className="w-4 h-4" aria-hidden="true" />
        <span>Actualisation automatique toutes les 5 s.</span>
      </div>
    </SettingsShell>
  );
}
