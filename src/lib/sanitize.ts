/**
 * Défense en profondeur des ENTRÉES HOSTILES (Phase 8 — red team).
 *
 * Deux familles d'entrées traversent l'application :
 *   1. le texte libre (noms, descriptions, commentaires, soumissions de
 *      formulaires) — peut contenir des caractères de contrôle (NUL, BEL,
 *      escapes ANSI, retours chariot isolés) qui corrompent l'affichage, les
 *      logs, les fichiers exportés ou les en-têtes ;
 *   2. le texte destiné à un contexte HTML — s'il est interprété comme du
 *      balisage, un `<script>` injecté s'exécute (XSS stocké).
 *
 * Ce module fournit les helpers MINIMAUX et testés :
 *   - `escapeHtml`      : neutralise `& < > " '` pour tout rendu HTML ;
 *   - `normalizeText`   : supprime les caractères de contrôle, normalise les
 *                         espaces, plafonne la longueur.
 *
 * NOTE : le rendu React échappe déjà les enfants (pas de HTML parsé) ; ces
 * helpers couvrent les chemins qui CONSTRUISENT une chaîne (export, log,
 * `innerHTML`, valeur CSS, futur `dangerouslySetInnerHTML`).
 */

/** Plafond par défaut d'un champ texte libre (caractères Unicode). */
export const MAX_TEXT_LENGTH = 2000;

export interface NormalizeTextOptions {
  /** Longueur maximale conservée (défaut `MAX_TEXT_LENGTH`). */
  maxLength?: number;
  /** Réduit les suites d'espaces à un seul espace (défaut `false`). */
  collapseWhitespace?: boolean;
}

// Caractères de contrôle C0/C1 dangereux, en EXCLUANT les espaces de mise en
// forme (\t \n \v \f \r) qui sont traités séparément (→ espace).
//   \u0000-\u0008 : NUL … BS
//   \u000E-\u001F : SO … US (dont ESC \u001B → séquences ANSI)
//   \u007F-\u009F : DEL + C1
const DANGEROUS_CONTROL_CHARS =
  // eslint-disable-next-line no-control-regex -- détecter ces caractères est le but du module
  /[\u0000-\u0008\u000E-\u001F\u007F-\u009F]/g;
// Espaces de contrôle → un espace unique.
const CONTROL_WHITESPACE = /[\t\n\v\f\r]+/g;

/**
 * Supprime les caractères de contrôle et plafonne la longueur d'un texte.
 *
 * - `null` / `undefined` → `""` ;
 * - les valeurs non-chaînes sont converties (`String`) ;
 * - les caractères de contrôle (C0/C1, dont ESC) sont retirés ;
 * - les espaces de contrôle (TAB/CR/LF) deviennent un espace ;
 * - le résultat est `trim()` puis tronqué à `maxLength`.
 */
export function normalizeText(
  value: unknown,
  opts: NormalizeTextOptions = {},
): string {
  if (value == null) return "";
  const maxLength = opts.maxLength ?? MAX_TEXT_LENGTH;

  let text = typeof value === "string" ? value : String(value);
  text = text.replace(DANGEROUS_CONTROL_CHARS, "");
  text = text.replace(CONTROL_WHITESPACE, " ");
  if (opts.collapseWhitespace) text = text.replace(/ {2,}/g, " ");
  text = text.trim();
  if (maxLength >= 0) text = text.slice(0, maxLength);
  return text;
}

/**
 * Échappe une valeur pour un contexte HTML (contenu texte OU attribut).
 *
 * `& < > " '` sont remplacés par leurs entités : une valeur hostile
 * (`<img src=x onerror=…>`, `" onmouseover="…`) devient du texte inerte.
 * `null` / `undefined` → `""`.
 */
export function escapeHtml(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Caractères capables de sortir d'une valeur CSS placée dans une feuille de
// style construite en chaîne (`<style>` + `dangerouslySetInnerHTML`) :
//   < >   → fermeture de la balise <style> puis injection de balisage ;
//   { } ; → injection de règles CSS supplémentaires (exfiltration via url()).
// Les guillemets et l'antislash sont aussi retirés (évasion de contexte).
const CSS_BREAKOUT_CHARS = /[<>{};"'\\]/g;

/**
 * Neutralise une valeur destinée à une feuille de style construite en chaîne.
 *
 * Retire les caractères permettant de sortir de la valeur CSS (balise
 * `</style>`, nouvelles règles `}`/`;`, évasion par guillemets) puis plafonne
 * la longueur. Une valeur hostile devient une couleur inerte (souvent ignorée
 * par le navigateur), sans exécution ni fuite.
 */
export function sanitizeCssValue(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(CSS_BREAKOUT_CHARS, "")
    .replace(DANGEROUS_CONTROL_CHARS, "")
    .trim()
    .slice(0, 256);
}
