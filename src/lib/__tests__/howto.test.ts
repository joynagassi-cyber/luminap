/**
 * « Comment faire ? » — recherche locale et cohérence du catalogue.
 *
 * Deux familles de garanties :
 *  1. la recherche trouve ce qu'elle doit trouver, insensible aux accents et à
 *     la casse (contexte réel : « evenement » / « évènement ») ;
 *  2. le catalogue ne peut pas pourrir silencieusement — chaque `route` existe
 *     dans `ROUTE_REGISTRY`, chaque `sectionId` existe dans `Tutorial.tsx`,
 *     les identifiants sont uniques. Un lien profond mort est le défaut le plus
 *     probable de ce genre de fonctionnalité, et le plus invisible.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

import {
  HOWTOS,
  normalize,
  stem,
  searchHowtos,
  featuredHowtos,
  logHowToSearch,
  readHowToSearchLog,
  summarizeHowToSearches,
  HOWTO_LOG_KEY,
} from "../howto";
import { ROUTE_REGISTRY } from "../routeResolver";

const ROOT = resolve(import.meta.dirname, "../../..");

describe("normalize", () => {
  it("neutralise casse, accents et ponctuation", () => {
    expect(normalize("Événement")).toBe("evenement");
    expect(normalize("  CRÉER   une  Organisation ")).toBe("creer une organisation");
    expect(normalize("QR-code ?")).toBe("qr code");
  });

  it("renvoie une chaîne vide pour une entrée sans lettre ni chiffre", () => {
    expect(normalize("   ")).toBe("");
    expect(normalize("!!!")).toBe("");
  });
});

describe("stem", () => {
  it("rapproche les familles de mots du domaine", () => {
    expect(stem("inviter")).toBe(stem("invitation"));
    expect(stem("cotiser")).toBe(stem("cotisation"));
    expect(stem("evenement")).toBe(stem("evenements"));
  });

  it("laisse intacts les mots courts", () => {
    expect(stem("de")).toBe("de");
    expect(stem("qr")).toBe("qr");
  });
});

describe("searchHowtos", () => {
  const first = (q: string) => searchHowtos(q)[0]?.howto.id;

  it("renvoie [] pour une requête vide ou sans mot", () => {
    expect(searchHowtos("")).toEqual([]);
    expect(searchHowtos("   ")).toEqual([]);
    expect(searchHowtos("!!!")).toEqual([]);
  });

  it("trouve l'invitation depuis « inviter »", () => {
    expect(first("inviter")).toBe("inviter-membre");
  });

  it("trouve le versement", () => {
    expect(first("versement")).toBe("faire-versement");
  });

  it("est insensible aux accents et à la casse", () => {
    expect(first("ÉVÉNEMENT")).toBe(first("evenement"));
    expect(searchHowtos("evenement").length).toBeGreaterThan(0);
  });

  it("trouve avec le vocabulaire de l'utilisateur, pas seulement le jargon", () => {
    // « offrande » et « caisse » ne sont pas des noms de fonctionnalités :
    // ce sont les mots que les gens emploient.
    expect(searchHowtos("offrande").length).toBeGreaterThan(0);
    expect(searchHowtos("caisse").length).toBeGreaterThan(0);
  });

  it("respecte le ET strict sur plusieurs mots", () => {
    const res = searchHowtos("ajouter membre");
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((r) => r.approximate === false)).toBe(true);
    expect(res[0].howto.id).toBe("membre-ajouter");
  });

  it("bascule en repli « au moins un mot » et le signale", () => {
    // Aucun parcours ne contient à la fois « zanzibar » et « inviter ».
    const res = searchHowtos("zanzibar inviter");
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].approximate).toBe(true);
    expect(res[0].howto.id).toBe("inviter-membre");
  });

  it("renvoie [] quand rien ne correspond", () => {
    expect(searchHowtos("zanzibar xyzzy")).toEqual([]);
  });

  it("trie par score décroissant", () => {
    const scores = searchHowtos("cotisation").map((r) => r.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });
});

describe("catalogue — cohérence", () => {
  it("les identifiants sont uniques", () => {
    const ids = HOWTOS.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque parcours a au moins une étape et des mots-clés", () => {
    for (const h of HOWTOS) {
      expect(h.steps.length, `${h.id} sans étape`).toBeGreaterThan(0);
      expect(h.keywords.length, `${h.id} sans mot-clé`).toBeGreaterThan(0);
      expect(h.steps.every((s) => s.label.trim().length > 0), `${h.id} étape vide`).toBe(true);
    }
  });

  it("chaque route existe dans ROUTE_REGISTRY (pas de lien profond mort)", () => {
    const known = new Set(ROUTE_REGISTRY.map((r) => r.pattern));
    for (const h of HOWTOS) {
      if (!h.route) continue;
      expect(known.has(h.route), `${h.id} → route inconnue « ${h.route} »`).toBe(true);
    }
  });

  it("chaque sectionId existe dans Tutorial.tsx", () => {
    const src = readFileSync(resolve(ROOT, "src/pages/Tutorial.tsx"), "utf8");
    const start = src.indexOf("const SECTIONS: SectionData[] = [");
    expect(start, "SECTIONS introuvable dans Tutorial.tsx").toBeGreaterThan(-1);
    const block = src.slice(start, src.indexOf("\n];", start));
    const ids = new Set([...block.matchAll(/^\s{4}id: "([^"]+)"/gm)].map((m) => m[1]));

    expect(ids.size).toBeGreaterThan(10); // garde-fou : le parsing a bien trouvé les sections
    for (const h of HOWTOS) {
      if (!h.sectionId) continue;
      expect(ids.has(h.sectionId), `${h.id} → section inconnue « ${h.sectionId} »`).toBe(true);
    }
  });

  it("aucun parcours ne cible une route inexistante dans le routeur Ionic", () => {
    // ROUTE_REGISTRY est la source déclarative ; on vérifie en plus qu'elle est
    // alignée sur les routes réellement déclarées dans src/ionic/routes/*.tsx.
    const declared = new Set<string>();
    for (const f of readdirSync(resolve(ROOT, "src/ionic/routes"))) {
      if (!f.endsWith(".tsx")) continue;
      const s = readFileSync(resolve(ROOT, "src/ionic/routes", f), "utf8");
      for (const m of s.matchAll(/path="([^"]+)"/g)) declared.add(m[1]);
    }
    expect(declared.size).toBeGreaterThan(20);
    for (const h of HOWTOS) {
      if (!h.route) continue;
      expect(declared.has(h.route), `${h.id} → « ${h.route} » absente des routes Ionic`).toBe(true);
    }
  });
});

describe("featuredHowtos", () => {
  it("respecte la limite demandée", () => {
    expect(featuredHowtos(4)).toHaveLength(4);
  });

  it("propose les parcours les plus fréquents en premier", () => {
    expect(featuredHowtos()[0].id).toBe("enregistrer-transaction");
  });
});

describe("instrumentation — ne doit jamais casser une recherche", () => {
  // Note : `src/lib/__tests__/setup.ts` installe un `localStorage` mémoire même
  // en environnement node. On teste donc le comportement réel (aller-retour),
  // et la résistance à un stockage défaillant.
  const reset = () => globalThis.localStorage.removeItem(HOWTO_LOG_KEY);

  it("enregistre puis relit une recherche", () => {
    reset();
    logHowToSearch("inviter", 3);
    const log = readHowToSearchLog();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ query: "inviter", results: 3 });
    expect(new Date(log[0].at).toISOString()).toBe(log[0].at);
    reset();
  });

  it("borne le journal et conserve les plus récentes", () => {
    reset();
    for (let i = 0; i < 205; i += 1) logHowToSearch(`q${i}`, 1);
    const log = readHowToSearchLog();
    expect(log.length).toBe(200);
    expect(log[log.length - 1].query).toBe("q204");
    reset();
  });

  it("ne lève pas si le stockage est défaillant", () => {
    const original = globalThis.localStorage.setItem;
    // Simule un quota dépassé / navigation privée.
    globalThis.localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      expect(() => logHowToSearch("inviter", 3)).not.toThrow();
      expect(() => readHowToSearchLog()).not.toThrow();
    } finally {
      globalThis.localStorage.setItem = original;
      reset();
    }
  });

  it("résume correctement un journal fourni", () => {
    const stats = summarizeHowToSearches([
      { query: "Inviter", results: 1, at: "2026-10-28T10:00:00Z" },
      { query: "inviter", results: 1, at: "2026-10-28T10:01:00Z" },
      { query: "salaire pasteur", results: 0, at: "2026-10-28T10:02:00Z" },
    ]);
    expect(stats.total).toBe(3);
    expect(stats.topQueries[0]).toEqual(["inviter", 2]);
    // La requête sans résultat est le signal utile : elle indique un manque.
    expect(stats.topZeroResult[0]).toEqual(["salaire pasteur", 1]);
  });
});
