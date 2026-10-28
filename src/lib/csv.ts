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

// Caractères de contrôle C0 en tête de cellule. TAB/CR/LF étaient déjà
// neutralisés ; les autres (NUL, VT `\v`, FF `\f`…) sont ignorés par certains
// tableurs, qui évaluent alors la formule qui suit (`"\v=1+1"` → formule).
const LEADING_CONTROL_CHARS =
  // eslint-disable-next-line no-control-regex -- neutraliser ces caractères est le but du module
  /^[\u0000-\u001F]+/;

function startsWithRiskyPrefix(text: string): boolean {
  const first = text[0];
  if (FORMULA_PREFIXES.includes(first)) return true;
  if (first === "\t" || first === "\r" || first === "\n") return true;
  const afterControls = text.replace(LEADING_CONTROL_CHARS, "");
  return (
    afterControls.length > 0 && FORMULA_PREFIXES.includes(afterControls[0])
  );
}

export function escapeCsvCell(value: unknown, delimiter = ";"): string {
  if (value == null) return "";
  let text = typeof value === "object" ? JSON.stringify(value) : String(value);

  if (text.length > 0 && startsWithRiskyPrefix(text)) {
    text = "'" + text;
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
