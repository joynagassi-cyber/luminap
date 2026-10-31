// @vitest-environment jsdom
/**
 * PR15 — Statistiques d'usage ANONYMISÉES : cœur pur `src/lib/usageStats.ts`.
 *
 * Ce que le module DOIT garantir (et que ce test verrouille) :
 *   1. **Comptage** — `recordUsage(id)` incrémente un compteur local par
 *      fonctionnalité.
 *   2. **Borne** — au plus `MAX_TRACKED_FEATURES` fonctionnalités suivies, et
 *      un compteur plafonné à `MAX_FEATURE_COUNT` (taille de stockage
 *      prévisible).
 *   3. **Lecture tolérante** — un stockage corrompu / illisible donne `{}` et
 *      ne lève jamais.
 *   4. **Anonymat (`sanitizeUsagePayload`)** — toute clé qui n'est pas un
 *      identifiant de fonctionnalité valide (`namespace:slug`), et toute valeur
 *      non numérique, sont ÉCARTÉES. Le payload ne peut donc transporter
 *      aucune PII (e-mail, nom, id d'organisation, texte libre).
 *   5. **Non bloquant** — `recordUsage` ne lève jamais, même si le stockage
 *      lève (quota / mode privé).
 *   6. **Kill switch** — le drapeau `usage-stats` (fail-open) coupe le comptage.
 *
 * ── NON-VACUITÉ (preuve documentée, vérifiée) ────────────────────────────────
 * Chacune de ces mutations fait passer le test correspondant au ROUGE, puis la
 * source a été restaurée :
 *   - Retirer l'incrément (`stats[featureId] = … + 1`) dans `recordUsage` →
 *     « incrémente le compteur » échoue (le compteur reste à 1/0).
 *   - Retirer le `continue` sur `!isValidFeatureId(key)` dans
 *     `sanitizeUsagePayload` → « écarte les clés non conformes » échoue (une
 *     clé « a@b.com » serait conservée).
 *   - Retirer le bloc `if (!isFeatureEnabled(USAGE_STATS_FLAG)) return;` →
 *     « le kill switch coupe le comptage » échoue.
 *   - Retirer le `try/catch` de `recordUsage` → « ne lève jamais si le stockage
 *     lève » échoue.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import {
  recordUsage,
  getUsageStats,
  clearUsageStats,
  sanitizeUsagePayload,
  isValidFeatureId,
  recordScreenUsage,
  MAX_TRACKED_FEATURES,
  MAX_FEATURE_COUNT,
  USAGE_STATS_STORAGE_KEY,
  KEY_SCREEN_IDS,
} from "@/lib/usageStats";
import { setLocalFlag } from "@/lib/featureFlags";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("usageStats — comptage", () => {
  it("incrémente le compteur d'une fonctionnalité", () => {
    recordUsage("screen:dashboard");
    recordUsage("screen:dashboard");
    recordUsage("action:export-json");
    expect(getUsageStats()).toEqual({
      "screen:dashboard": 2,
      "action:export-json": 1,
    });
  });

  it("refuse un identifiant invalide (potentiellement porteur de PII)", () => {
    recordUsage("a@b.com");
    recordUsage("Nom Prénom");
    recordUsage("screen:Dashboard"); // majuscules → non conforme
    recordUsage("");
    expect(getUsageStats()).toEqual({});
  });

  it("borne le compteur d'une fonctionnalité (pas de débordement)", () => {
    // On ne boucle pas un million de fois : on écrit une valeur déjà au
    // plafond et on vérifie que l'incrément ne la dépasse pas.
    localStorage.setItem(
      USAGE_STATS_STORAGE_KEY,
      JSON.stringify({ "screen:finance": MAX_FEATURE_COUNT }),
    );
    recordUsage("screen:finance");
    expect(getUsageStats()["screen:finance"]).toBe(MAX_FEATURE_COUNT);
  });

  it("borne le NOMBRE de fonctionnalités suivies", () => {
    for (let i = 0; i < MAX_TRACKED_FEATURES + 10; i++) {
      recordUsage(`screen:f-${i}`);
    }
    expect(Object.keys(getUsageStats()).length).toBe(MAX_TRACKED_FEATURES);
  });

  it("clearUsageStats remet tout à zéro", () => {
    recordUsage("screen:groups");
    expect(getUsageStats()).toEqual({ "screen:groups": 1 });
    clearUsageStats();
    expect(getUsageStats()).toEqual({});
  });
});

describe("usageStats — lecture tolérante", () => {
  it("JSON corrompu → {} (jamais d'exception)", () => {
    localStorage.setItem(USAGE_STATS_STORAGE_KEY, "{oops");
    expect(() => getUsageStats()).not.toThrow();
    expect(getUsageStats()).toEqual({});
  });

  it("valeur non-objet (scalaire / tableau) → {}", () => {
    localStorage.setItem(USAGE_STATS_STORAGE_KEY, "42");
    expect(getUsageStats()).toEqual({});
    localStorage.setItem(USAGE_STATS_STORAGE_KEY, "[1,2]");
    expect(getUsageStats()).toEqual({});
  });

  it("storage absent → {}", () => {
    expect(getUsageStats()).toEqual({});
  });
});

describe("usageStats — sanitizeUsagePayload (anonymat)", () => {
  it("ne conserve QUE les paires { featureId valide: nombre > 0 }", () => {
    const cleaned = sanitizeUsagePayload({
      "screen:dashboard": 3,
      "action:export-csv": 1,
      "a@b.com": 9, // PII → écarté
      "user:42": 5, // id utilisateur → clé non conforme
      "screen:": 2, // slug vide → écarté
      "screen:ok": "beaucoup", // valeur non numérique → écarté
      "screen:neg": -1, // valeur négative → écarté
      "screen:zero": 0, // zéro → écarté (rien à compter)
    });
    expect(cleaned).toEqual({ "screen:dashboard": 3, "action:export-csv": 1 });
  });

  it("plafonne les valeurs et arrondit vers le bas", () => {
    const cleaned = sanitizeUsagePayload({
      "screen:a": MAX_FEATURE_COUNT + 1000,
      "screen:b": 3.9,
    });
    expect(cleaned["screen:a"]).toBe(MAX_FEATURE_COUNT);
    expect(cleaned["screen:b"]).toBe(3);
  });

  it("entrée non-objet → {} (null / undefined / tableau)", () => {
    expect(sanitizeUsagePayload(null)).toEqual({});
    expect(sanitizeUsagePayload(undefined)).toEqual({});
    expect(sanitizeUsagePayload([1, 2])).toEqual({});
  });

  it("un stockage ALTÉRÉ (PII injectée à la main) est nettoyé à la lecture", () => {
    localStorage.setItem(
      USAGE_STATS_STORAGE_KEY,
      JSON.stringify({ "screen:trace": 4, "email:jean@x.fr": 7 }),
    );
    expect(getUsageStats()).toEqual({ "screen:trace": 4 });
  });
});

describe("usageStats — isValidFeatureId", () => {
  it("accepte le format namespace:slug", () => {
    expect(isValidFeatureId("screen:dashboard")).toBe(true);
    expect(isValidFeatureId("action:export-json")).toBe(true);
  });
  it("refuse tout le reste (PII, espaces, majuscules, vide)", () => {
    for (const bad of ["", "screen", "Screen:dashboard", "a@b.com", "x:y:z", "screen:Dash"]) {
      expect(isValidFeatureId(bad), bad).toBe(false);
    }
  });
});

describe("usageStats — non bloquant (jamais d'exception)", () => {
  it("ne lève pas si l'écriture de stockage échoue", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    expect(() => recordUsage("screen:finance")).not.toThrow();
    spy.mockRestore();
  });

  it("ne lève pas si la lecture de stockage échoue", () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("indisponible");
      });
    expect(() => recordUsage("screen:finance")).not.toThrow();
    expect(() => getUsageStats()).not.toThrow();
    spy.mockRestore();
  });
});

describe("usageStats — kill switch", () => {
  it("le drapeau `usage-stats` à false coupe le comptage", () => {
    setLocalFlag("usage-stats", false);
    recordUsage("screen:dashboard");
    expect(getUsageStats()).toEqual({});
    setLocalFlag("usage-stats", undefined); // restaure (fail-open)
    recordUsage("screen:dashboard");
    expect(getUsageStats()).toEqual({ "screen:dashboard": 1 });
  });
});

describe("usageStats — recordScreenUsage (liste blanche d'écrans)", () => {
  it("compte un écran de la liste blanche", () => {
    recordScreenUsage("/dashboard");
    recordScreenUsage("/dashboard?x=1"); // query ignorée
    recordScreenUsage("/finance");
    expect(getUsageStats()).toEqual({
      "screen:dashboard": 2,
      "screen:finance": 1,
    });
  });

  it("n'invente pas d'identifiant pour un chemin non listé", () => {
    recordScreenUsage("/une-route-inconnue");
    expect(getUsageStats()).toEqual({});
  });

  it("la liste blanche n'expose que des identifiants valides", () => {
    for (const id of Object.values(KEY_SCREEN_IDS)) {
      expect(isValidFeatureId(id), id).toBe(true);
    }
  });
});
