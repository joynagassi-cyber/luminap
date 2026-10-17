import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import {
  GITHUB_OWNER,
  GITHUB_REPO,
  APK_ASSET_NAME,
  CHECK_INTERVAL_MS,
} from "./config";

export interface UpdateInfo {
  versionName: string;
  changelog: string;
  downloadUrl: string;
  sha256?: string;
  sizeBytes: number;
}

interface LatestRelease {
  tag_name: string;
  body?: string;
  assets?: Array<{
    name: string;
    browser_download_url: string;
    size: number;
    digest?: string;
  }>;
}

/** Supprime le préfixe « v » du tag (v1.4.0 → 1.4.0). */
export function normalizeTag(tag: string): string {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}

/**
 * Compare numériquement deux versions « MAJ.m.j ». Retourne :
 * -1 si a<b, 0 si a===b, 1 si a>b. Les composantes manquantes valent 0.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

/**
 * Vérifie une mise à jour sur GitHub Releases.
 * Retourne null si : pas d'update, plateforme non-Android, vérif trop
 * récente (sauf force), ou en cas d'erreur réseau/API — on ne lève JAMAIS.
 */
export async function checkForUpdate(
  force = false,
): Promise<UpdateInfo | null> {
  try {
    // 1. Android uniquement (pas de side-effect sur web/iOS/dev navigateur)
    if (Capacitor.getPlatform() !== "android") return null;

    // 2. Throttle 6h (mémoire via Preferences) sauf si force
    const KEY = "lumina.last_update_check";
    if (!force) {
      const { value: last } = await Preferences.get({ key: KEY });
      if (last && Date.now() - Number(last) < CHECK_INTERVAL_MS) {
        return null;
      }
    }

    // 3. Appeler l'API GitHub (dépôt public, 60 req/h/IP sans auth)
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) return null;
    const release = (await res.json()) as LatestRelease;

    // 4. Version locale (gradle : versionCode=2, versionName=1.0.1)
    const localVersion = normalizeTag((await App.getInfo()).version);
    const remoteVersion = normalizeTag(release.tag_name);

    // 5. Mémoriser l'heure de la vérif (peu importe le résultat)
    await Preferences.set({ key: KEY, value: String(Date.now()) });

    // 6. Nouvelle version strictement supérieure ? (comparaison numérique)
    if (compareVersions(remoteVersion, localVersion) <= 0) return null;

    // 7. Trouver l'asset exact APK_ASSET_NAME, extraire sha256 depuis digest
    const asset = release.assets?.find((a) => a.name === APK_ASSET_NAME);
    if (!asset) return null;
    const sha256 = asset.digest?.replace(/^sha256:/, "");

    return {
      versionName: remoteVersion,
      changelog: release.body ?? "",
      downloadUrl: asset.browser_download_url,
      sha256: sha256 || undefined,
      sizeBytes: asset.size,
    };
  } catch {
    // Une erreur réseau/API ne doit JAMAIS faire planter l'app
    // ni bloquer le démarrage.
    return null;
  }
}
