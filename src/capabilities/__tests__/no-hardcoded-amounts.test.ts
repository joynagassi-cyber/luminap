/**
 * Rule: no capability may hardcode a default amount for a cotisation
 * or any monetary field.
 *
 * Rationale: the business rule is that the USER always chooses the
 * cotisation amount. A capability that defaults `montantCotisationCents`,
 * `amount`, or similar to a literal > 0 silently violates that rule.
 *
 * Whitelist: the `policy` capability is explicitly allowed to define
 * bounds (min/max) because it IS the bounds module.
 *
 * Run with: pnpm test src/capabilities/__tests__/no-hardcoded-amounts.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const CAPS = [
  "cotisation",
  "federation",
  "invitation",
  "lifecycle",
  "notification",
  "organization",
  "relationship",
  "resource",
  "security",
  "workflow",
];

// These capabilities are allowed to define numeric bounds on amounts:
const WHITELIST_CAPS = new Set<string>(["policy"]);

describe("No hardcoded default amounts in capabilities", () => {
  const root = resolve(__dirname, "../../..");

  for (const cap of [...CAPS, "policy"]) {
    if (WHITELIST_CAPS.has(cap)) continue;

    const f = resolve(root, `src/capabilities/${cap}/index.ts`);
    if (!existsSync(f)) continue;
    const content = readFileSync(f, "utf-8");

    it(`'${cap}' does not default an amount to a literal > 0`, () => {
      // Pattern: `montantCotisationCents: 5000`, `amount = 100`,
      // `DEFAULT_AMOUNT = 5000`.
      //
      // A zero-initialisation (e.g. `montantPaye: 0`) is a safe starting
      // value, not a hard default — allowed.
      const forbidden = content.match(
        /\b(?:DEFAULT_[A-Z_]*AMOUNT[A-Z_]*|AMOUNT_DEFAULT|montant[A-Z]\w*|amount\w*|montant)\w*\s*[:=]\s*\d+(?:\.\d+)?/g,
      );
      const nonZero = (forbidden ?? []).filter((m) => {
        const num = m.split(/[:=]/).pop()?.trim() ?? "0";
        return Number(num) > 0;
      });
      expect(
        nonZero,
        `hardcoded amount found in '${cap}': ${nonZero.join(", ")}`,
      ).toEqual([]);
    });
  }
});
