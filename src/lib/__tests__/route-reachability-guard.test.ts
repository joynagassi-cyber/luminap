/**
 * Garde structurelle — « route montée mais inatteignable » (R49 étendu).
 *
 * Classe de défaut : une `<Route>` est montée (et inscrite au registre) mais
 * AUCUN lien de l'application n'y mène — la page existe, l'URL fonctionne si on
 * la tape, mais l'utilisateur n'a aucun chemin de navigation. Exemples trouvés :
 *   - `/admin/units` (page `OrgUnits`, montée par B.8, aucun lien entrant) ;
 *   - `/admin/roles` (page `OrgRoles`, aucun lien entrant).
 *
 * La garde vérifie que CHAQUE route montée est référencée comme cible de
 * navigation quelque part dans `src/` (hors le dossier des routes, le résolveur
 * et le registre — qui *déclarent* la route mais ne la *ciblent* pas), ou
 * figure dans `UNREACHABLE_ALLOWLIST` avec une justification.
 *
 * Normalisation des routes dynamiques : `:param` → le préfixe jusqu'au premier
 * `/:` sert de base ; un lien `/transaction/${id}` rend donc `/transaction/:id`
 * atteignable.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { resolve } from "path";

const repoRoot = resolve(__dirname, "../../..");
const srcDir = resolve(repoRoot, "src");
const routesDir = resolve(srcDir, "ionic/routes");

/** Routes volontairement atteignables sans lien interne. */
const UNREACHABLE_ALLOWLIST: Record<string, string> = {
  // Redirections rétro-compat (atteintes par un ancien lien externe) : le
  // route ne cible rien, il redirige. Confirmé : admin.tsx `/admin/federation/tree`.
  "/admin/federation/tree": "redirect rétro-compat vers /admin/federation",
  // Entrées de lien profond publiques (URL externe : e-mail, appUrlOpen).
  "/invitation/claim": "lien profond public (e-mail d'invitation)",
  // Retour OAuth : cible du fournisseur d'identité (redirect_uri), jamais
  // atteinte par un lien interne.
  "/auth/callback": "retour OAuth externe (redirect_uri)",
};

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "__tests__") continue;
      out.push(...listSourceFiles(full));
    } else if (/\.tsx?$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Chemins montés (toutes les `path="…"` de `ionic/routes/*.tsx`). */
function mountedPaths(): string[] {
  const paths = new Set<string>();
  for (const f of readdirSync(routesDir).filter((f) => f.endsWith(".tsx"))) {
    const src = readFileSync(resolve(routesDir, f), "utf8");
    for (const m of src.matchAll(/path="([^"]+)"/g)) paths.add(m[1]);
  }
  return [...paths].sort();
}

/**
 * Cibles de navigation trouvées dans `src/` : littéraux de `navigate(...)`,
 * `to=`/`href=`/`defaultHref=` (statiques) ET préfixes de littéraux de gabarit
 * (`\`/transaction/${id}\`` → `/transaction/`). Les fichiers de déclaration de
 * routes sont exclus (ils ne *ciblent* pas).
 */
function navigationTargets(): string[] {
  const targets: string[] = [];
  for (const file of listSourceFiles(srcDir)) {
    if (file.startsWith(routesDir)) continue;
    const src = readFileSync(file, "utf8");
    const patterns = [
      /navigate\(\s*["'`]([^"'`]+)["'`]/g,
      /\bto=["'`]([^"'`]+)["'`]/g,
      /\bhref=["'`]([^"'`]+)["'`]/g,
      /defaultHref=["'`]([^"'`]+)["'`]/g,
      /\bto:\s*["'`]([^"'`]+)["'`]/g,
      /\bhref:\s*["'`]([^"'`]+)["'`]/g,
      // Registre de fonctionnalités (menu « Plus » / navigation) : `route: "/…"`.
      /\broute:\s*["'`]([^"'`]+)["'`]/g,
      // Cibles de navigation calculées : `navigate(cond ? "/a" : "/b", …)`.
      /(?:navigate\([^;]*?)\?\s*["'`](\/[^"'`]+)["'`]/g,
      /(?:navigate\([^;]*?):\s*["'`](\/[^"'`]+)["'`]/g,
    ];
    for (const re of patterns) {
      for (const m of src.matchAll(re)) targets.push(m[1]);
    }
  }
  return targets;
}

/** `:param` → base préfixe ; ex. `/transaction/:id` → `/transaction/`. */
function baseOf(path: string): string {
  const idx = path.indexOf("/:");
  return idx === -1 ? path : path.slice(0, idx);
}

function isReachable(path: string, targets: string[]): boolean {
  if (path === "*") return true;
  if (path.includes("/:")) {
    const base = baseOf(path);
    return targets.some((t) => t === base || t.startsWith(base + "/"));
  }
  return targets.some((t) => t === path || t.startsWith(path + "?"));
}

describe("Routes montées ↔ reachability (aucune page orpheline)", () => {
  const mounted = mountedPaths();
  const targets = navigationTargets();

  it("la collecte n'est pas vide (non-vacuité du scanning)", () => {
    expect(mounted.length).toBeGreaterThan(5);
    expect(targets.length).toBeGreaterThan(0);
  });

  it("chaque route montée a un lien entrant OU est justifiée", () => {
    const orphans = mounted.filter(
      (p) => !(p in UNREACHABLE_ALLOWLIST) && !isReachable(p, targets),
    );
    expect(
      orphans,
      `Routes montées sans aucun lien entrant : ${orphans.join(", ")}. ` +
        `Ajoutez un lien de navigation, ou inscrivez la route dans ` +
        `UNREACHABLE_ALLOWLIST avec une justification.`,
    ).toEqual([]);
  });

  it("l'allowlist ne contient pas de route qui n'est plus montée (anti-obsolescence)", () => {
    const stale = Object.keys(UNREACHABLE_ALLOWLIST).filter(
      (p) => !mounted.includes(p),
    );
    expect(stale).toEqual([]);
  });
});
