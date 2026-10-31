/**
 * « Signaler un problème » — Phase 11 / proposition PR5.
 *
 * Le bouton de la page Santé ne faisait que COPIER un texte de diagnostic
 * (`buildDiagnosticReport`). Rien n'était envoyé : un utilisateur qui signale un
 * problème ne produisait **aucun signal exploitable par le support** (pas de
 * Sentry, pas de trace locale). Ce module livre l'ENVOI réel :
 *
 *   1. `buildProblemReport` — fonction PURE qui construit un rapport structuré
 *      et **sans PII** : version, environnement, plateforme, en ligne, niveau de
 *      santé global, identifiants des contrôles en échec, codes/messages des
 *      dernières erreurs client (déjà expurgés par `clientErrors.redact`) et la
 *      note libre de l'utilisateur. JAMAIS d'e-mail, de nom, d'identifiant
 *      d'organisation ni de contenu brut.
 *   2. `sendProblemReport` — émet le rapport via Sentry (`captureMessage`) ET
 *      conserve un enregistrement local consultable (« dernier signalement »).
 *      Si Sentry n'est pas configuré (pas de DSN), la dégradation est propre :
 *      l'enregistrement local est conservé et l'appelant est informé (l'UI
 *      affiche alors un toast FR indiquant que le signalement est enregistré
 *      localement).
 *
 * Politique PII : identique à `clientErrors.ts` — la note libre et les messages
 * sont repassés par `redact` puis `normalizeText` (caractères de contrôle
 * retirés, longueur plafonnée) avant d'entrer dans le rapport.
 */
import * as Sentry from "@sentry/react";

import { redact } from "./clientErrors";
import type { ClientErrorContext } from "./clientErrors";
import { buildHealthReport } from "./health";
import type { HealthInputs, HealthLevel } from "./health";
import { normalizeText } from "./sanitize";

/** Clé localStorage du journal local des signalements (jamais de PII). */
export const PROBLEM_REPORTS_STORAGE_KEY = "lumina-problem-reports";

/** Nombre maximal de signalements conservés localement. */
const MAX_LOCAL_REPORTS = 10;

/** Longueur maximale de la note libre de l'utilisateur. */
const MAX_NOTE_LENGTH = 1000;

/** Longueur maximale d'un message d'erreur repris dans le rapport. */
const MAX_ERROR_MESSAGE_LENGTH = 300;

/**
 * Environnement d'exécution joint au rapport. Dérivé du mode Vite (comme
 * `sentry.ts`) : `production` pour un build de production, `development` sinon.
 * Constante de module : la fonction `buildProblemReport` reste déterministe.
 */
const ENVIRONMENT: string =
  (import.meta.env.VITE_SENTRY_ENV as string | undefined) ??
  (import.meta.env.MODE === "production" ? "production" : "development");

/** Une erreur client reprise dans le rapport : code (= source) + message expurgé. */
export interface ProblemReportError {
  code: string;
  message: string;
}

/**
 * Rapport de problème structuré, SANS PII. Les clés sont volontairement
 * restreintes : aucune clé `email` / `name` / `orgId` / `payload` ne doit
 * apparaître (verrouillé par `report-problem.test.ts`).
 */
export interface ProblemReport {
  kind: "lumina-problem-report";
  generatedAt: string;
  appVersion: string;
  environment: string;
  platform: string;
  online: boolean;
  overall: HealthLevel;
  /** Identifiants des contrôles de santé NON « ok » (en échec / en alerte). */
  failedChecks: string[];
  errors: ProblemReportError[];
  /** Note libre de l'utilisateur, expurgée et bornée. */
  note: string;
}

/** Normalise une entrée d'erreur client en entrée de rapport (PII-free). */
function toReportError(err: {
  source: string;
  message: string;
}): ProblemReportError {
  return {
    code: err.source,
    message: normalizeText(redact(err.message), {
      maxLength: MAX_ERROR_MESSAGE_LENGTH,
      collapseWhitespace: true,
    }),
  };
}

/**
 * Construit le rapport de problème. PUR : aucune horloge implicite (l'horodatage
 * est passé par l'appelant) et aucune lecture d'état global — les entrées sont
 * fournies. Le niveau global et les contrôles en échec sont DÉRIVÉS du rapport
 * santé (on n'en garde que les identifiants, jamais les détails, qui peuvent
 * citer l'organisation).
 */
