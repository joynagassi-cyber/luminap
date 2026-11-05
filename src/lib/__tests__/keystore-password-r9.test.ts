/**
 * Garde R9 — le mot de passe du keystore Android ne doit jamais être un
 * littéral autonome dans le dépôt (public).
 *
 * CLASSE DE DÉFAUT : `scripts/generate-keystore*.{sh,js,py}` (et les scripts
 * d'empreintes) codaient `lumina1234` en dur comme mot de passe du keystore de
 * signature. Si un keystore de release était généré avec ce mot de passe, la
 * clé de signature était compromise.
 *
 * Correctif : les scripts lisent désormais le mot de passe depuis
 * `LUMINA_KEYSTORE_PASSWORD` (variable d'environnement) avec un repli de
 * développement explicitement balisé. Le workflow de release, lui, utilise les
 * secrets GitHub (`ANDROID_KEYSTORE_*`) et n'appelle aucun de ces scripts.
 *
 * Invariant verrouillé : tout fichier de `scripts/` qui MENTIONNE le littéral
 * doit AUSSI référencer la variable d'environnement (donc le littéral n'est
 * jamais une valeur autonome, seulement un repli).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, join } from "path";

const root = resolve(__dirname, "../../..");
const SCRIPTS_DIR = resolve(root, "scripts");
const LITERAL = "lumina1234";
const ENV_VAR = "LUMINA_KEYSTORE_PASSWORD";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|mjs|cjs|js|sh|py)$/.test(entry)) out.push(p);
  }
  return out;
}

describe("R9 — mot de passe keystore jamais autonome dans le dépôt", () => {
  const files = existsSync(SCRIPTS_DIR) ? walk(SCRIPTS_DIR) : [];

  it("la garde n'est pas vacuité : au moins un script cite le littéral", () => {
    const mentioning = files.filter((f) =>
      readFileSync(f, "utf8").includes(LITERAL),
    );
    expect(mentioning.length).toBeGreaterThan(0);
  });

  it("tout script citant le littéral le source depuis la variable d'env", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (src.includes(LITERAL) && !src.includes(ENV_VAR)) {
        offenders.push(f);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
