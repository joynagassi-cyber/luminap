// @vitest-environment node
/**
 * A1 / §1.5 — auto-mise à jour par APK direct : pas d'empreinte, pas d'offre.
 *
 * Défaut corrigé : si ni l'asset compagnon `.sha256` (généré par la CI)
 * ni la `digest` de l'API GitHub ne fournissaient d'empreinte,
 * `checkForUpdate` proposait quand même la mise à jour, et le plugin
 * natif téléchargeait l'APK SANS contrôle d'intégrité — un binaire
 * financier installé hors store sans authentification (asset remplacé,
 * interception). Désormais : pas de SHA-256 vérifiable → `null` (on
 * reste sur la version courante), et le natif rejette aussi tout
 * téléchargement sans empreinte (« SHA-256 requis », verrouillé
 * textuellement par android-permissions-matrix.test.ts).
 *
 * Non-vacuité : retirer `if (!sha256) return null;` de checkForUpdate
 * → le cas « aucune empreinte » reçoit une UpdateInfo et échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "android" },
}));
vi.mock("@capacitor/app", () => ({
  App: { getInfo: async () => ({ version: "1.0.1" }) },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async () => ({ value: null }),
    set: async () => {},
  },
}));

import { checkForUpdate } from "../checkForUpdate";

const COMPANION_HASH = "ab".repeat(32); // 64 hex
const DIGEST_HASH = "cd".repeat(32);

function releaseWith(digest?: string) {
  return {
    tag_name: "v9.9.9",
    body: "notes",
    assets: [
      {
        name: "app-release.apk",
        browser_download_url: "https://example.test/app-release.apk",
        size: 1024,
        ...(digest ? { digest } : {}),
      },
    ],
  };
}

/** Installe un fetch factice : API GitHub + asset compagnon paramétrable. */
function stubFetch(opts: { digest?: string; companion: "ok" | "404" }) {
  const fetchMock = vi.fn(async (input: unknown) => {
    const url = String(input);
    if (url.includes("api.github.com")) {
      return { ok: true, json: async () => releaseWith(opts.digest) };
    }
    if (url.endsWith(".sha256")) {
      if (opts.companion === "ok") {
        return {
          ok: true,
          text: async () => `${COMPANION_HASH}  app-release.apk\n`,
        };
      }
      return { ok: false, text: async () => "" };
    }
    throw new Error(`URL inattendue dans le test : ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
}

describe("checkForUpdate — barrière SHA-256 (A1 / §1.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asset compagnon .sha256 présent → mise à jour proposée avec l'empreinte", async () => {
    stubFetch({ companion: "ok" });
    const info = await checkForUpdate(true);
    expect(info).not.toBeNull();
    expect(info?.sha256).toBe(COMPANION_HASH);
    expect(info?.versionName).toBe("9.9.9");
  });

  it("compagnon absent mais digest API présente → repli sur la digest (minuscules)", async () => {
    stubFetch({ companion: "404", digest: `sha256:${DIGEST_HASH.toUpperCase()}` });
    const info = await checkForUpdate(true);
    expect(info).not.toBeNull();
    expect(info?.sha256).toBe(DIGEST_HASH);
  });

  it("aucune empreinte disponible → AUCUNE mise à jour proposée", async () => {
    stubFetch({ companion: "404" });
    const info = await checkForUpdate(true);
    expect(info).toBeNull();
  });
});
