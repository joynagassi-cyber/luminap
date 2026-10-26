/**
 * Échappement des cellules CSV.
 *
 * Deux protections, appliquées dans cet ordre :
 *   1. Injection de formule (« CSV injection », OWASP) : une cellule
 *      commençant par `=`, `+`, `-`, `@` (ou un caractère de contrôle TAB/CR)
 *      est interprétée comme une formule par Excel / LibreOffice / Sheets.
 *      Un champ saisi par un utilisateur (`=HYPERLINK("http://…")`,
 *      `=cmd|'/c calc'!A0`, …) s'exécuterait donc à l'ouverture du fichier.
 *      On neutralise en préfixant d'une apostrophe, sans altérer le texte
 *      affiché dans un tableur.
 *   2. Citation : si la valeur contient le délimiteur, un guillemet, un saut
 *      de ligne ou un retour chariot, on l'entoure de guillemets et on double
 *      les guillemets internes (RFC 4180).
 */
const FORMULA_PREFIXES = ["=", "+", "-", "@"];

export function escapeCsvCell(value: unknown, delimiter = ";"): string {
  if (value == null) return "";
  let text = typeof value === "object" ? JSON.stringify(value) : String(value);

  if (text.length > 0) {
    const first = text[0];
    const risky =
      FORMULA_PREFIXES.includes(first) ||
      first === "\t" ||
      first === "\r" ||
      first === "\n";
    if (risky) {
      text = "'" + text;
    }
  }

  const mustQuote =
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r");
  if (mustQuote) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function escapeCsvRow(values: unknown[], delimiter = ";"): string {
  return values.map((v) => escapeCsvCell(v, delimiter)).join(delimiter);
}
