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
const PLATFORM_LAYER = "src/adapters/native/";

/** Motifs d'usage direct d'une API réseau navigateur. */
const PATTERNS: RegExp[] = [
  /navigator\.onLine/,
  /navigator\.connection/,
  /addEventListener\(\s*["'](?:online|offline)["']/,
];

/**
 * DETTE DE MIGRATION ASSUMÉE — sites à brancher sur `NetworkAdapter`.
 * Toute entrée retirée ici doit l'être aussi dans le code (migration).
 * Toute entrée AJOUTÉE ici doit être justifiée en revue (et datée).
 */
const KNOWN_DIRECT_SITES = new Set<string>([
  "src/store/useLocalStore.ts", // état `isOnline` du store local
  "src/lib/powersync/SupabaseConnector.ts", // garde d'upload
  "src/lib/dataLayer.ts", // hook useOnlineStatus
  "src/lib/health.ts", // diagnostic santé
  "src/lib/observability/errorReporter.ts", // garde d'envoi de rapport
  "src/lib/auth.ts", // isBrowserOffline()
  "src/pages/Health.tsx", // écran santé
  "src/context/AppContext.tsx", // écouteurs online/offline
  "src/lib/observability/ObservabilityBridge.tsx", // flush des rapports à la reconnexion
  "src/lib/observability/breadcrumbs.ts", // fil d'Ariane réseau
]);

function scanDirectSites(): Set<string> {
  const found = new Set<string>();
  for (const file of walk(join(root, "src"))) {
    const rel = toRel(file);
    if (rel.includes("__tests__") || rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) continue;
    if (rel.startsWith(PLATFORM_LAYER)) continue; // la couche plateforme a le droit
    if (!/\.(ts|tsx)$/.test(rel)) continue;
    const src = readFileSync(file, "utf8");
    if (PATTERNS.some((re) => re.test(src))) found.add(rel);
  }
  return found;
}

describe("Abstraction plateforme — API réseau navigateur (ratchet anti-dérive)", () => {
  const detected = scanDirectSites();

  it("aucun NOUVEAU site ne lit navigator.onLine / online-offline en direct", () => {
    const nouveaux = [...detected].filter((f) => !KNOWN_DIRECT_SITES.has(f));
    expect(
      nouveaux,
      `Nouveau(x) site(s) hors couche plateforme. Utiliser src/adapters/native/NetworkAdapter.ts ` +
        `(cf. docs/PLATFORM-GOVERNANCE.md §4.3). Si c'est un remplacement de dette, ` +
        `mettre à jour KNOWN_DIRECT_SITES dans ce test.`,
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