export function buildProblemReport(
  inputs: HealthInputs,
  recentErrors: readonly Pick<ClientErrorContext, "source" | "message">[],
  now: string,
  note = "",
): ProblemReport {
  const health = buildHealthReport(inputs, now);
  return {
    kind: "lumina-problem-report",
    generatedAt: now,
    appVersion: inputs.appVersion || "inconnue",
    environment: ENVIRONMENT,
    platform: inputs.platform,
    online: inputs.online,
    overall: health.overall,
    failedChecks: health.checks
      .filter((c) => c.level !== "ok")
      .map((c) => c.id),
    errors: recentErrors.map(toReportError),
    note: normalizeText(redact(note), {
      maxLength: MAX_NOTE_LENGTH,
      collapseWhitespace: false,
    }),
  };
}

/** Résultat d'un envoi de signalement (pour l'UI et les tests). */
export interface SendProblemReportResult {
  /** Le rapport a-t-il été transmis à Sentry (DSN configuré + envoi accepté) ? */
  sentToSentry: boolean;
  /** Un enregistrement local a-t-il été conservé ? */
  savedLocally: boolean;
  report: ProblemReport;
}

/**
 * Lit le journal local des signalements (le plus récent en premier). Tolérant :
 * un stockage indisponible ou corrompu renvoie une liste vide plutôt que de
 * propager une exception à l'UI.
 */
export function getProblemReports(): ProblemReport[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROBLEM_REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProblemReport[]) : [];
  } catch {
    return [];
  }
}

/** Dernier signalement enregistré, ou `null`. */
export function getLastProblemReport(): ProblemReport | null {
  return getProblemReports()[0] ?? null;
}

/** Test helper — vide le journal local des signalements. */
export function clearProblemReports(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(PROBLEM_REPORTS_STORAGE_KEY);
  } catch {
    /* stockage indisponible — rien à effacer */
  }
}

/**
 * Conserve le rapport localement (journal borné, plus récent en premier).
 * Renvoie `true` si l'écriture a réussi — un stockage plein/refusé ne doit pas
 * faire échouer le signalement (dégradation gracieuse), mais ne doit pas non
 * plus être avalé silencieusement : l'appelant décide du message.
 */
function persistProblemReport(report: ProblemReport): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    const next = [report, ...getProblemReports()].slice(0, MAX_LOCAL_REPORTS);
    localStorage.setItem(PROBLEM_REPORTS_STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Envoie un signalement de problème.
 *
 * - émet le rapport via Sentry (`captureMessage`, niveau `info`, `extra` = le
 *   rapport structuré) **si** un DSN est configuré ;
 * - conserve systématiquement un enregistrement local (journal « dernier
 *   signalement ») ;
 * - dégrade proprement si Sentry est absent : `sentToSentry = false`, le local
 *   reste la seule trace et l'appelant prévient l'utilisateur (toast FR).
 *
 * `now` et `note` sont injectables pour les tests.
 */
export function sendProblemReport(
  inputs: HealthInputs,
  recentErrors: readonly Pick<ClientErrorContext, "source" | "message">[],
  note = "",
  now: string = new Date().toISOString(),
): SendProblemReportResult {
  const report = buildProblemReport(inputs, recentErrors, now, note);
  const savedLocally = persistProblemReport(report);

  let sentToSentry = false;
  if (isSentryConfigured()) {
    try {
      Sentry.captureMessage("Problème signalé par l'utilisateur", {
        level: "info",
        tags: {
          source: "report-problem",
          platform: report.platform,
          environment: report.environment,
          health: report.overall,
        },
        // Contexte structuré SANS PII (cf. politique clientErrors).
        extra: { report },
      });
      sentToSentry = true;
    } catch {
      // Un envoi Sentry refusé ne doit pas perdre le signalement : le journal
      // local a déjà été écrit ci-dessus (dégradation gracieuse).
      sentToSentry = false;
    }
  }

  return { sentToSentry, savedLocally, report };
}

/**
 * Sentry est-il configuré (DSN présent) ? Le SDK est initialisé en mode
 * « débranché » quand `VITE_SENTRY_DSN` est absent : on ne peut alors rien
 * transmettre et on le dit à l'appelant.
 */
export function isSentryConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SENTRY_DSN);
}
