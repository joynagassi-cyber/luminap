import { describe, expect, it } from "vitest";
import {
  RATCHET_MESSAGE_PREFIX,
  buildBaseline,
  diffAgainstBaseline,
  parseRuleMessage,
  scanCssText,
} from "@/design-system/ratchet/ratchet-core";

describe("ratchet lint design — scanCssText", () => {
  it("détecte hex et fonctions de couleur avec numéros de ligne", () => {
    const css = [
      "/* commentaire avec #fff dans un commentaire */",
      ".a { color: #FF6B00; background: rgb(1, 2, 3); }",
      ".b { border-color: var(--lu-border); }",
      ".c { color: hsla(120, 50%, 50%, 0.5); }",
    ].join("\n");
    const matches = scanCssText(css);
    expect(matches.map((m) => m.match)).toEqual([
      "#fff",
      "#FF6B00",
      "rgb(",
      "hsla(",
    ]);
    expect(matches.map((m) => m.line)).toEqual([1, 2, 2, 4]);
  });

  it("ne signale pas les var(--lu-*)", () => {
    expect(scanCssText(".a { color: var(--lu-fg); }")).toEqual([]);
  });
});

describe("ratchet lint design — parseRuleMessage", () => {
  it("extrait la valeur brute d'un message de la règle ESLint", () => {
    expect(parseRuleMessage(`${RATCHET_MESSAGE_PREFIX}#FF6B00`)).toBe("#FF6B00");
    expect(parseRuleMessage(`${RATCHET_MESSAGE_PREFIX}style.color:red`)).toBe(
      "style.color:red",
    );
  });

  it("ignore les messages qui ne viennent pas de la règle", () => {
    expect(parseRuleMessage("Parsing error: x")).toBeNull();
    expect(parseRuleMessage(RATCHET_MESSAGE_PREFIX)).toBeNull();
  });
});

describe("ratchet lint design — diffAgainstBaseline (ratchet)", () => {
  it("bloque uniquement les littéraux absents de la baseline", () => {
    const current = {
      "src/a.ts": [
        { line: 1, match: "#FF6B00" },
        { line: 2, match: "#123456" }, // nouveau
      ],
      "src/b.css": [{ line: 5, match: "rgb(" }],
    };
    const baseline = buildBaseline({
      "src/a.ts": [{ line: 9, match: "#FF6B00" }],
      "src/b.css": [{ line: 1, match: "rgb(" }],
    });
    const fresh = diffAgainstBaseline(current, baseline);
    expect(fresh).toEqual([{ file: "src/a.ts", line: 2, match: "#123456" }]);
  });

  it("accepte les disparitions (baseline qui diminue) et les fichiers nouveaux vides", () => {
    const baseline = buildBaseline({
      "src/old.ts": [{ line: 1, match: "#fff" }],
    });
    expect(diffAgainstBaseline({}, baseline)).toEqual([]);
    expect(
      diffAgainstBaseline({ "src/ok.ts": [] }, { version: 1, files: {} }),
    ).toEqual([]);
  });

  it("compte les occurrences : au-delà du compte baseliné, c'est nouveau", () => {
    const baseline = buildBaseline({
      "src/a.ts": [
        { line: 1, match: "#fff" },
        { line: 2, match: "#fff" },
      ],
    });
    const fresh = diffAgainstBaseline(
      {
        "src/a.ts": [
          { line: 1, match: "#fff" },
          { line: 2, match: "#fff" },
          { line: 3, match: "#fff" },
        ],
      },
      baseline,
    );
    expect(fresh).toEqual([{ file: "src/a.ts", line: 3, match: "#fff" }]);
  });

  it("buildBaseline produit une baseline triée et déterministe", () => {
    const a = buildBaseline({ "src/a.ts": [{ line: 2, match: "#bbb" }, { line: 1, match: "#aaa" }] });
    const b = buildBaseline({ "src/a.ts": [{ line: 1, match: "#aaa" }, { line: 2, match: "#bbb" }] });
    expect(a).toEqual(b);
    expect(a.files["src/a.ts"]).toEqual(["#aaa", "#bbb"]);
  });
});
