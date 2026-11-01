/**
 * Statistiques d'usage ANONYMISÉES (proposition PR15, Phase 11).
 *
 * Objectif : savoir QUELLES fonctionnalités sont utilisées, **sans aucune
 * donnée personnelle**. Ce module ne compte QUE des évènements d'usage
 * agrégés, indexés par un identifiant de fonctionnalité **stable** :
 *
 *     screen:dashboard, screen:finance, action:export-json, action:export-csv…
 *
 * Il ne stocke JAMAIS : identifiant utilisateur, identifiant d'organisation,
 * nom de membre, adresse e-mail, texte libre ou horodatage d'action. Le
 * nettoyage est garanti par `sanitizeUsagePayload()` : tout ce qui n'est pas
 * `{ featureId: nombre }` est écarté, y compris à la relecture d'un stockage
 * corrompu ou altéré.
 *
 * Politique de robustesse (identique à `featureFlags.ts` / `schemaVersion.ts`) :
 *   - lecture TOLÉRANTE : un JSON corrompu ou illisible ⇒ `{}` (jamais
 *     d'exception) ;
 *   - écriture BEST-EFFORT : un stockage indisponible (quota, mode privé,
 *     absence de `localStorage`) n'échoue JAMAIS et ne bloque JAMAIS le rendu ;
 *   - carte BORNÉE : au plus `MAX_TRACKED_FEATURES` fonctionnalités suivies et
 *     un compteur plafonné — la taille du stockage reste prévisible.
 *
 * Kill switch : l'enregistrement est coupé par le drapeau `usage-stats`
 * (`featureFlags`, FAIL-OPEN — actif par défaut). La lecture locale reste
 * possible pour afficher ce qui a déjà été compté.
 */
import { isFeatureEnabled } from "./featureFlags";

/** Clé localStorage du compteur d'usage local (jamais de PII). */
export const USAGE_STATS_STORAGE_KEY = "lumina-usage-stats";

/** Nombre maximal de fonctionnalités distinctes suivies (borne du stockage). */
export const MAX_TRACKED_FEATURES = 50;

/** Plafond d'un compteur (évite un débordement de stockage sur un usage intensif). */
export const MAX_FEATURE_COUNT = 1_000_000;

/** Drapeau de désactivation (fail-open : absent ⇒ actif). */
export const USAGE_STATS_FLAG = "usage-stats";

/**
 * Forme canonique d'un identifiant de fonctionnalité : `namespace:slug`.
 * Le motif est volontairement STRICT — il rejette tout ce qui pourrait
 * transporter une donnée personnelle (`@`, espaces, majuscules, texte libre).
 * Le `namespace` doit en outre appartenir à une LISTE BLANCHE : sans cela une
 * clé comme `user:42` ou `email:jean` serait acceptée telle quelle.
 */
const FEATURE_ID_PATTERN = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/;

/** Namespaces autorisés — un identifiant hors de cette liste est refusé. */
export const FEATURE_ID_NAMESPACES = ["screen", "action"] as const;

/** Compteurs d'usage : `{ "screen:dashboard": 12, … }`. */
export type UsageStats = Record<string, number>;

/** Un identifiant est-il une fonctionnalité valide (donc anonyme) ? */
export function isValidFeatureId(id: unknown): id is string {
  if (typeof id !== "string" || !FEATURE_ID_PATTERN.test(id)) return false;
  const namespace = id.slice(0, id.indexOf(":"));
  return (FEATURE_ID_NAMESPACES as readonly string[]).includes(namespace);
}

/**
 * Ne conserve QUE des paires `{ featureId: nombre }` valides. Toute clé non
 * conforme (donc potentiellement porteuse de PII) et toute valeur non numérique
 * sont ÉCARTÉES. C'est le contrat « le payload qui pourrait sortir de
 * l'appareil ne contient que des compteurs ».
 */
export function sanitizeUsagePayload(raw: unknown): UsageStats {
  if (raw === null || raw === undefined || typeof raw !== "object") return {};
  if (Array.isArray(raw)) return {};
  const out: UsageStats = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isValidFeatureId(key)) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value <= 0) continue;
    out[key] = Math.min(Math.floor(value), MAX_FEATURE_COUNT);
  }
  return out;
}

/** Lecture tolérante du stockage local (corrompu / absent ⇒ `{}`). */
function readStats(): UsageStats {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(USAGE_STATS_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeUsagePayload(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Écriture best-effort (jamais d'exception remontée à l'appelant). */
function writeStats(stats: UsageStats): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(USAGE_STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    /* stockage indisponible : le compteur reste en mémoire seulement */
  }
}

/** Les compteurs locaux courants (copie défensive, jamais de référence interne). */
export function getUsageStats(): UsageStats {
  return readStats();
}

/**
 * Incrémente le compteur d'une fonctionnalité. NON bloquant : ne lève jamais,
 * n'attend rien, ne rend rien. Un identifiant invalide (donc potentiellement
 * porteur de PII) est refusé silencieusement.
 */
export function recordUsage(featureId: string): void {
  try {
    if (!isFeatureEnabled(USAGE_STATS_FLAG)) return;
    if (!isValidFeatureId(featureId)) return;
    const stats = readStats();
    const alreadyTracked = Object.prototype.hasOwnProperty.call(stats, featureId);
    if (!alreadyTracked && Object.keys(stats).length >= MAX_TRACKED_FEATURES) {
      return; // borne atteinte : on n'ajoute plus de nouvelle fonctionnalité
    }
    stats[featureId] = Math.min((stats[featureId] ?? 0) + 1, MAX_FEATURE_COUNT);
    writeStats(stats);
  } catch {
    /* jamais bloquant : l'instrumentation ne doit pas casser le rendu */
  }
}

/** Remet tous les compteurs locaux à zéro (action explicite de l'utilisateur). */
export function clearUsageStats(): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(USAGE_STATS_STORAGE_KEY);
  } catch {
    /* stockage indisponible : rien à effacer */
  }
}

/**
 * Écrans « clés » suivis par le routeur (navigation). Liste centralisée et
 * volontairement courte : on ne trace pas chaque URL, seulement les écrans à
 * forte valeur produit.
 */
export const KEY_SCREEN_IDS: Readonly<Record<string, string>> = {
  "/dashboard": "screen:dashboard",
  "/finance": "screen:finance",
  "/members": "screen:members",
  "/groups": "screen:groups",
  "/events": "screen:events",
  "/reports": "screen:reports",
  "/balance": "screen:balance",
  "/budgets": "screen:budgets",
  "/giving": "screen:giving",
  "/trace": "screen:trace",
  "/help": "screen:help",
  "/settings": "screen:settings",
};

/**
 * Enregistre l'usage d'un ÉCRAN à partir de son chemin (query/hash ignorés).
 * Un chemin non listé n'est pas compté (pas de trace exhaustive).
 */
export function recordScreenUsage(pathname: string): void {
  const clean =
    (pathname.split("?")[0].split("#")[0] || "/").replace(/\/+$/, "") || "/";
  const id = KEY_SCREEN_IDS[clean];
  if (id) recordUsage(id);
}
