/**
 * Cœur du ratchet lint « zéro nouveau littéral de couleur » (plan P1 lot 6).
 *
 * Principe : on ne supprime pas les littéraux historiques d'un coup. La
 * baseline (`scripts/design-ratchet-baseline.json`) fige l'existant ; toute
 * occurrence QUI N'Y EST PAS est une erreur bloquante. La baseline ne peut
 * que diminuer (décrémentée en P4/P5), jamais augmenter sans une
 * régénération explicite et revue (`pnpm lint:ratchet:update`).
 *
 * Ce module ne fait que du calcul pur (testable) ; le runner Node est
 * `scripts/design-ratchet.mjs`, la règle ESLint est
 * `scripts/eslint-rules/no-hardcoded-colors.mjs` (les constantes partagées
 * y sont définies pour rester chargeables sans type-stripping). Le runner
 * `scripts/design-ratchet.mjs` vérifie au démarrage que les préfixes de
 * message des deux modules coincident.
 */
import {
  RATCHET_MESSAGE_PREFIX,
  HEX_RE,
  COLOR_FUNC_RE,
} from "../../../scripts/eslint-rules/no-hardcoded-colors.mjs";

export { RATCHET_MESSAGE_PREFIX, HEX_RE, COLOR_FUNC_RE };

export interface ScanMatch {
  line: number;
  match: string;
}

/** Extrait les littéraux de couleur d'un texte CSS, ligne par ligne. */
export function scanCssText(text: string): ScanMatch[] {
  const out: ScanMatch[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of [HEX_RE, COLOR_FUNC_RE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        out.push({ line: i + 1, match: m[0] });
      }
    }
  }
  return out;
}

/**
 * Extrait la valeur brute d'un message de la règle ESLint
 * (`design-ratchet <valeur>` ; la valeur est interpolée telle quelle).
 */
export function parseRuleMessage(message: string): string | null {
  if (!message.startsWith(RATCHET_MESSAGE_PREFIX)) return null;
  const value = message.slice(RATCHET_MESSAGE_PREFIX.length);
  return value.length > 0 ? value : null;
}

export interface Baseline {
  version: 1;
  /** fichier (chemin relatif posix) -> multiset des littéraux constatés. */
  files: Record<string, string[]>;
}

export interface NewViolation {
  file: string;
  line: number;
  match: string;
}

/**
 * Compare l'état courant à la baseline : tout littéral présent dans `current`
 * mais absent (ou au-delà du compte autorisé) de la baseline est une
 * violation « nouvelle ». Les disparitions sont acceptées (ratchet).
 */
export function diffAgainstBaseline(
  current: Record<string, ScanMatch[]>,
  baseline: Baseline,
): NewViolation[] {
  const fresh: NewViolation[] = [];
  for (const [file, matches] of Object.entries(current)) {
    const pool = [...(baseline.files[file] ?? [])];
    for (const { line, match } of matches) {
      const idx = pool.indexOf(match);
      if (idx >= 0) {
        pool.splice(idx, 1);
      } else {
        fresh.push({ file, line, match });
      }
    }
  }
  fresh.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return fresh;
}

/** Construit une baseline triée (déterministe) à partir de l'état courant. */
export function buildBaseline(current: Record<string, ScanMatch[]>): Baseline {
  const files: Record<string, string[]> = {};
  for (const [file, matches] of Object.entries(current)) {
    files[file] = matches.map((m) => m.match).sort();
  }
  return { version: 1, files };
}
