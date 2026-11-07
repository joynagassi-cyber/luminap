/**
 * Génération d'UUID v4 — compatible WebView anciennes.
 *
 * PROBLÈME VISÉ (classe R447/R448/R175)
 * ------------------------------------
 * `crypto.randomUUID()` n'existe qu'à partir de Chromium/WebView **92** (2021).
 * `minSdk` est 24 (Android 7.0) : sur un appareil ancien dont la WebView n'est
 * pas à jour, un appel direct lève un `TypeError` — or c'est le chemin CRITIQUE
 * de création d'enregistrement (offline-first). `crypto.getRandomValues`, lui,
 * est disponible depuis bien plus longtemps : on construit l'UUID v4 à la main.
 *
 * Un identifiant n'est pas un secret : en dernier recours (aucune source
 * `crypto`), `Math.random()` suffit (résistance aux collisions, pas
 * d'imprévisibilité requise). NE PAS utiliser ce module pour générer un jeton.
 */

/** Construit un UUID v4 à partir d'octets aléatoires. */
function uuidV4FromBytes(bytes: Uint8Array): string {
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20)}`
  );
}

/** UUID v4, avec repli pour les WebView sans `crypto.randomUUID`. */
export function randomUUID(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return uuidV4FromBytes(bytes);
}
