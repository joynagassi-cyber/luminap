/**
 * Garde structurelle — classe de défaut « filet déclaré, jamais câblé ».
 *
 * Cette classe a récidivé AU MOINS 5 fois : R105 (garde de permission),
 * R106 (update-required), R107 (needs-membership), R108 (watchdog),
 * R113 (Rules of Hooks). Le symptôme est toujours le même : le code paraît
 * complet (un champ de `RouteState`, une branche de `resolveRoute`, un écran),
 * mais AUCUNE donnée ne l'alimente → la branche est morte et le garde-fou est
 * absent en production, sans qu'aucun test ne s'en aperçoive.
 *
 * Ce test verrouille la CAUSE plutôt que chaque instance :
 *
 *   1. Chaque champ de `RouteState` (l'entrée du résolveur) doit être soit
 *      RÉELLEMENT alimenté dans `App.tsx`, soit explicitement inscrit dans
 *      `PENDING_WIRING` avec une raison (et un id de risque). Ajouter un champ
 *      et le laisser inerte fait donc échouer la CI.
 *   2. Chaque variante de `RouteOutcome` (la sortie) doit avoir un `case`
 *      rendu dans `App.tsx` — sinon un état est produit mais jamais affiché
 *      (écran noir silencieux).
 *
 * Les champs volontairement non câblés aujourd'hui (bloqués par une décision
 * propriétaire) sont listés ci-dessous : la liste est vérifiée pour ne pas
 * devenir obsolète (un champ retiré du type doit aussi l'être d'ici).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const routeResolverSrc = readFileSync(
  resolve(__dirname, "../routeResolver.ts"),
  "utf8",
);
const appSrc = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
const authPageSrc = readFileSync(
  resolve(__dirname, "../../pages/AuthPage.tsx"),
  "utf8",
);

/**
 * Champs de `RouteState` dont le câblage est DIFFÉRÉ, avec la raison et le
 * risque suivi. Retirer une entrée ici sans câbler le champ fait échouer le
 * test (garde anti-obsolescence).
 */
const PENDING_WIRING: Record<string, string> = {
  hasPermission: "R105 — R109 TRANCHÉ (2026-10-29) : reste le câblage de la route",
};

/** Extrait les clés de l'interface `RouteState`. */
function routeStateKeys(): string[] {
  const m = routeResolverSrc.match(
    /export interface RouteState \{([\s\S]*?)\n\}/,
  );
  if (!m) throw new Error("interface RouteState introuvable");
  const keys: string[] = [];
  for (const line of m[1].split("\n")) {
    const km = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\??\s*:/);
    if (km) keys.push(km[1]);
  }
  return keys;
}

/** Extrait les variantes de l'union `RouteOutcome`. */
function routeOutcomeVariants(): string[] {
  const m = routeResolverSrc.match(
    /export type RouteOutcome =([\s\S]*?);\n/,
  );
  if (!m) throw new Error("type RouteOutcome introuvable");
  const variants: string[] = [];
  for (const vm of m[1].matchAll(/outcome:\s*"([^"]+)"/g)) {
    variants.push(vm[1]);
  }
  return variants;
}

/** Extrait les clés de l'objet `RouteState` passé à `resolveRoute` dans App.tsx. */
function appWiringKeys(): Set<string> {
  const call = appSrc.match(/resolveRoute\(location\.pathname,\s*\{([\s\S]*?)\}\s*\)/);
  if (!call) throw new Error("appel resolveRoute(...) introuvable dans App.tsx");
  const keys = new Set<string>();
  for (const line of call[1].split("\n")) {
    // Propriété explicite `clé: valeur` …
    const km = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/);
    if (km) {
      keys.add(km[1]);
      continue;
    }
    // … ou raccourcie `clé,` (valeur = variable du même nom).
    const sm = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*,/);
    if (sm) keys.add(sm[1]);
  }
  return keys;
}

describe("RouteState — aucun champ inerte (garde anti-classe R105/R106/R107)", () => {
  const keys = routeStateKeys();
  const wired = appWiringKeys();

  it("l'interface RouteState expose bien des champs (sanity)", () => {
    expect(keys.length).toBeGreaterThanOrEqual(3);
  });

  it("chaque champ est câblé dans App.tsx OU inscrit dans PENDING_WIRING", () => {
    const orphans = keys.filter(
      (k) => !wired.has(k) && !(k in PENDING_WIRING),
    );
    expect(orphans).toEqual([]);
  });

  it("chaque champ inscrit dans PENDING_WIRING a une raison (risque suivi)", () => {
    for (const [k, reason] of Object.entries(PENDING_WIRING)) {
      expect(reason, `raison manquante pour ${k}`).toMatch(/R\d+/);
    }
  });

  it("PENDING_WIRING ne contient aucune entrée obsolète", () => {
    const stale = Object.keys(PENDING_WIRING).filter((k) => !keys.includes(k));
    expect(stale).toEqual([]);
  });

  it("les champs non différés sont réellement alimentés (pas de faux positif)", () => {
    // Les champs attendus comme câblés aujourd'hui (R106 + PM2 + base).
    for (const k of [
      "isAuthenticated",
      "isOrgMember",
      "activeOrgId",
      "linkOrgId",
      "clientSchemaVersion",
      "minSchemaVersion",
    ]) {
      expect(keys, `${k} doit exister dans RouteState`).toContain(k);
      expect(wired.has(k), `${k} doit être alimenté dans App.tsx`).toBe(true);
    }
  });
});

describe("RouteOutcome — chaque état produit est rendu (pas d'écran muet)", () => {
  const variants = routeOutcomeVariants();

  it("l'union RouteOutcome expose des variantes (sanity)", () => {
    expect(variants.length).toBeGreaterThanOrEqual(5);
  });

  it("chaque variante a un case dans le switch de App.tsx", () => {
    const missing = variants.filter(
      (v) => !appSrc.includes(`case "${v}"`),
    );
    // `not-found` / `loading` sont volontairement regroupés avec `default`
    // (rendu par la route wildcard) — on l'accepte explicitement.
    const tolerated = ["not-found", "loading"];
    expect(missing.filter((v) => !tolerated.includes(v))).toEqual([]);
  });

  it("les états critiques (forbidden/needs-membership/update-required) sont rendus", () => {
    for (const v of ["forbidden", "needs-membership", "update-required"]) {
      expect(appSrc, `${v} doit être rendu`).toContain(`case "${v}"`);
    }
  });
});

describe("returnTo — le filet de reprise est réellement transmis ET consommé (R126)", () => {
  it("App.tsx transmet le returnTo de `needs-auth` à /auth", () => {
    // Sans ceci, `outcome.returnTo` était calculé puis jeté : un lien profond
    // vers une route protégée perdait sa cible après connexion.
    expect(appSrc).toMatch(/returnTo=\$\{encodeURIComponent\(outcome\.returnTo\)\}/);
  });

  it("AuthPage relit le returnTo (validé) pour la navigation post-auth", () => {
    expect(authPageSrc).toMatch(/readReturnToFromSearch\(location\.search\)/);
  });
});

describe("R127 — l'URL d'entrée web alimente réellement linkOrgId (pas de filet mort)", () => {
  it("App.tsx dérive une intention d'org depuis l'URL d'entrée", () => {
    // Sur le web, `parseDeepLink` n'était appelé que par le chemin natif : un
    // lien `…?org=B` ne proposait jamais la bascule. Cette garde fige le
    // câblage boot → `webEntryOrgIntent` → `linkOrgId`.
    expect(appSrc).toMatch(/webEntryOrgIntent\(/);
    expect(appSrc).toMatch(/linkOrgId/);
  });
});
