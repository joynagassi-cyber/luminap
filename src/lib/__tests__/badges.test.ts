/**
 * Catalogue de badges (src/lib/badges.ts) — gardes de cohérence et
 * d'anti-dérive (Phase 10 : design tokens).
 *
 * Vérifie que :
 *   - chaque ton résout vers un TOKEN CSS Lumina (jamais un hex brut) ;
 *   - les tokens existent réellement dans `src/App.css` (source de vérité) ;
 *   - les tables de statuts couvrent exactement les statuts du domaine
 *     (types TS `src/types/index.ts` + `ClaimStatus`), pour qu'un statut
 *     ajouté sans badge soit détecté ;
 *   - `resolveBadge` replie proprement sur un badge neutre.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  BADGE_TONE_TOKEN,
  CLAIM_BADGES,
  EVENT_BADGES,
  GROUP_BADGES,
  INVITATION_BADGES,
  MEMBER_BADGES,
  ORG_BADGES,
  ORDER_BADGES,
  REPORT_BADGES,
  SUBMISSION_BADGES,
  TASK_BADGES,
  TRANSACTION_BADGES,
  USER_BADGES,
  VERSEMENT_BADGES,
  resolveBadge,
  type BadgeSpec,
} from "@/lib/badges";

const cssPath = resolve(__dirname, "../../App.css");
const css = readFileSync(cssPath, "utf8");

/** Tous les tokens `--x` déclarés dans App.css. */
const declaredTokens = new Set(
  [...css.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]),
);

/** Toutes les tables exportées (pour les gardes génériques). */
const ALL_TABLES: Record<string, Record<string, BadgeSpec>> = {
  TRANSACTION_BADGES,
  VERSEMENT_BADGES,
  EVENT_BADGES,
  TASK_BADGES,
  MEMBER_BADGES,
  GROUP_BADGES,
  USER_BADGES,
  ORG_BADGES,
  REPORT_BADGES,
  CLAIM_BADGES,
  INVITATION_BADGES,
  SUBMISSION_BADGES,
  ORDER_BADGES,
};

describe("catalogue de badges — tons tokenisés", () => {
  it("chaque ton résout vers un token CSS `var(--…)` (jamais un hex brut)", () => {
    for (const [tone, token] of Object.entries(BADGE_TONE_TOKEN)) {
      expect(token, `ton ${tone}`).toMatch(/^var\(--[\w-]+\)$/);
    }
  });

  it("chaque token référencé existe réellement dans App.css", () => {
    const missing: string[] = [];
    for (const [tone, token] of Object.entries(BADGE_TONE_TOKEN)) {
      const name = token.slice("var(--".length, -1);
      if (!declaredTokens.has(name)) missing.push(`${tone} → ${token}`);
    }
    expect(missing, missing.join(" | ")).toEqual([]);
  });

  it("aucune table ne porte de couleur brute (hex / rgb)", () => {
    const offenders: string[] = [];
    for (const [tableName, table] of Object.entries(ALL_TABLES)) {
      for (const [key, spec] of Object.entries(table)) {
        const raw = JSON.stringify(spec);
        if (/#[0-9a-fA-F]{3,8}|rgba?\(/.test(raw)) {
          offenders.push(`${tableName}.${key}`);
        }
      }
    }
    expect(offenders, offenders.join(" | ")).toEqual([]);
  });
});

describe("catalogue de badges — couverture des statuts du domaine", () => {
  it("couvre les statuts de transaction (types TS)", () => {
    const domain = ["DRAFT", "PENDING", "APPROVED", "REJECTED"];
    expect(Object.keys(TRANSACTION_BADGES).sort()).toEqual([...domain].sort());
  });

  it("couvre les statuts de versement", () => {
    const domain = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];
    expect(Object.keys(VERSEMENT_BADGES).sort()).toEqual([...domain].sort());
  });

  it("couvre les statuts d'événement", () => {
    const domain = ["PLANIFIED", "ONGOING", "COMPLETED", "CANCELLED"];
    expect(Object.keys(EVENT_BADGES).sort()).toEqual([...domain].sort());
  });

  it("couvre les statuts de tâche d'événement", () => {
    const domain = ["OPEN", "IN_PROGRESS", "DONE", "BLOCKED"];
    expect(Object.keys(TASK_BADGES).sort()).toEqual([...domain].sort());
  });

  it("couvre les statuts de membre / groupe", () => {
    expect(Object.keys(MEMBER_BADGES).sort()).toEqual(
      ["ACTIVE", "INACTIVE", "ARCHIVED"].sort(),
    );
    expect(Object.keys(GROUP_BADGES).sort()).toEqual(
      ["ACTIVE", "ARCHIVED"].sort(),
    );
  });

  it("couvre les statuts de profil utilisateur", () => {
    const domain = ["PENDING", "ACTIVE", "INVITED", "DISABLED"];
    expect(Object.keys(USER_BADGES).sort()).toEqual([...domain].sort());
  });

  it("couvre les statuts d'organisation (aligné sur FEDERATION_STATUS_LABEL)", () => {
    const domain = ["PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"];
    expect(Object.keys(ORG_BADGES).sort()).toEqual([...domain].sort());
  });

  it("couvre tous les ClaimStatus (invitation)", () => {
    const domain = [
      "PENDING_SYNC",
      "CONFIRMED",
      "REJECTED_DUPLICATE",
      "REJECTED_EXPIRED",
      "REJECTED_EXHAUSTED",
      "REJECTED_REVOKED",
      "REJECTED_ROLE_ESCALATION",
    ];
    expect(Object.keys(CLAIM_BADGES).sort()).toEqual([...domain].sort());
  });

  it("couvre les statuts de rapport d'organisation", () => {
    expect(Object.keys(REPORT_BADGES).sort()).toEqual(
      ["PENDING", "SENT", "READ", "FAILED"].sort(),
    );
  });

  it("couvre les statuts d'invitation", () => {
    expect(Object.keys(INVITATION_BADGES).sort()).toEqual(
      ["ACTIVE", "EXPIRED", "REVOKED", "EXHAUSTED"].sort(),
    );
  });

  it("couvre les statuts de commande", () => {
    expect(Object.keys(ORDER_BADGES).sort()).toEqual(
      ["PENDING", "ORDERED", "RECEIVED", "CANCELLED"].sort(),
    );
  });
});

describe("catalogue de badges — structure & repli", () => {
  it("chaque entrée a un libellé non vide et un ton valide", () => {
    const validTones = new Set(Object.keys(BADGE_TONE_TOKEN));
    for (const [tableName, table] of Object.entries(ALL_TABLES)) {
      for (const [key, spec] of Object.entries(table)) {
        expect(spec.label, `${tableName}.${key}`).toBeTruthy();
        expect(validTones.has(spec.tone), `${tableName}.${key} → ${spec.tone}`).toBe(
          true,
        );
      }
    }
  });

  it("resolveBadge renvoie l'entrée quand la clé existe", () => {
    expect(resolveBadge(TRANSACTION_BADGES, "APPROVED").label).toBe("Approuvé");
  });

  it("resolveBadge replie sur un badge neutre affichant la clé brute", () => {
    const fallback = resolveBadge(TRANSACTION_BADGES, "__INCONNU__");
    expect(fallback.label).toBe("__INCONNU__");
    expect(fallback.tone).toBe("neutral");
  });

  it("resolveBadge gère null / undefined sans lever", () => {
    expect(resolveBadge(TRANSACTION_BADGES, null).label).toBe("—");
    expect(resolveBadge(TRANSACTION_BADGES, undefined).tone).toBe("neutral");
  });
});
