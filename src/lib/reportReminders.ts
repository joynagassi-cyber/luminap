/**
 * PR10 — Notifications : rappels de rapport à envoyer (priorité P3).
 *
 * Valeur : rappeler au responsable (admin de l'annexe) qu'il doit transmettre
 * le rapport de gestion périodique à son organisation parente.
 *
 * Contraintes produit respectées :
 *   - **Front-first** : AUCUN cron serveur. Le rappel est évalué à l'ouverture
 *     de l'écran d'administration des rapports (montage de
 *     `ReportReminderBanner`), pas par une tâche planifiée.
 *   - **Cœur PUR** : `computeReportReminder` ne fait aucune E/S — l'horloge est
 *     injectée (`now`) → déterministe et testable sans base ni navigateur.
 *   - **Idempotent** : un marqueur `localStorage` (`lumina-report-reminder-last`)
 *     mémorise le JOUR où le rappel a été émis. Deux évaluations le même jour
 *     n'émettent qu'UNE notification.
 *   - **Réutilisation** : la livraison passe par la capacité existante
 *     `notification.sendNotification` (OneSignal + persistance PowerSync
 *     `notifications`, avec le motif « persistance PowerSync échouée → push
 *     quand même » déjà en place). Aucun second système de notification.
 *   - **Kill switch** : `featureFlags` (fail-open) — le drapeau
 *     `report-reminders` coupe le rappel sans redéploiement.
 *
 * FR-only. Aucune couleur ni texte hors tokens (le rendu est dans le composant).
 */
import type { Role } from "@/types";

import { isFeatureEnabled } from "./featureFlags";
import { captureClientError } from "./clientErrors";
import { normalizeText } from "./sanitize";

/** Drapeau de fonctionnalité (kill switch, fail-open) du rappel de rapport. */
export const REPORT_REMINDER_FLAG = "report-reminders";

/** Clé localStorage du marqueur d'idempotence (jour de la dernière émission). */
export const REMINDER_MARKER_KEY = "lumina-report-reminder-last";

/** Cadence par défaut (jours) — un rapport mensuel. */
export const DEFAULT_CADENCE_DAYS = 30;

/** Longueur maximale du message (borné, jamais de texte non maîtrisé). */
export const MAX_REMINDER_MESSAGE_LENGTH = 240;

/** Titre du rappel (FR) — partagé entre la bannière UI et la notification. */
export const REPORT_REMINDER_TITLE = "Rapport à envoyer";

const DAY_MS = 86_400_000;

/** Mois FR — dérivé de la partie UTC de l'ISO (déterministe, sans fuseau). */
const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Raison d'un rappel : jamais envoyé, cadence dépassée, ou pas encore dû. */
export type ReminderReason = "never-sent" | "cadence-elapsed" | "not-due";

/** Décision structurée (pure) : le rappel est-il dû, et avec quel message ? */
export interface ReportReminder {
  due: boolean;
  reason: ReminderReason;
  title: string;
  message: string;
  cadenceDays: number;
  /** Jours écoulés depuis le dernier envoi (`null` si jamais envoyé). */
  daysSinceLastSent: number | null;
}

export interface ComputeReportReminderInput {
  /** Date ISO du dernier rapport envoyé ; `null`/absent = jamais envoyé. */
  lastSentAt: string | null | undefined;
  /** Horloge injectée (ISO) — la fonction reste pure et déterministe. */
  now: string;
  /** Cadence en jours (défaut `DEFAULT_CADENCE_DAYS`). */
  cadenceDays?: number;
}

/** Parse une date ISO en millisecondes ; `null` si absente ou illisible. */
function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Normalise la cadence : entier strictement positif, sinon défaut. */
function normalizeCadence(cadenceDays?: number): number {
  if (typeof cadenceDays === "number" && Number.isFinite(cadenceDays) && cadenceDays > 0) {
    return Math.floor(cadenceDays);
  }
  return DEFAULT_CADENCE_DAYS;
}

