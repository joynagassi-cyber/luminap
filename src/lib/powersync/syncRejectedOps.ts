/**
 * Journal local des opérations d'upload REJETÉES définitivement par le
 * serveur (B-02 : perte de données silencieuse).
 *
 * Quand PowerSync pousse une mutation et que Supabase la refuse avec une
 * erreur fatale (RLS `42501`, intégrité `23xxx`, données `22xxx`), le
 * connecteur doit jeter l'op pour ne pas boucher la file — mais la jeter
 * SANS trace rendait la divergence invisible : l'utilisateur croyait ses
 * données synchronisées alors que le serveur ne les recevrait jamais.
 *
 * Ce journal (localStorage, plafonné) conserve la trace de chaque rejet ;
 * `SyncStatusNotifier` s'y abonne pour notifier l'utilisateur, et le
 * support peut le relire pour diagnostiquer. Aucune donnée métier
 * sensible : table, op, id, code SQLSTATE, message, horodatage.
 */

export interface RejectedSyncOp {
  table: string;
  op: string;
  id: string | null;
  code: string | null;
  message: string;
  /** Horodatage ISO du rejet. */
  at: string;
}

const STORAGE_KEY = "lumina-sync-rejected-ops";
const MAX_ENTRIES = 50;

/** Événement fenêtre émis à chaque rejet (écouté par le notificateur UI). */
export const SYNC_REJECTED_EVENT = "lumina:sync-rejected";

export function getRejectedSyncOps(): RejectedSyncOp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRejectedSyncOp(
  entry: Omit<RejectedSyncOp, "at">,
): void {
  try {
    const ops = getRejectedSyncOps();
    ops.push({ ...entry, at: new Date().toISOString() });
    // Plafond : on garde les plus récentes (le diagnostic vit dans les
    // dernières entrées ; le compteur exact n'a pas de valeur métier).
    const capped = ops.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch {
    /* stockage indisponible — le journal est best-effort */
  }
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SYNC_REJECTED_EVENT));
    }
  } catch {
    /* environnement sans window (tests SSR) */
  }
}

export function clearRejectedSyncOps(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
