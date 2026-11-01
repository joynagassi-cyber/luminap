// @vitest-environment node
/**
 * Garde anti-régression — audience JWT du service PowerSync (R132).
 *
 * Le service PowerSync Cloud rejette TOUT jeton utilisateur Supabase quand
 * `client_auth.additional_audiences` ne contient pas `"authenticated"` :
 *   401 `PSYNC_S2105 — Unexpected "aud" claim value: "authenticated"`.
 *
 * Pourquoi : Supabase impose `aud: "authenticated"` dans les jetons utilisateur,
 * et le collecteur JWKS explicite (`jwks_uri`) est enregistré SANS
 * `requiresAudience` — il retombe donc sur `additional_audiences`. Avec `[]`,
 * la validation échoue sur CHAQUE jeton → PowerSync ne devient jamais
 * `connected` → toutes les pages gardées par la disponibilité restent sur leur
 * squelette de chargement (écran muet perpétuel, P0). Le correctif
 * (`additional_audiences: ["authenticated"]`) est déjà déployé ; le risque
 * résiduel est qu'un futur déploiement le retire ou le vide, ce qui recasserait
 * toute la synchronisation sans aucun signal en CI.
 *
 * Cette garde statique verrouille le champ dans `powersync/service.yaml`.
 * Non-vacuité : le même validateur, appliqué à des YAML mutés EN MÉMOIRE
 * (champ retiré / vidé / mauvaise audience), doit les rejeter.
 *
 * Aucune dépendance externe (parseur YAML minimal inclus) : le test tourne
 * hors-ligne et sous le node-linker isolé de pnpm (js-yaml n'y est pas
 * résolvable depuis `src/`).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICE_YAML = resolve(__dirname, "../../../powersync/service.yaml");
const REQUIRED_AUDIENCE = "authenticated";

// ─────────────────────────────────────────────────────────────────────────────
// Parseur YAML minimal (sous-ensemble strictement nécessaire à service.yaml) :
// maps imbriquées, séquences en bloc (`- item`) et en flux (`[...]`),
// scalaires, commentaires pleine-ligne et en fin de ligne. Pur, sans I/O.
// ─────────────────────────────────────────────────────────────────────────────

/** Retire un commentaire `# …` en fin de ligne, hors guillemets. */
function stripInlineComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "#" && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

/** Découpe `clé: valeur` sur le PREMIER `:` (les URL gardent les leurs). */
function splitPair(content: string): [string, string] {
  const idx = content.indexOf(":");
  if (idx === -1) return [content.trim(), ""];
  return [content.slice(0, idx).trim(), content.slice(idx + 1).trim()];
}

/** Découpe une liste en flux en respectant guillemets et crochets imbriqués. */
function splitTopLevel(inner: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = "";
  for (const c of inner) {
    if (quote) {
      cur += c;
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      cur += c;
    } else if (c === "[" || c === "{") {
      depth++;
      cur += c;
    } else if (c === "]" || c === "}") {
      depth--;
      cur += c;
    } else if (c === sep && depth === 0) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.trim() !== "") out.push(cur);
  return out;
}

