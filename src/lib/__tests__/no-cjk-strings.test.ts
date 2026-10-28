/**
 * R121 — Garde anti-dérive : aucune chaîne de texte utilisateur en écriture CJK.
 *
 * Trois messages d'erreur affichés à l'utilisateur étaient restés en chinois
 * (reliquats d'un gabarit) dans le flux finance :
 *   - `Versement.tsx`        : "余额检查失败"
 *   - `TransactionEdit.tsx`  : "请填完整必填项" et "金额无效"
 *
 * L'interface est en français ; un utilisateur voyant un message en chinois ne
 * peut pas comprendre l'erreur. Ce test échoue dès qu'une chaîne CJK réapparaît
 * dans le code source (hors tests, qui peuvent légitimement en contenir).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";

const SRC = resolve(__dirname, "../..");
// Idéogrammes CJK + kana uniquement. On EXCLUT les formes pleine largeur
// (\uff00-\uffef) : elles contiennent des caractères légitimes du texte
// français (ex. « ＋ » du tutoriel, U+FF0B), source de faux positifs.
const CJK = /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("R121 — aucune chaîne CJK dans le code source (UI française)", () => {
  it("aucun fichier source hors tests ne contient de caractère CJK", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const src = readFileSync(file, "utf8");
      src.split("\n").forEach((line, i) => {
        if (CJK.test(line)) {
          offenders.push(`${file.replace(SRC + "/", "")}:${i + 1}`);
        }
      });
    }
    expect(
      offenders,
      `chaînes CJK détectées (UI en français) : ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
