// @vitest-environment node
/**
 * Logique PURE de l'edge function `report-error` — identification de l'appelant
 * et clé de rate-limiting (`throttle.ts`). Testée SANS Deno : le fichier
 * n'importe rien, on vérifie donc la VRAIE logique (extraction d'IP, hachage de
 * bucket) plutôt qu'une réimplémentation.
 */
import { describe, it, expect } from "vitest";

import {
  ANON_MAX_PER_HOUR,
  DEFAULT_IP_SALT,
  extractClientIp,
  ipBucket,
  isAnonymousCaller,
  userBucket,
  USER_MAX_PER_HOUR,
} from "../../../supabase/functions/report-error/throttle";

describe("extractClientIp", () => {
  it("préfère cf-connecting-ip (non falsifiable par le client)", () => {
    expect(extractClientIp("1.2.3.4", "9.9.9.9, 8.8.8.8")).toBe("1.2.3.4");
  });

  it("prend le PREMIER élément de x-forwarded-for (client d'origine)", () => {
    expect(extractClientIp(null, "203.0.113.7, 10.0.0.1, 10.0.0.2")).toBe(
      "203.0.113.7",
    );
  });

  it("replie sur x-real-ip si x-forwarded-for est absent", () => {
    expect(extractClientIp(null, null, "198.51.100.5")).toBe("198.51.100.5");
  });

  it("retombe sur 'unknown' (jamais null) quand aucun en-tête n'est présent", () => {
    expect(extractClientIp(null, null)).toBe("unknown");
    expect(extractClientIp("", "   ")).toBe("unknown");
  });
});

describe("ipBucket", () => {
  it("est stable pour une même IP (dédup intra-fenêtre)", async () => {
    expect(await ipBucket("1.2.3.4")).toBe(await ipBucket("1.2.3.4"));
  });

  it("diffère pour des IP différentes", async () => {
    expect(await ipBucket("1.2.3.4")).not.toBe(await ipBucket("1.2.3.5"));
  });

  it("n'expose JAMAIS l'IP en clair (hash tronqué)", async () => {
    const bucket = await ipBucket("203.0.113.7");
    expect(bucket).not.toContain("203.0.113.7");
    expect(bucket).toMatch(/^ip:[0-9a-f]{32}$/);
  });

  it("dépend du sel (rotation possible sans changer d'IP)", async () => {
    expect(await ipBucket("1.2.3.4", "salt-a")).not.toBe(
      await ipBucket("1.2.3.4", "salt-b"),
    );
  });

  it("le sel par défaut est une constante non secrète", () => {
    expect(DEFAULT_IP_SALT).toBe("lumina-observability");
  });
});

describe("userBucket / isAnonymousCaller", () => {
  it("un utilisateur authentifié a un bucket stable par id", () => {
    expect(userBucket("uuid-123")).toBe("user:uuid-123");
  });

  it("sans id → anonyme ; avec id → non anonyme", () => {
    expect(isAnonymousCaller(null)).toBe(true);
    expect(isAnonymousCaller(undefined)).toBe(true);
    expect(isAnonymousCaller("")).toBe(true);
    expect(isAnonymousCaller("uuid-123")).toBe(false);
  });
});

describe("plafonds", () => {
  it("le plafond anonyme est strictement plus serré que l'authentifié", () => {
    expect(ANON_MAX_PER_HOUR).toBeLessThan(USER_MAX_PER_HOUR);
    expect(ANON_MAX_PER_HOUR).toBeGreaterThan(0);
  });
});
