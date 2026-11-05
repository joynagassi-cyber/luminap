/**
 * Ratchet lint « zéro nouveau littéral de couleur » (plan P1 lot 6).
 *
 *   node --experimental-strip-types scripts/design-ratchet.mjs           # vérifie
 *   node --experimental-strip-types scripts/design-ratchet.mjs --update  # fige la baseline
 *
 * Balaye src/ (TS/TSX via la règle ESLint locale design/no-hardcoded-colors,
 * CSS via scanCssText) hors de src/design-system/tokens/ et des tests, puis
 * compare à scripts/design-ratchet-baseline.json : tout littéral absent de la
 * baseline est une erreur bloquante. Exécuté par `pnpm lint` (CI comprise).
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ESLint } from "eslint";
import {
  noHardcodedColors,
  RATCHET_MESSAGE_PREFIX as RULE_PREFIX,
} from "./eslint-rules/no-hardcoded-colors.mjs";
import {
  RATCHET_MESSAGE_PREFIX,
  scanCssText,
  parseRuleMessage,
  diffAgainstBaseline,
  buildBaseline,
} from "../src/design-system/ratchet/ratchet-core.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASELINE_PATH = join(ROOT, "scripts", "design-ratchet-baseline.json");

if (RULE_PREFIX !== RATCHET_MESSAGE_PREFIX) {
  console.error(
    "design-ratchet: préfixe de message incohérent entre la règle ESLint et ratchet-core.",
  );
  process.exit(2);
}

const toRel = (abs) => relative(ROOT, abs).split(sep).join("/");

/** Fichiers TS/TSX soumis au ratchet (hors zone de jetons et tests). */
const TS_IGNORES = [
  "src/design-system/tokens/**",
  "**/__tests__/**",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/*.spec.ts",
  "**/*.spec.tsx",
];

async function scanTs() {
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfig: [
      {
        files: ["src/**/*.{ts,tsx}"],
        ignores: TS_IGNORES,
        rules: { "design/no-hardcoded-colors": "error" },
      },
    ],
  });
  const results = await eslint.lintFiles(["src/**/*.{ts,tsx}"]);
  const current = {};
  for (const result of results) {
    const rel = toRel(result.filePath);
    for (const msg of result.messages) {
      if (msg.ruleId !== "design/no-hardcoded-colors") continue;
      const value = parseRuleMessage(msg.message);
      if (value === null) continue;
      (current[rel] ??= []).push({ line: msg.line, match: value });
    }
  }
  return current;
}

function scanCssFiles() {
  const current = {};
  const entries = readdirSync(join(ROOT, "src"), { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".css")) continue;
    const abs = join(entry.parentPath ?? entry.path, entry.name);
    const rel = toRel(abs);
    if (rel.startsWith("src/design-system/tokens/")) continue;
    const matches = scanCssText(readFileSync(abs, "utf8"));
    if (matches.length > 0) current[rel] = matches;
  }
  return current;
}

function loadBaseline() {
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  } catch {
    console.error(
      `design-ratchet: baseline introuvable ou invalide (${BASELINE_PATH}). ` +
        `Générez-la avec : pnpm lint:ratchet:update`,
    );
    process.exit(2);
  }
}

function printViolation(v) {
  let snippet = "";
  try {
    const line = readFileSync(join(ROOT, v.file), "utf8").split("\n")[v.line - 1];
    if (line) snippet = `\n    ${line.trim()}`;
  } catch {
    /* fichier supprimé entre-temps : on garde juste la référence */
  }
  console.error(`  ${v.file}:${v.line}  ${v.match}${snippet}`);
}

async function main() {
  const update = process.argv.includes("--update");
  const current = { ...(await scanTs()), ...scanCssFiles() };
  // Fusionne les entrées doublons éventuelles TS/CSS (un .ts ne peut pas être .css).
  const total = Object.values(current).reduce((n, m) => n + m.length, 0);

  if (update) {
    writeFileSync(BASELINE_PATH, JSON.stringify(buildBaseline(current), null, 2) + "\n");
    console.log(`design-ratchet: baseline figée (${total} littéraux, ${Object.keys(current).length} fichiers).`);
    return;
  }

  const baseline = loadBaseline();
  const fresh = diffAgainstBaseline(current, baseline);
  if (fresh.length > 0) {
    console.error(
      `design-ratchet: ${fresh.length} NOUVEAU(x) littéral(aux) de couleur hors de src/design-system/tokens/ :\n`,
    );
    for (const v of fresh) printViolation(v);
    console.error(
      "\nUtilisez var(--lu-*) (voir docs/design-system-spec.md §0). " +
        "Si le littéral est légitime et revu, figez-le explicitement : pnpm lint:ratchet:update",
    );
    process.exit(1);
  }
  console.log(`design-ratchet: OK (${total} littéraux suivis, aucun nouveau).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("design-ratchet: erreur interne:", err);
    process.exit(2);
  });
}
