/**
 * Réglages par organisation — socle partagé (PR8 maker-checker, PR13 gel de
 * période). Ces deux features produit ont besoin d'un réglage PERSISTANT,
 * propre à l'organisation, dont l'ABSENCE ne change rien au comportement
 * existant (fail-safe).
 *
 * Stockage : table `org_settings (org_id, key, value)` — `value` = JSON
 * sérialisé. Lecture/écriture passent par le data layer PowerSync (le chemin
 * d'écriture applicatif), donc les réglages sont synchronisés entre appareils
 * de la même organisation.
 *
 * POLITIQUE (identique à `featureFlags.ts` / `schemaVersion.ts`) : FAIL-SAFE.
 *   - un réglage ABSENT, vide ou ILLISIBLE → la valeur par défaut fournie par
 *     l'appelant. On n'active donc JAMAIS une contrainte financière (maker-checker,
 *     gel de période) par accident à cause d'une lecture ratée.
 *   - la lecture (`getOrgSetting`) ne lève jamais : une erreur de base est
 *     instrumentée puis retombe sur le défaut.
 *
 * Ce module est volontairement MINCE : les règles métier (qui peut approuver,
 * quelle date est gelée) vivent dans `makerChecker.ts` / `periodLock.ts`, qui
 * reçoivent la valeur en entrée et restent PURS donc testables sans base.
 */
import { getPowerSyncDatabase } from "@/lib/powersync";
import { getOrganizationId } from "./orgContext";
import { captureClientError } from "./clientErrors";

/** Clés de réglages connues (évite les fautes de frappe entre modules). */
export const ORG_SETTING_KEYS = {
  /** PR8 — approbation en deux étapes (maker-checker). Défaut : false. */
  makerCheckerEnabled: "maker_checker_enabled",
  /** PR13 — date de clôture comptable (ISO YYYY-MM-DD). Défaut : null. */
  periodLockedUntil: "period_locked_until",
  /**
   * PR14 — propriétaire de référence de l'organisation (identifiant de profil).
   * Défaut : null (aucun propriétaire désigné explicitement). Permet de
   * survivre au départ d'un administrateur sans laisser l'org orpheline.
   */
  ownerProfileId: "owner_profile_id",
} as const;

export type OrgSettingKey =
  (typeof ORG_SETTING_KEYS)[keyof typeof ORG_SETTING_KEYS];

/**
 * Lit un réglage pour l'organisation active. Renvoie `fallback` si le réglage
 * est absent, vide ou illisible (fail-safe) — jamais d'exception propagée.
 */
export async function getOrgSetting<T>(
  key: string,
  fallback: T,
  orgId: string = getOrganizationId(),
): Promise<T> {
  try {
    const db = getPowerSyncDatabase();
    const res = await db.execute(
      "SELECT value FROM org_settings WHERE org_id = ? AND key = ?",
      [orgId, key],
    );
    const rows = (res?.array || []) as Array<{ value: string | null }>;
    if (rows.length === 0) return fallback;
    const raw = rows[0].value;
    if (raw === null || raw === undefined || raw === "") return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    captureClientError(err, {
      message: `Lecture du réglage d'organisation « ${key} » échouée`,
      route: "orgSettings.getOrgSetting",
    });
    return fallback;
  }
}

/**
 * Écrit un réglage pour l'organisation active (upsert). Renvoie `true` si
 * l'écriture a réussi. Une erreur est instrumentée et renvoyée sous forme de
 * `false` (l'appelant décide du message) — on ne l'avale pas silencieusement.
 *
 * NOTE — pas de `INSERT ... ON CONFLICT` : côté client, PowerSync expose chaque
 * table comme une VUE (`CREATE VIEW org_settings AS SELECT ... json_extract`).
 * Un `ON CONFLICT DO UPDATE` (ou un `INSERT OR REPLACE`) échoue alors avec
 * « cannot UPSERT a view » et le réglage n'est JAMAIS persisté — la clôture de
 * période (PR13) et le maker-checker (PR8) restaient silencieusement inertes
 * (constaté en E2E). On fait donc un SELECT puis UPDATE-ou-INSERT, seule forme
 * acceptée par une vue. `id` est obligatoire (PowerSync l'ajoute au schéma mais
 * ne le génère pas sur un INSERT explicite).
 */
export async function setOrgSetting(
  key: string,
  value: unknown,
  orgId: string = getOrganizationId(),
): Promise<boolean> {
  try {
    const db = getPowerSyncDatabase();
    const serialized = JSON.stringify(value);
    const now = new Date().toISOString();
    const existing = await db.execute(
      "SELECT id FROM org_settings WHERE org_id = ? AND key = ?",
      [orgId, key],
    );
    const rows = (existing?.array || []) as Array<{ id: string }>;
    if (rows.length > 0) {
      await db.execute(
        "UPDATE org_settings SET value = ?, updated_at = ? WHERE id = ?",
        [serialized, now, rows[0].id],
      );
    } else {
      await db.execute(
        "INSERT INTO org_settings (id, org_id, key, value, updated_at) VALUES (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), orgId, key, serialized, now],
      );
    }
    return true;
  } catch (err) {
    captureClientError(err, {
      message: `Écriture du réglage d'organisation « ${key} » échouée`,
      route: "orgSettings.setOrgSetting",
    });
    return false;
  }
}

/** Supprime un réglage (retour au défaut). Renvoie `true` si supprimé. */
export async function clearOrgSetting(
  key: string,
  orgId: string = getOrganizationId(),
): Promise<boolean> {
  try {
    const db = getPowerSyncDatabase();
    await db.execute("DELETE FROM org_settings WHERE org_id = ? AND key = ?", [
      orgId,
      key,
    ]);
    return true;
  } catch (err) {
    captureClientError(err, {
      message: `Suppression du réglage d'organisation « ${key} » échouée`,
      route: "orgSettings.clearOrgSetting",
    });
    return false;
  }
}