/** Libellé FR du mois porté par une date ISO (`""` si illisible). */
function monthLabelFr(now: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(now ?? ""));
  if (!m) return "";
  const month = Number(m[2]);
  if (month < 1 || month > 12) return "";
  return `${MONTHS_FR[month - 1]} ${m[1]}`;
}

/** Construit le message FR borné à partir de la raison et de la cadence. */
function buildReminderMessage(params: {
  reason: ReminderReason;
  cadenceDays: number;
  daysSinceLastSent: number | null;
  now: string;
}): string {
  const month = monthLabelFr(params.now);
  const period = month ? ` de ${month}` : "";
  const base =
    params.reason === "never-sent"
      ? `Aucun rapport de gestion n'a encore été envoyé${period}. Transmettez le rapport à votre organisation parente.`
      : `Le dernier rapport date de ${params.daysSinceLastSent ?? 0} jour(s) (cadence : ${params.cadenceDays} jours). Il est temps d'envoyer le rapport${period} à votre organisation parente.`;
  return normalizeText(base, {
    maxLength: MAX_REMINDER_MESSAGE_LENGTH,
    collapseWhitespace: true,
  });
}

/**
 * Décide si un rappel de rapport est DÛ. **Fonction pure** : aucune E/S, aucune
 * horloge implicite (`now` est injecté) → déterministe et testable.
 *
 * Règles :
 *   - jamais envoyé (ou date illisible) → dû (`reason: "never-sent"`) ;
 *   - sinon dû quand `now - lastSentAt >= cadenceDays` (borne INCLUSIVE) ;
 *   - `now` illisible mais `lastSentAt` valide → non dû (jamais de faux rappel).
 */
export function computeReportReminder(
  input: ComputeReportReminderInput,
): ReportReminder {
  const cadenceDays = normalizeCadence(input.cadenceDays);
  const nowMs = parseMs(input.now);
  const lastMs = parseMs(input.lastSentAt);

  if (lastMs === null) {
    return {
      due: true,
      reason: "never-sent",
      title: REPORT_REMINDER_TITLE,
      message: buildReminderMessage({
        reason: "never-sent",
        cadenceDays,
        daysSinceLastSent: null,
        now: input.now,
      }),
      cadenceDays,
      daysSinceLastSent: null,
    };
  }

  if (nowMs === null) {
    return {
      due: false,
      reason: "not-due",
      title: REPORT_REMINDER_TITLE,
      message: buildReminderMessage({
        reason: "not-due",
        cadenceDays,
        daysSinceLastSent: 0,
        now: input.now,
      }),
      cadenceDays,
      daysSinceLastSent: 0,
    };
  }

  const elapsed = nowMs - lastMs;
  const daysSinceLastSent = Math.max(0, Math.floor(elapsed / DAY_MS));
  const due = elapsed >= cadenceDays * DAY_MS;
  const reason: ReminderReason = due ? "cadence-elapsed" : "not-due";

  return {
    due,
    reason,
    title: REPORT_REMINDER_TITLE,
    message: buildReminderMessage({
      reason,
      cadenceDays,
      daysSinceLastSent,
      now: input.now,
    }),
    cadenceDays,
    daysSinceLastSent,
  };
}

// ============================================================
// Idempotence — marqueur « jour de la dernière émission »
// ============================================================

/** Sous-ensemble de l'API Web Storage utilisé (injectable pour les tests). */
export interface ReminderStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** `localStorage` du navigateur, ou `null` (SSR, tests Node, mode privé). */
export function defaultReminderStorage(): ReminderStorage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Clé de JOUR (`YYYY-MM-DD`) d'une date ISO — sert de marqueur d'idempotence.
 * Déterministe : on lit la partie date de l'ISO (pas de fuseau), et on retombe
 * sur la partie UTC si la forme n'est pas reconnue.
 */
export function dayKey(now: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(now ?? ""));
  if (m) return m[1];
  const d = new Date(now);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Lit le marqueur (jour de la dernière émission) ; `null` si absent/illisible. */
