// @vitest-environment node
/**
 * Garde d'intégrité des assets statiques publics.
 *
 * Défaut visé (mesuré) : `public/lumina-logo.png` a été SUPPRIMÉ au commit
 * `bbac477` alors que 6 écrans continuaient de le référencer
 * (`AuthPage`, `OrgSetup`, `Onboarding`, `SettingsAbout`, `SettingsProfile`,
 * `TopHeader`). Résultat : images cassées (icône de marque manquante) partout,
 * sans qu'aucun test ne le détecte — un asset supprimé ne casse ni le build ni
 * les tests tant que la référence reste une simple chaîne.
 *
 * NON-VACUITÉ : ce test ÉCHOUE sur l'arbre d'avant correctif
 * (`lumina-logo.png` absent de `public/`). Il échoue dès qu'un fichier
 * `public/<nom>` référencé en dur depuis `src/` n'existe plus.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

const SRC = resolve(__dirname, "../..");
const PUBLIC = resolve(SRC, "../public");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Références statiques `/foo/bar.ext` trouvées dans `src/**`. */
function publicRefs(): Map<string, string[]> {
  const refs = new Map<string, string[]>();
  const re = /["'(](\/[A-Za-z0-9_\-./]+\.(?:png|jpe?g|svg|webp|gif|ico))["')]/g;
  for (const file of walk(SRC)) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(re)) {
      const asset = m[1];
      const list = refs.get(asset) ?? [];
      list.push(file.replace(SRC + "/", ""));
      refs.set(asset, list);
    }
  }
  return refs;
}

describe("assets publics — toute référence statique existe dans public/", () => {
  const refs = publicRefs();

  it("l'inventaire de références n'est pas vide (le test mesure réellement)", () => {
    expect(refs.size).toBeGreaterThanOrEqual(2);
    expect([...refs.keys()]).toContain("/lumina-logo.png");
  });

  it("chaque asset référencé en dur depuis src/ existe dans public/", () => {
    const missing: string[] = [];
    for (const [asset, users] of refs) {
      if (!existsSync(resolve(PUBLIC, "." + asset))) {
        missing.push(`${asset} (référencé par ${users.join(", ")})`);
      }
    }
    expect(
      missing,
      `assets publics manquants :\n${missing.join("\n")}`,
    ).toEqual([]);
  });

  it("le logo de marque référencé par les écrans existe (régression bbac477)", () => {
    expect(existsSync(resolve(PUBLIC, "lumina-logo.png"))).toBe(true);
  });
});
