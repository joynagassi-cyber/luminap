/**
 * Helpers PURS de l'edge function `report-error` — identification de
 * l'appelant et clé de rate-limiting.
 *
 * Ce fichier n'importe RIEN (ni Deno, ni npm) : il est exécuté par l'edge
 * function Deno ET par les tests vitest côté dépôt. On teste ainsi la VRAIE
 * logique (extraction d'IP, hachage de bucket) plutôt qu'une réimplémentation.
 */

/** Plafonds de signalement par fenêtre d'1 heure. */
export const ANON_MAX_PER_HOUR = 5;
export const USER_MAX_PER_HOUR = 20;

/** Sel par défaut : évite de stocker une IP en clair (pas un secret crypto). */
export const DEFAULT_IP_SALT = "lumina-observability";

/**
 * Extrait l'IP cliente des en-têtes de proxy. Ordre de préférence :
 *   `cf-connecting-ip` (posé par Cloudflare, non falsifiable par le client)
 *   → 1er élément de `x-forwarded-for` (client d'origine)
 *   → `x-real-ip`.
 * Repli `"unknown"` — jamais `null` (un bucket doit toujours exister).
 */
export function extractClientIp(
  cfConnectingIp: string | null,
  forwardedFor: string | null,
  realIp: string | null = null,
): string {
  const cf = cfConnectingIp?.trim();
  if (cf) return cf;
  const first = forwardedFor?.split(",")[0]?.trim();
  if (first) return first;
  const real = realIp?.trim();
  if (real) return real;
  return "unknown";
}

/** Clé de rate-limiting d'un appelant anonyme : `ip:<sha256(salt + ip)>.` */
export async function ipBucket(ip: string, salt = DEFAULT_IP_SALT): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `ip:${hex.slice(0, 32)}`;
}

/** Clé de rate-limiting d'un appelant authentifié : `user:<uuid>`. */
export function userBucket(userId: string): string {
  return `user:${userId}`;
}

/**
 * Un appelant est ANONYME s'il n'y a pas de JWT utilisateur vérifié. Un jeton
 * présent mais invalide (session expirée) est traité comme anonyme : le rapport
 * pré-login reste ainsi capturé, sous plafond réduit.
 */
export function isAnonymousCaller(userId: string | null | undefined): boolean {
  return !userId;
}
