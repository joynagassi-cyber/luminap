/**
 * PR13 — Gel de période (clôture comptable).
 *
 * Objectif : une période comptable VALIDÉE ne doit plus pouvoir changer. Toute
 * écriture sur une transaction dont la date est **antérieure ou égale** à la
 * date de clôture est REFUSÉE — création, modification, suppression, contre-
 * transaction (et approbation, qui est aussi une écriture).
 *
 * Deux parties, volontairement séparées :
 *   1. RÈGLE PURE (`isDateLocked`, `assertPeriodOpen`) — aucune I/O, testable
 *      sans base. C'est le cœur métier : `date <= lockedUntil` ⇒ gelé.
 *   2. PERSISTANCE (`lockPeriod` / `getLockedUntil` / `clearPeriodLock`) —
 *      délègue au socle `orgSettings` (table `org_settings`, clé
 *      `period_locked_until`, scopée par organisation). La clôture est donc
 *      PARTAGÉE entre les appareils de l'organisation.
 *
 * POLITIQUE : FAIL-OPEN. Sans clôture configurée (réglage absent, vide ou
 * illisible), rien n'est gelé — on n'empêche JAMAIS une écriture légitime à
 * cause d'une lecture ratée (même philosophie que `featureFlags`/`orgSettings`).
 * Une date de clôture ou une date de transaction ILLISIBLE n'entraîne pas non
 * plus de blocage.
 *
 * Le rejet est un TYPE d'erreur explicite (`PeriodLockedError`, code
 * `PERIOD_LOCKED`) : l'appelant ne peut pas le confondre avec une panne réseau
 * et le message est en français, prêt à afficher.
 */
import {
  getOrgSetting,
  setOrgSetting,
  clearOrgSetting,
  ORG_SETTING_KEYS,
} from "./orgSettings";

/** Code d'erreur typé — testable sans `instanceof` (frontières de module). */
export const PERIOD_LOCKED = "PERIOD_LOCKED";

/** `2026-10-31` → `31/10/2026` (affichage FR). */
function formatFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Erreur typée levée par `assertPeriodOpen`. `code` est stable et exposé
 * comme propriété (pas seulement via `instanceof`) pour survivre aux
 * frontières de module (mocks, workers).
 */
export class PeriodLockedError extends Error {
  readonly code: string = PERIOD_LOCKED;
  readonly date: string;
  readonly lockedUntil: string;

  constructor(date: string, lockedUntil: string) {
    super(
      `Période comptable clôturée : impossible d'écrire une transaction datée du ${formatFr(
        date,
      )} (la période est gelée jusqu'au ${formatFr(lockedUntil)} inclus).`,
    );
    this.name = "PeriodLockedError";
    this.date = date;
    this.lockedUntil = lockedUntil;
  }
}

/**
 * Normalise une valeur de date en `YYYY-MM-DD`. Tolère une date-heure ISO
 * (`2026-10-31T12:00:00Z` → `2026-10-31`). Renvoie `null` si la valeur est
 * absente ou non parsable (l'appelant applique alors le fail-open).
 */
export function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const day = s.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/**
 * Règle PURE : une date est-elle gelée ? `date <= lockedUntil` est gelé.
 * Fail-open : une clôture absente/illisible ⇒ rien n'est gelé ; une date de
 * transaction illisible ⇒ non gelée (on ne bloque pas sur une donnée douteuse).
 */
export function isDateLocked(
  date: string | null | undefined,
  lockedUntil: string | null | undefined,
): boolean {
  const until = normalizeDate(lockedUntil);
  if (!until) return false;
  const d = normalizeDate(date);
  if (!d) return false;
  // Comparaison lexicographique : sur le format ISO `YYYY-MM-DD`, elle est
  // équivalente à la comparaison chronologique.
  return d <= until;
}

/**
 * Lève `PeriodLockedError` si `date` tombe dans la période gelée ; ne fait
 * rien sinon. C'est le point d'application UNIQUE de la règle.
 */
export function assertPeriodOpen(
  date: string | null | undefined,
  lockedUntil: string | null | undefined,
): void {
  if (isDateLocked(date, lockedUntil)) {
    throw new PeriodLockedError(
      normalizeDate(date) ?? String(date ?? ""),
      normalizeDate(lockedUntil) ?? String(lockedUntil ?? ""),
    );
  }
}

/** L'erreur est-elle un rejet de gel de période (code `PERIOD_LOCKED`) ? */
export function isPeriodLockedError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    (err as { code?: unknown }).code === PERIOD_LOCKED
  );
}

/**
 * Message FR prêt à afficher pour une erreur donnée : le message du gel s'il
 * s'agit d'un rejet de période, sinon `fallback`.
 */
export function periodLockMessage(err: unknown, fallback: string): string {
  if (isPeriodLockedError(err)) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim() !== "") return message;
  }
  return fallback;
}

/**
 * Enregistre la date de clôture (incluse) pour l'organisation active.
 * Renvoie `false` si l'écriture a échoué (jamais d'exception de base).
 * Lève si la date est invalide — un gel mal saisi ne doit pas être enregistré.
 */
export async function lockPeriod(lockedUntil: string): Promise<boolean> {
  const until = normalizeDate(lockedUntil);
  if (!until) {
    throw new Error("Date de clôture invalide (format attendu : AAAA-MM-JJ).");
  }
  return setOrgSetting(ORG_SETTING_KEYS.periodLockedUntil, until);
}

/** Date de clôture en vigueur (ou `null` si aucune / illisible) — fail-open. */
export async function getLockedUntil(): Promise<string | null> {
  const raw = await getOrgSetting<string | null>(
    ORG_SETTING_KEYS.periodLockedUntil,
    null,
  );
  return normalizeDate(raw);
}

/** Retire le gel de période : la période redevient ouverte. */
export async function clearPeriodLock(): Promise<boolean> {
  return clearOrgSetting(ORG_SETTING_KEYS.periodLockedUntil);
}
