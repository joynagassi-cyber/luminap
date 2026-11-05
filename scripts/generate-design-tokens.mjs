/** Node 22 : --experimental-strip-types. CSS déterministe, versionné et gardé par test. */
import { writeFileSync } from "node:fs";
import { generateTokens } from "../src/design-system/tokens/generator.ts";
import { VIOLET } from "../src/design-system/tokens/themes.ts";

export function renderThemeCss(specs) {
  let css = "/* Généré par pnpm generate:tokens — ne pas modifier manuellement. */\n";
  for (const spec of specs) {
    if (!/^[a-z][a-z0-9-]*$/.test(spec.id)) throw new Error("Invalid theme id");
    for (const mode of ["dark", "light"]) {
      css += `\nhtml[data-theme="${spec.id}"][data-mode="${mode}"] {\n`;
      for (const [name, value] of Object.entries(generateTokens(spec, mode))) {
        css += `  --lu-${name}: ${value};\n`;
      }
      css += "}\n";
    }
  }
  return css;
}

// Petit miroir statique pour les triplets Ionic ; aucune dépendance couleur au boot.
export function renderBridgeTs(spec) {
  const fields = ["bg", "surface", "surface-2", "fg", "fg-subtle", "accent", "on-accent"];
  const modes = Object.fromEntries(["dark", "light"].map((mode) => {
    const tokens = generateTokens(spec, mode);
    return [mode, Object.fromEntries(fields.map((name) => [name, tokens[name]]))];
  }));
  return `/* Généré par pnpm generate:tokens — ne pas modifier. */\nexport const VIOLET_BRIDGE = ${JSON.stringify(modes, null, 2)} as const;\n`;
}

if (process.argv[1]?.endsWith("generate-design-tokens.mjs")) {
  writeFileSync(new URL("../src/design-system/tokens/themes.generated.css", import.meta.url), renderThemeCss([VIOLET]));
  writeFileSync(new URL("../src/design-system/tokens/bridge.generated.ts", import.meta.url), renderBridgeTs(VIOLET));
}