function parseScalar(s: string): unknown {
  if (s.startsWith("[")) return parseFlowSequence(s);
  if (s.startsWith("{")) return parseFlowMapping(s);
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (/^-?\d+$/.test(s)) return Number(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseFlowSequence(s: string): unknown[] {
  const inner = s.replace(/^\[/, "").replace(/\]$/, "").trim();
  if (inner === "") return [];
  return splitTopLevel(inner, ",").map((x) => parseScalar(x.trim()));
}

function parseFlowMapping(s: string): Record<string, unknown> {
  const inner = s.replace(/^\{/, "").replace(/\}$/, "").trim();
  const obj: Record<string, unknown> = {};
  if (inner === "") return obj;
  for (const pair of splitTopLevel(inner, ",")) {
    const [k, v] = splitPair(pair.trim());
    obj[k] = v === "" ? null : parseScalar(v);
  }
  return obj;
}

/** Parse le sous-ensemble YAML de `service.yaml` en objet JS. */
export function parseYamlSubset(text: string): Record<string, unknown> {
  const lines = text
    .split(/\r?\n/)
    .map(stripInlineComment)
    .filter((l) => l.trim() !== "" && !l.trim().startsWith("#"))
    .map((l) => ({ indent: (l.match(/^ */)?.[0].length ?? 0), content: l.trim() }));

  let idx = 0;

  function parseMapping(indent: number): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    while (idx < lines.length) {
      const line = lines[idx];
      if (line.indent < indent || line.content.startsWith("- ")) break;
      const [key, rest] = splitPair(line.content);
      idx++;
      if (rest === "") {
        obj[key] =
          idx < lines.length && lines[idx].indent > indent
            ? parseValue(lines[idx].indent)
            : null;
      } else {
        obj[key] = parseScalar(rest);
      }
    }
    return obj;
  }

  function parseSequence(indent: number): unknown[] {
    const arr: unknown[] = [];
    while (idx < lines.length) {
      const line = lines[idx];
      if (line.indent < indent || !line.content.startsWith("- ")) break;
      const rest = line.content.slice(2).trim();
      idx++;
      if (rest === "") {
        arr.push(
          idx < lines.length && lines[idx].indent > indent
            ? parseValue(lines[idx].indent)
            : null,
        );
        continue;
      }
      if (/^[^:]+:(\s|$)/.test(rest)) {
        // Élément de séquence dont la 1re paire est en ligne (`- type: x`).
        const obj: Record<string, unknown> = {};
        const [k, v] = splitPair(rest);
        if (v === "") {
          obj[k] =
            idx < lines.length && lines[idx].indent > line.indent
              ? parseValue(lines[idx].indent)
              : null;
        } else {
          obj[k] = parseScalar(v);
        }
        while (idx < lines.length && lines[idx].indent > indent) {
          const l = lines[idx];
          const [k2, v2] = splitPair(l.content);
          idx++;
          if (v2 === "") {
            obj[k2] =
              idx < lines.length && lines[idx].indent > l.indent
                ? parseValue(lines[idx].indent)
                : null;
          } else {
            obj[k2] = parseScalar(v2);
          }
        }
        arr.push(obj);
      } else {
        arr.push(parseScalar(rest));
      }
    }
    return arr;
  }

  function parseValue(indent: number): unknown {
    if (idx >= lines.length) return null;
    return lines[idx].content.startsWith("- ") ? parseSequence(indent) : parseMapping(indent);
  }

  return parseMapping(lines[0]?.indent ?? 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Validateur — même code utilisé pour le fichier réel ET les mutations.
// ─────────────────────────────────────────────────────────────────────────────

export interface AudienceVerdict {
  ok: boolean;
  audiences: string[];
  problems: string[];
}

/** Vérifie `client_auth.additional_audiences` dans un texte YAML donné. */
export function validateAdditionalAudiences(yamlText: string): AudienceVerdict {
  const problems: string[] = [];
  const root = parseYamlSubset(yamlText);
  const clientAuth = root.client_auth as Record<string, unknown> | undefined;

  if (!clientAuth || typeof clientAuth !== "object") {
    return { ok: false, audiences: [], problems: ["bloc `client_auth` absent"] };
  }

  const aud = clientAuth.additional_audiences;
  if (aud === undefined) {
    problems.push("`client_auth.additional_audiences` absent");
  } else if (!Array.isArray(aud)) {
    problems.push("`client_auth.additional_audiences` n'est pas une liste");
  } else if (aud.length === 0) {
    problems.push("`client_auth.additional_audiences` est vide");
  } else if (!aud.includes(REQUIRED_AUDIENCE)) {
    problems.push(
      `\`client_auth.additional_audiences\` n'inclut pas "${REQUIRED_AUDIENCE}" (reçu : ${JSON.stringify(aud)})`,
    );
  }

  return {
    ok: problems.length === 0,
    audiences: Array.isArray(aud) ? (aud as string[]) : [],
    problems,
  };
}

/** Lève une erreur explicite (R132) si le texte YAML ne satisfait pas la garde. */
function assertAudiences(yamlText: string): AudienceVerdict {
  const verdict = validateAdditionalAudiences(yamlText);
  if (!verdict.ok) {
    throw new Error(
      `[R132] Audience PowerSync invalide : ${verdict.problems.join(" ; ")}. ` +
        `Conséquence : le service rejette CHAQUE jeton Supabase ` +
        `(401 PSYNC_S2105 — Unexpected "aud" claim value: "authenticated") → ` +
        `PowerSync ne devient jamais \`connected\` → toute la synchronisation ` +
        `casse (écran muet perpétuel sur toutes les pages gardées par la disponibilité). ` +
        `Attendu dans powersync/service.yaml : ` +
        `client_auth.additional_audiences: ["${REQUIRED_AUDIENCE}"].`,
    );
  }
  return verdict;
}

const realYaml = readFileSync(SERVICE_YAML, "utf8");

describe("R132 — audience JWT PowerSync (`client_auth.additional_audiences`)", () => {
  it("`powersync/service.yaml` autorise bien l'audience \"authenticated\"", () => {
    const verdict = assertAudiences(realYaml);
    expect(verdict.audiences).toContain(REQUIRED_AUDIENCE);
  });

  it("non-vacuité du parseur : la structure imbriquée est réellement résolue", () => {
    // Sans ceci, un parseur défaillant (objet vide) ferait passer la garde
    // en « absence de champ » et le test ci-dessus échouerait — on ancre donc
    // la lecture sur d'autres champs connus du même bloc.
    const root = parseYamlSubset(realYaml);
    const clientAuth = root.client_auth as Record<string, unknown>;
    expect(clientAuth.supabase).toBe(true);
    expect(String(clientAuth.jwks_uri)).toContain("supabase.co");
    expect(clientAuth.jwks).toEqual({ keys: [] });
    // La connexion de réplication (map dans une séquence en bloc) est lue.
    const conn = (root.replication as { connections: unknown[] }).connections[0] as Record<
      string,
      unknown
    >;
    expect(conn.type).toBe("postgresql");
    expect(conn.port).toBe(5432);
  });

  it("le commentaire d'avertissement P0 (PSYNC_S2105) est toujours présent", () => {
    expect(realYaml).toContain("PSYNC_S2105");
    expect(realYaml).toMatch(/additional_audiences/);
  });

  describe("non-vacuité : le validateur rejette les YAML mutés (en mémoire)", () => {
    it("champ retiré", () => {
      const mutated = realYaml.replace(/^[ \t]*additional_audiences:.*$/m, "");
      expect(mutated).not.toBe(realYaml);
      expect(validateAdditionalAudiences(mutated).ok).toBe(false);
    });

    it("liste vidée", () => {
      const mutated = realYaml.replace(
        /additional_audiences:\s*\[[^\]]*\]/,
        "additional_audiences: []",
      );
      expect(mutated).not.toBe(realYaml);
      expect(validateAdditionalAudiences(mutated).ok).toBe(false);
    });

    it("mauvaise audience", () => {
      const mutated = realYaml.replace(
        /additional_audiences:\s*\[[^\]]*\]/,
        'additional_audiences: ["some-other-aud"]',
      );
      expect(mutated).not.toBe(realYaml);
      expect(validateAdditionalAudiences(mutated).ok).toBe(false);
    });

    it("champ commenté", () => {
      const mutated = realYaml.replace(
        /^([ \t]*)additional_audiences:/m,
        "$1# additional_audiences:",
      );
      expect(mutated).not.toBe(realYaml);
      expect(validateAdditionalAudiences(mutated).ok).toBe(false);
    });

    it("le message d'échec cite R132 et la conséquence (écran muet)", () => {
      const mutated = realYaml.replace(/^[ \t]*additional_audiences:.*$/m, "");
      expect(() => assertAudiences(mutated)).toThrow(/R132/);
      expect(() => assertAudiences(mutated)).toThrow(/PSYNC_S2105/);
    });
  });
});
