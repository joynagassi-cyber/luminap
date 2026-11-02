/**
 * Moniteur de performance — détecte les tâches longues et les opérations
 * anormalement lentes (catégorie « perf » du système d'observabilité).
 *
 * Deux sources :
 *   1. `PerformanceObserver({ type: "longtask" })` — le navigateur signale toute
 *      tâche du thread principal dépassant ~50 ms (interface gelée, fuite de
 *      ressources). Ces événements sont regroupés (throttle) pour ne pas
 *      inonder le rapport d'erreurs.
 *   2. `measureOperation` — mesure explicite d'une opération métier (requête
 *      lente, calcul lourd) : au-delà d'un seuil, un rapport est émis.
 *
 * Les rapports de performance sont signalés au plus une fois par fenêtre
 * (`PERF_THROTTLE_MS`) afin de rester utiles sans devenir du bruit.
 */
import { reportError } from "./errorReporter";

/** Seuil par défaut d'une tâche longue (ms). */
export const LONG_TASK_THRESHOLD_MS = 120;

/** Seuil par défaut d'une opération lente (ms). */
export const SLOW_OPERATION_THRESHOLD_MS = 1500;

/** Fenêtre de regroupement des signalements de performance (ms). */
export const PERF_THROTTLE_MS = 30_000;

let lastPerfReportAt = 0;

/** Peut-on émettre un rapport de performance maintenant ? (throttle global) */
function canReportPerf(now: number): boolean {
  return now - lastPerfReportAt >= PERF_THROTTLE_MS;
}

/** Signale une tâche longue (regroupée). */
function reportLongTask(duration: number): void {
  const now = Date.now();
  if (!canReportPerf(now)) return;
  lastPerfReportAt = now;
  reportError(
    new Error(
      `Tâche longue détectée (${Math.round(duration)} ms) — interface potentiellement gelée`,
    ),
    {
      type: "performance",
      source: "longtask",
      context: { durationMs: String(Math.round(duration)) },
    },
  );
}

/**
 * Branche l'observateur de tâches longues. Idempotent et sûr : si l'API
 * `PerformanceObserver` ou l'entrée `longtask` n'existe pas (Safari, jsdom),
 * la fonction ne fait rien. Renvoie une fonction de désinstallation.
 */
export function installLongTaskMonitor(): () => void {
  if (typeof PerformanceObserver === "undefined") return () => {};
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= LONG_TASK_THRESHOLD_MS) reportLongTask(entry.duration);
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    return () => {}; // entrée non supportée — pas de surveillance
  }
  return () => observer?.disconnect();
}

/**
 * Mesure une opération asynchrone ; si elle dépasse `thresholdMs`, émet un
 * rapport de performance. L'erreur éventuelle est propagée à l'appelant (le
 * reporter n'avale jamais l'exception métier).
 */
export async function measureOperation<T>(
  name: string,
  fn: () => Promise<T>,
  thresholdMs = SLOW_OPERATION_THRESHOLD_MS,
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    if (duration >= thresholdMs) {
      const now = Date.now();
      if (canReportPerf(now)) {
        lastPerfReportAt = now;
        reportError(
          new Error(`Opération lente « ${name} » (${duration} ms)`),
          {
            type: "performance",
            source: "slow-operation",
            context: { operation: name, durationMs: String(duration) },
          },
        );
      }
    }
  }
}

/** Test helper — réinitialise le throttle de performance. */
export function resetPerfMonitor(): void {
  lastPerfReportAt = 0;
}
