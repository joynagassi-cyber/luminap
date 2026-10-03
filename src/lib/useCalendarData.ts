/**
 * Helpers pures de calcul calendrier (Lumina — Phase 2).
 *
 * Fonctions 100% pures (pas de hook, pas de React) : testables sans rendu.
 * Semaine = lundi → dimanche (charte FR). Tous les événements sont lus via
 * `getEventStart` (snake/camel : `start_date` PowerSync ou `startDate` legacy).
 */

import {
  addDays,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { getEventStart } from "./event-status";

/** Cellule de la grille mensuelle. */
export interface MonthCell {
  day: number;
  iso: string;
  inMonth: boolean;
}

/**
 * Grille mensuelle : 42 cellules (6 semaines × 7), lundi → dimanche.
 * `iso` = "YYYY-MM-DD". Les débuts de mois précédents / fins suivants
 * complètent la grille (`inMonth = false`).
 */
export function buildMonthGrid(year: number, month: number): MonthCell[] {
  const cursor = new Date(year, month, 1);
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push({
      day: d.getDate(),
      iso: format(d, "yyyy-MM-dd"),
      inMonth: isSameMonth(d, cursor),
    });
  }
  return cells;
}

/** 7 jours ISO ("YYYY-MM-DD") de la semaine débutant le lundi `weekStart`. */
export function buildWeekDays(weekStart: string): string[] {
  const start = new Date(`${weekStart}T00:00:00`);
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
}

/** 12 mois de l'année en "YYYY-MM" (janvier → décembre). */
export function buildYearGrid(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => format(new Date(year, i, 1), "yyyy-MM"));
}

/** 7 `Date` de la semaine (lundi → dimanche) contenant `d`. */
export function getWeekDays(d: Date): Date[] {
  const monday = startOfWeek(d, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Regroupe des événements par jour ISO (clé = date de début).
 * `events` est `any[]` : les pages lisent PSEvent ou PSEventTask.
 */
export function groupByDay(
  iso: string,
  events: any[],
): Record<string, any[]> {
  const out: Record<string, any[]> = {};
  for (const e of events) {
    const key = getEventStart(e);
    if (!key) continue;
    // normalise les dates complètes ("2026-10-03T09:00") sur le seul jour
    const day = key.slice(0, 10);
    (out[day] ??= []).push(e);
  }
  void iso;
  return out;
}

/**
 * Classe les événements en passé / aujourd'hui / à venir par rapport à
 * l'aujourd'hui courant (utile pour la timeline).
 */
export function splitEventsByToday(
  events: any[],
): { past: any[]; today: any[]; upcoming: any[] } {
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const result = { past: [] as any[], today: [] as any[], upcoming: [] as any[] };
  for (const e of events) {
    const start = getEventStart(e);
    if (!start) continue;
    const day = start.slice(0, 10);
    if (day < todayIso) result.past.push(e);
    else if (day === todayIso) result.today.push(e);
    else result.upcoming.push(e);
  }
  const byStart = (a: any, b: any) =>
    String(getEventStart(a) ?? "").localeCompare(String(getEventStart(b) ?? ""));
  result.past.sort(byStart);
  result.today.sort(byStart);
  result.upcoming.sort(byStart);
  return result;
}

/** Est-ce que `iso` (YYYY-MM-DD) est le jour courant ? */
export function isTodayIso(iso: string): boolean {
  return isSameDay(new Date(`${iso}T00:00:00`), new Date());
}

/** Fin de mois "YYYY-MM" (borne interne — navigation semaine). */
export function endOfMonthIso(year: number, month: number): string {
  return format(endOfMonth(new Date(year, month, 1)), "yyyy-MM-dd");
}
