/**
 * Event status + date helpers (Lumina).
 *
 * La page Events.tsx et le nouveau calendrier maison (src/components/EventCalendar)
 * partagent les mêmes constantes et helpers de dates.
 *
 * ⚠️  Les pages lisent `start_date` (snake_case, PowerSync/SQLite) OU `startDate`
 * (camelCase, legacy IndexedDB). Le helper `getEventStart` gère les deux formes
 * pour éviter les incohérences de rendu du calendrier.
 *
 * Ne PAS dupliquer ces constantes ailleurs (voir M22 : FEDERATION_STATUS_COLOR).
 */

/** Tokens Lumina pour chaque statut d'événement (jamais de couleur brute). */
export const EVENT_STATUS_COLORS: Record<string, string> = {
  PLANIFIED: "var(--data-planified)",
  ONGOING: "var(--data-income)",
  COMPLETED: "var(--text-tertiary)",
  CANCELLED: "var(--data-expense)",
};

export const EVENT_STATUS_LABELS: Record<string, string> = {
  PLANIFIED: "Planifié",
  ONGOING: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

/** Renvoie la date de début d'un événement (gère les 2 formes snake/camel). */
export const getEventStart = (e: any): string | null =>
  e?.start_date ?? e?.startDate ?? null;

/** Renvoie la date de fin d'un événement (gère les 2 formes ; null si absent). */
export const getEventEnd = (e: any): string | null =>
  e?.end_date ?? e?.endDate ?? null;
