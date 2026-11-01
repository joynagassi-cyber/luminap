/**
 * Saisie de montant — parsing unique FR/US.
 *
 * `parseFloat` seul tronque à la virgule FR : « 1500,50 » → 1500 (les 50
 * centimes disparaissent silencieusement). Ce module est la source de vérité
 * du parsing, partagée par les écrans financiers et l'import CSV, pour qu'une
 * même saisie donne toujours le même montant.
 *
 * Module volontairement léger (aucune dépendance) : `formSystem.ts` le
 * réexporte pour ses appelants historiques, mais les pages finance importent
 * ici pour ne pas embarquer la chaîne d'import de `formSystem` (xlsx).
 */

/**
 * Parse une saisie de montant en nombre (unités, pas centimes).
 *
 * Règles (FR + US) :
 * - Espaces (y compris insécables) ignorés : « 1 000 » => 1000.
 * - Virgule suivie de 1-2 chiffres -> virgule décimale FR ("1,50" => 1.50).
 * - Virgule suivie de 3 chiffres   -> séparateur de milliers ("1,500" => 1500).
 * - Point avec 3 chiffres après    -> séparateur de milliers ("1.500" => 1500).
 * - Deux séparateurs ("1.234,56" / "1,234.56") -> le dernier est le décimal.
 * - Résultat toujours borné à 2 décimales (arrondi).
 *
 * Retourne `null` si la saisie n'est pas un montant valide (ex. "abc").
 * Les entrées déjà numériques (number) sont bornées aux 2 décimales.
 */
export function parseCurrencyAmount(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return isNaN(raw) ? null : Math.round(raw * 100) / 100;
  }
  const s = String(raw).replace(/\s|\u00a0/g, "");
  if (s === "") return null;
  if (!/^[\d.,]+$/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;
  if (lastComma !== -1 && lastDot !== -1) {
    // Les deux sont présents : le dernier est le séparateur décimal,
    // le premier le séparateur de milliers.
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandsSep = decimalSep === "," ? "." : ",";
    normalized = s
      .split(thousandsSep)
      .join("")
      .split(decimalSep)
      .join(".");
  } else if (lastComma !== -1) {
    const tail = s.slice(lastComma + 1);
    // 1-2 chiffres après => décimal ; 3+ chiffres => séparateurs de
    // milliers ("1,500" => 1500, "1,234,567" => 1234567).
    normalized =
      tail.length <= 2 ? s.split(",").join(".") : s.split(",").join("");
  } else if (lastDot !== -1) {
    const tail = s.slice(lastDot + 1);
    // Même règle avec un point seul : 3+ chiffres après => milliers
    // ("1.500" => 1500, "1.234.567" => 1234567) ; 1-2 => décimal.
    normalized = tail.length <= 2 ? s : s.split(".").join("");
  } else {
    normalized = s;
  }
  const n = parseFloat(normalized);
  if (isNaN(n)) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Parse une saisie de montant et la convertit en CENTIMES (unité de stockage).
 * Retourne `null` si la saisie est invalide — jamais `NaN`.
 */
export function parseAmountToCents(raw: unknown): number | null {
  const value = parseCurrencyAmount(raw);
  return value === null ? null : Math.round(value * 100);
}