export function readReminderMarker(
  storage: ReminderStorage | null = defaultReminderStorage(),
): string | null {
  try {
    const raw = storage?.getItem(REMINDER_MARKER_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

/** Écrit le marqueur = jour de `now` (best-effort, jamais d'exception). */
export function writeReminderMarker(
  now: string,
  storage: ReminderStorage | null = defaultReminderStorage(),
): void {
  try {
    storage?.setItem(REMINDER_MARKER_KEY, dayKey(now));
  } catch {
    /* stockage indisponible : le marqueur reste inerte (re-émission possible) */
  }
}

/** Efface le marqueur (diagnostic / tests). */
export function clearReminderMarker(
  storage: ReminderStorage | null = defaultReminderStorage(),
): void {
  try {
    storage?.removeItem(REMINDER_MARKER_KEY);
  } catch {
    /* stockage indisponible — rien à faire */
  }
}

// ============================================================
// Livraison — notification (in-app + push OneSignal)
// ============================================================

/** Données de notification (alignées sur `NotificationSendData`). */
export interface ReminderNotificationData {
  title: string;
  message: string;
  targetRole?: Role;
  extraData?: Record<string, string>;
}

/** Résultat de la livraison : émise ? et pourquoi. */
export interface ReportReminderDeliveryResult {
  fired: boolean;
  reason: ReminderReason | "already-fired-today" | "disabled";
  reminder: ReportReminder | null;
}

export interface DeliverReportReminderParams {
  lastSentAt: string | null | undefined;
  cadenceDays?: number;
  /** Horloge injectée (ISO) — défaut : maintenant. */
  now?: string;
  /** Fonction d'envoi (injectable pour les tests) — défaut : capacité notification. */
  send?: (data: ReminderNotificationData) => Promise<void>;
  /** Stockage du marqueur (injectable pour les tests) — défaut : localStorage. */
  storage?: ReminderStorage | null;
}

/**
 * Évalue le rappel et, s'il est dû ET pas déjà émis aujourd'hui, le LIVRE via
 * la capacité de notification existante (in-app + push), puis pose le marqueur.
 *
 * Idempotence : le marqueur (`lumina-report-reminder-last`) empêche une seconde
 * émission le même jour, même si l'écran est remonté plusieurs fois.
 *
 * Un échec d'envoi est instrumenté (`captureClientError`) et N'EST PAS marqué
 * comme émis → une nouvelle tentative est possible (jamais d'échec silencieux).
 */
export async function deliverReportReminder(
  params: DeliverReportReminderParams,
): Promise<ReportReminderDeliveryResult> {
  if (!isFeatureEnabled(REPORT_REMINDER_FLAG)) {
    return { fired: false, reason: "disabled", reminder: null };
  }

  const now = params.now ?? new Date().toISOString();
  const reminder = computeReportReminder({
    lastSentAt: params.lastSentAt,
    now,
    cadenceDays: params.cadenceDays,
  });

  if (!reminder.due) {
    return { fired: false, reason: reminder.reason, reminder };
  }

  const storage =
    params.storage === undefined ? defaultReminderStorage() : params.storage;
  if (readReminderMarker(storage) === dayKey(now)) {
    return { fired: false, reason: "already-fired-today", reminder };
  }

  const send =
    params.send ??
    (async (data: ReminderNotificationData) => {
      const { notification } = await import("@/capabilities/notification");
      await notification.sendNotification(data);
    });

  try {
    await send({
      title: reminder.title,
      message: reminder.message,
      targetRole: "ADMIN",
      extraData: { kind: "REPORT_REMINDER", reason: reminder.reason },
    });
  } catch (err) {
    captureClientError(err, {
      message: "Émission du rappel de rapport échouée",
      route: "reportReminders.deliverReportReminder",
    });
    return { fired: false, reason: reminder.reason, reminder };
  }

  writeReminderMarker(now, storage);
  return { fired: true, reason: reminder.reason, reminder };
}
