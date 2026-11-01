/**
 * ReportReminderBanner — bannière « Rapport à envoyer » (PR10, Phase 11).
 *
 * Affiche un rappel DISCRET au responsable (admin d'une annexe) quand le rapport
 * de gestion périodique doit être transmis à l'organisation parente. Le rappel
 * est :
 *   - **évalué localement** (aucun cron serveur) au montage de l'écran
 *     d'administration des rapports ;
 *   - **idempotent** : `deliverReportReminder` pose un marqueur journalier
 *     (`lumina-report-reminder-last`) → une seule notification par jour ;
 *   - **non trompeur** : il n'est rendu qu'après la première lecture PowerSync
 *     (`isPowerSyncReadyNow()` + `loaded`) — jamais de verdict « à envoyer »
 *     avant de savoir si un rapport a réellement été envoyé (règle R52) ;
 *   - **dismissible** : la fermeture vaut pour la journée
 *     (`lumina-report-reminder-dismissed`).
 *
 * La livraison réutilise la capacité de notification existante (in-app +
 * push OneSignal, avec le motif « persistance PowerSync échouée → push quand
 * même »). Aucun second système de notification.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, Send, X } from "lucide-react";

import { isPowerSyncReadyNow, useLastSentReport } from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { federation } from "@/capabilities/federation";
import {
  computeReportReminder,
  deliverReportReminder,
  dayKey,
  DEFAULT_CADENCE_DAYS,
} from "@/lib/reportReminders";

/** Clé localStorage de la fermeture du jour (idempotence de l'UI). */
export const REMINDER_DISMISSED_KEY = "lumina-report-reminder-dismissed";

function readDismissed(): string | null {
  try {
    return typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(REMINDER_DISMISSED_KEY);
  } catch {
    return null;
  }
}

function dismissForDay(now: string): void {
  try {
    localStorage?.setItem(REMINDER_DISMISSED_KEY, dayKey(now));
  } catch {
    /* stockage indisponible : la bannière reste affichée */
  }
}

export interface ReportReminderBannerProps {
  /** Organisation évaluée (défaut : org active). */
  orgId?: string;
  /** Cadence en jours (défaut `DEFAULT_CADENCE_DAYS`). */
  cadenceDays?: number;
  /** Action « Envoyer » (défaut : lien vers `/admin/report-send`). */
  onSend?: () => void;
  className?: string;
}

export default function ReportReminderBanner({
  orgId,
  cadenceDays = DEFAULT_CADENCE_DAYS,
  onSend,
  className,
}: ReportReminderBannerProps) {
  const navigate = useNavigate();
  const org = orgId ?? getOrganizationId();
  const { lastSentAt, loaded } = useLastSentReport(org);
  // Horloge figée au montage : la décision ne « bouge » pas entre deux rendus.
  const [now] = useState(() => new Date().toISOString());
  const [dismissed, setDismissed] = useState(() => readDismissed() === dayKey(now));
  const ready = isPowerSyncReadyNow();

  // Gating : seules les orgs AYANT une mère émettent un rapport (comme
  // `/admin/report-send`). Une org racine n'a personne à qui envoyer → pas de
  // rappel. `parent === null` après vérification = racine (pas de bannière).
  const [hasParent, setHasParent] = useState<boolean | null>(null);
  useEffect(() => {
    if (!org) return;
    let cancelled = false;
    (async () => {
      try {
        const parent = await federation.getOrgParent(org);
        if (!cancelled) setHasParent(!!parent);
      } catch {
        // Lecture ratée : on ne montre PAS de rappel (jamais de faux positif).
        if (!cancelled) setHasParent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [org]);

  const reminder = useMemo(
    () => computeReportReminder({ lastSentAt, now, cadenceDays }),
    [lastSentAt, now, cadenceDays],
  );

  const visible =
    ready && loaded && hasParent === true && reminder.due && !dismissed;

  // Émission idempotente de la notification (in-app + push) quand le rappel est
  // dû : la livraison est gardée par le marqueur journalier, donc un remontage
  // de l'écran le même jour n'émet rien de plus.
  useEffect(() => {
    if (!visible) return;
    void deliverReportReminder({ lastSentAt, cadenceDays, now });
  }, [visible, lastSentAt, cadenceDays, now]);

  if (!visible) return null;

  return (
    <div
      role="status"
      data-testid="report-reminder-banner"
      data-reminder-reason={reminder.reason}
      className={className}
      style={{
        backgroundColor: "color-mix(in srgb, var(--data-pending) 12%, var(--surface))",
        border: "1px solid color-mix(in srgb, var(--data-pending) 35%, transparent)",
        borderRadius: "var(--radius, 12px)",
      }}
    >
      <div className="flex items-start gap-3 p-3">
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "color-mix(in srgb, var(--data-pending) 18%, transparent)" }}
          aria-hidden
        >
          <BellRing className="h-4 w-4" style={{ color: "var(--data-pending)" }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-text-primary text-sm font-semibold">{reminder.title}</p>
          <p className="text-text-secondary text-xs leading-snug mt-0.5">
            {reminder.message}
          </p>
          <button
            type="button"
            onClick={onSend ?? (() => navigate("/admin/report-send"))}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-on-accent transition-all active:scale-95"
            style={{ backgroundColor: "var(--accent-primary)" }}
          >
            <Send className="h-3 w-3" /> Envoyer maintenant
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            dismissForDay(now);
            setDismissed(true);
          }}
          aria-label="Masquer le rappel pour aujourd'hui"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--surface-hover)" }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
