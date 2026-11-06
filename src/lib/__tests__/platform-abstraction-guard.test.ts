// @vitest-environment node
/**
 * Garde d'abstraction plateforme — anti-dérive (cf. docs/PLATFORM-GOVERNANCE.md §4.3).
 *
 * PROBLÈME VISÉ
 * -------------
 * Lumina est un client Android natif offline-first, mais une part du code lit
 * des API **navigateur** en direct (`navigator.onLine`, `navigator.connection`,
 * écouteurs `online`/`offline`). Dans une WebView Android, `navigator.onLine`
 * est notoirement peu fiable (peut rester `true` sans connectivité réelle, ou
 * `false` pendant une reconnexion) : c'est une source plausible de bugs
 * « l'app croit être en ligne / hors ligne à contretemps ».
 *
 * Un adaptateur natif correct existe déjà (`src/adapters/native/NetworkAdapter.ts`,
 * basé sur `@capacitor/network`) : c'est LUI qui doit être la source unique.
 *
 * CE QUE CETTE GARDE FAIT
 * -----------------------
 * Elle fige la liste des sites qui lisent encore ces API en direct (dette de
 * migration assumée, documentée ci-dessous) et **échoue dès qu'un NOUVEAU site
 * apparaît**. C'est un ratchet : la dette ne peut que diminuer, jamais grossir.
 *
 * Non-vacuité : ajouter `navigator.onLine` dans un fichier hors liste fait
 * échouer « aucun nouveau site ». Retirer un site de la liste de dette (après
 * migration) sans le retirer de la liste autorisée fait échouer « dette exacte ».
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const toRel = (abs: string) => relative(root, abs).split(sep).join("/");

/** Couche plateforme : SEUL endroit autorisé à toucher les API natives. */
const PLATFORM_LAYERS = [
  "src/adapters/native/",
  "src/platform/",
  "src/lib/download.ts", // façade de sortie fichier (bug P0-2 : <a download> muet)
];

/**
 * Motifs d'usage direct d'une API web à comportement natif divergent :
 * - réseau : `navigator.onLine` peu fiable en WebView Android ;
 * - ouverture de lien : `window.open` / `target="_blank"` = no-op en WebView ;
 * - partage : `navigator.share` absent de la WebView (utiliser `shareLink`) ;
 * - téléchargement : `<a download>` = muet en WebView (bug P0-2) → `downloadBlob` ;
 * - retour matériel : écoute directe `ionBackButton`/`backbutton` → `hardwareBack` ;
 * - modulateurs système : `window.prompt`/`confirm`/`alert` = implémentés par
 *   Capacitor mais non thémables (hors charte) et hors i18n → composants Ionic
 *   (IonAlert) ou overlay maison.
 */
const PATTERNS: RegExp[] = [
  /navigator\.onLine/,
  /navigator\.connection/,
  /addEventListener\(\s*["'](?:online|offline)["']/,
  /window\.open\s*\(/,
  /target=\{?["']_blank["']\}?/,
  /navigator\.share\b/,
  /\.download\s*=/,
  /ionBackButton/,
  /addEventListener\(\s*["']backbutton["']/,
  /window\.(?:prompt|confirm|alert)\s*\(/,
];

/**
 * DETTE DE MIGRATION — VIDÉE le 2026-11-04 (PR : couche réseau plateforme).
 * Tous les sites applicatifs passent désormais par `src/platform/networkState`.
 * Ne JAMAIS réintroduire d'entrée ici : utiliser la façade.
 */
const KNOWN_DIRECT_SITES = new Set<string>([]);

function scanDirectSites(): Set<string> {
  const found = new Set<string>();
  for (const file of walk(join(root, "src"))) {
    const rel = toRel(file);
    if (rel.includes("__tests__") || rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    if (PLATFORM_LAYERS.some((layer) => rel.startsWith(layer))) continue; // couche plateforme
    if (!/\.(ts|tsx)$/.test(rel)) continue;
    const code = stripComments(readFileSync(file, "utf8"));
    if (PATTERNS.some((re) => re.test(code))) found.add(rel);
  }
  return found;
}

/** Retire commentaires de bloc et de ligne : on ne juge que le CODE réel. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("Abstraction plateforme — API réseau navigateur (ratchet anti-dérive)", () => {
  const detected = scanDirectSites();

  it("aucun NOUVEAU site n'utilise une API web divergente en direct", () => {
    const nouveaux = [...detected].filter((f) => !KNOWN_DIRECT_SITES.has(f));
    expect(
      nouveaux,
      `Nouveau(x) site(s) hors couche plateforme. Passer par la façade : ` +
        `src/platform/networkState (réseau), openExternal (liens), shareLink ` +
        `(partage), downloadBlob (sortie fichier) ou registerHardwareBack ` +
        `(retour matériel) ` +
        `(cf. docs/PLATFORM-GOVERNANCE.md §4.3). Si c'est un remplacement ` +
        `de dette, mettre à jour KNOWN_DIRECT_SITES dans ce test.`,
    ).toEqual([]);
  });

  it("la dette de migration est exacte (pas d'entrée obsolète)", () => {
    const obsoletes = [...KNOWN_DIRECT_SITES].filter((f) => !detected.has(f));
    expect(
      obsoletes,
      `Site(s) migré(s) mais encore listé(s) dans KNOWN_DIRECT_SITES : retirer pour garder la dette honnête.`,
    ).toEqual([]);
  });

  it("la couche plateforme réseau existe et est le point d'accès désigné", () => {
    const adapter = readFileSync(join(root, "src/adapters/native/NetworkAdapter.ts"), "utf8");
    expect(adapter).toMatch(/@capacitor\/network/);
    expect(adapter).toMatch(/export class NetworkAdapter/);
  });
});
