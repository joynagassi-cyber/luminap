/**
 * Architecture test: Capabilities must not import from each other or from UI.
 *
 * Rule: No capability may import from:
 * - Another capability (no cross-capability dependencies)
 * - @/pages (no UI coupling)
 * - @/components (no component coupling)
 *
 * Run with: pnpm test src/capabilities/__tests__/no-cross-imports.test.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

describe("Capability Architecture Boundaries", () => {
  const capabilities = [
    "cotisation",
    "federation",
    "invitation",
    "lifecycle",
    "notification",
    "organization",
    "policy",
    "relationship",
    "resource",
    "security",
    "workflow",
  ];
  const root = resolve(__dirname, "../../..");

  for (const cap of capabilities) {
    const capFile = resolve(root, `src/capabilities/${cap}/index.ts`);
    if (!existsSync(capFile)) continue;

    const content = readFileSync(capFile, "utf-8");

    it(`'${cap}' must not import from another capability`, () => {
      for (const otherCap of capabilities) {
        if (otherCap !== cap) {
          expect(content, `'${cap}' must not import from '@/capabilities/${otherCap}'`).not.toContain(
            `@/capabilities/${otherCap}`,
          );
        }
      }
    });

    it(`'${cap}' must not import from @/pages`, () => {
      const match = content.match(/from\s+['"]@\/pages\/[^'"]+['"]/g);
      expect(match, `'${cap}' imports from @/pages: ${match}`).toBeNull();
    });

    it(`'${cap}' must not import from @/components`, () => {
      const match = content.match(/from\s+['"]@\/components\/[^'"]+['"]/g);
      expect(match, `'${cap}' imports from @/components: ${match}`).toBeNull();
    });
  }

  it("should have no circular capability dependencies", () => {
    // Collect actual import statements (not comments/JSDoc examples)
    const allImports: string[] = [];
    for (const cap of capabilities) {
      const capFile = resolve(root, `src/capabilities/${cap}/index.ts`);
      if (!existsSync(capFile)) continue;
      const lines = readFileSync(capFile, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        // Only match actual import statements, not JSDoc comment examples
        if (
          trimmed.startsWith("import ") &&
          trimmed.includes("@/capabilities/")
        ) {
          allImports.push(trimmed);
        }
      }
    }
    // No cross-capability imports means no possible cycles
    expect(
      allImports,
      `Cross-capability imports found: ${allImports.join(", ")}`,
    ).toHaveLength(0);
  });
});
