/**
 * Drapeaux de fonctionnalités (kill switches) — proposition PR7 (Phase 11).
 *
 * Objectif : pouvoir DÉSACTIVER une fonctionnalité en production **sans
 * redéployer** l'application — utile quand une fonctionnalité récemment livrée
 * provoque une panne (écran noir, boucle de sync, écriture financière erronée).
 * C'est un garde-fou d'exploitation autonome, pas un système de config produit.
 *
 * Politique : FAIL-OPEN par défaut. Une fonctionnalité est ACTIVE tant qu'aucun
 * drapeau ne la désactive explicitement. Un drapeau absent, vide ou illisible
 * n'éteint donc jamais une fonctionnalité par accident (même philosophie que
 * `schemaVersion.ts` / R106).
 *
 * Sources, dans l'ordre de priorité :
 *   1. surcharge locale (`lumina-flags`, JSON) — permet de couper une
 *      fonctionnalité sur un appareil précis pour diagnostic, sans toucher au
 *      reste ;
 *   2. variable d'environnement de build (`VITE_FLAGS`, JSON) — la valeur
 *      servie avec l'APK / le bundle web.
 *
 * Le format attendu est un objet `{ "nom-du-drapeau": false }` ; toute valeur
 * absente = actif. Les valeurs non booléennes sont ignorées (fail-open).
 */

/** Surcharge locale : permet d'éteindre une fonctionnalité sans redéploiement. */
export const FLAGS_STORAGE_KEY = "lumina-flags";

export type FeatureFlags = Record<string, boolean>;

/** Parse un objet de drapeaux en ignorant toute entrée non booléenne (fail-open). */
export function parseFlags(raw: unknown): FeatureFlags {
  if (raw === null || raw === undefined) return {};
  let obj: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }
  if (typeof obj !== "object" || Array.isArray(obj)) return {};
  const out: FeatureFlags = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

/** Drapeaux servis par la config de build (`VITE_FLAGS`). */
export function envFlags(): FeatureFlags {
  try {
    return parseFlags(import.meta.env.VITE_FLAGS);
  } catch {
    return {};
  }
}

/** Drapeaux surchargés localement (lecture best-effort, jamais d'exception). */
export function localFlags(): FeatureFlags {
  try {
    if (typeof localStorage === "undefined") return {};
    return parseFlags(localStorage.getItem(FLAGS_STORAGE_KEY));
  } catch {
    return {};
  }
}

/**
 * Décide si une fonctionnalité est active. Fonction PURE (les sources sont
 * injectables) donc testable sans navigateur. Fail-open : un drapeau inconnu
 * est ACTIF.
 */
export function isFeatureEnabled(
  name: string,
  flags: FeatureFlags = { ...envFlags(), ...localFlags() },
): boolean {
  return flags[name] !== false;
}

/**
 * Active ou coupe une fonctionnalité localement (diagnostic / repli terrain).
 * Passer `undefined` retire la surcharge → la fonctionnalité reprend sa valeur
 * de build.
 */
export function setLocalFlag(name: string, enabled: boolean | undefined): void {
  try {
    if (typeof localStorage === "undefined") return;
    const current = localFlags();
    if (enabled === undefined) delete current[name];
    else current[name] = enabled;
    localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* stockage indisponible : le drapeau reste inerte (fail-open) */
  }
}

/** Toutes les surcharges locales (diagnostic). */
export function getAllLocalFlags(): FeatureFlags {
  return localFlags();
}
