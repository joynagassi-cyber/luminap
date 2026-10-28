/**
 * R124 — l'état du self-updater doit être PARTAGÉ, pas par instance de hook.
 *
 * Défaut mesuré : `UpdateDialog` appelle `useUpdater()` lui-même tout en
 * affirmant que l'état est « global ». Avant le correctif, chaque appel de
 * `useUpdater()` créait un `useState` isolé → le dialogue lisait un état
 * `idle` (donc `updateInfo: null`, dialogue invisible) au lieu de celui de
 * l'appelant (`UpdaterBridge` / `SettingsAbout`). « Mettre à jour » était
 * inerte et « Plus tard » ne fermait rien.
 *
 * Le test prouve la propriété structurelle : un abonné (ce que le hook fait
 * via `subscribeUpdater`) voit les mutations émises par un AUTRE appelant du
 * store (ce que `UpdaterBridge` fait via `checkUpdate`).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

vi.mock("../apkUpdater", () => ({
  ApkUpdater: {
    canInstall: vi.fn(async () => ({ value: true })),
    openInstallSettings: vi.fn(async () => {}),
    addListener: vi.fn(async () => ({ remove: vi.fn(async () => {}) })),
    download: vi.fn(async () => {}),
    install: vi.fn(async () => {}),
  },
}));

vi.mock("../checkForUpdate", () => ({
  checkForUpdate: vi.fn(async () => ({
    versionName: "9.9.9",
    changelog: "note",
    downloadUrl: "https://example.test/app.apk",
    sizeBytes: 1024,
  })),
}));

import {
  checkUpdate,
  dismissUpdater,
  getUpdaterState,
  resetUpdaterStore,
  subscribeUpdater,
  startUpdate,
} from "../updaterStore";
import { ApkUpdater } from "../apkUpdater";

describe("R124 — updaterStore partagé", () => {
  beforeEach(() => {
    resetUpdaterStore();
    vi.clearAllMocks();
  });

  it("un abonné voit l'état écrit par un autre appelant (état réellement partagé)", async () => {
    const seen: Array<{ status: string; info: unknown }> = [];
    const unsub = subscribeUpdater((s) =>
      seen.push({ status: s.status, info: s.updateInfo }),
    );

    // Un appelant (ex. UpdaterBridge) lance la vérification.
    await checkUpdate(false);

    // L'abonné (ce que fait UpdateDialog) a bien vu l'état mis à jour.
    expect(seen.at(-1)?.status).toBe("available");
    expect(seen.at(-1)?.info).toMatchObject({ versionName: "9.9.9" });
    expect(getUpdaterState().updateInfo).toMatchObject({ versionName: "9.9.9" });

    unsub();
  });

  it("dismiss() ferme le dialogue (updateInfo → null, statut idle)", async () => {
    await checkUpdate(false);
    expect(getUpdaterState().updateInfo).not.toBeNull();

    dismissUpdater();
    expect(getUpdaterState().updateInfo).toBeNull();
    expect(getUpdaterState().status).toBe("idle");
  });

  it("startUpdate() télécharge puis installe quand la permission est accordée", async () => {
    await checkUpdate(false);
    await startUpdate();
    expect(ApkUpdater.download).toHaveBeenCalledTimes(1);
    expect(ApkUpdater.install).toHaveBeenCalledTimes(1);
    expect(getUpdaterState().status).toBe("readyToInstall");
    expect(getUpdaterState().progress).toBe(100);
  });

  it("sans mise à jour, startUpdate() ne fait rien (pas d'appel natif)", async () => {
    await startUpdate();
    expect(ApkUpdater.download).not.toHaveBeenCalled();
    expect(ApkUpdater.install).not.toHaveBeenCalled();
  });
});

describe("R124 — câblage UI (anti « filet jamais branché »)", () => {
  const src = readFileSync(resolve(__dirname, "../UpdateDialog.tsx"), "utf8");

  it("« Plus tard » ferme le dialogue (dismiss) et n'est plus un bouton mort", () => {
    expect(src).toMatch(/dismiss\(\)/);
    expect(src).not.toMatch(/onClick=\{\(\) => undefined\}/);
  });

  it("point de montage UNIQUE du dialogue (état partagé → pas de doublon)", () => {
    const app = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
    const about = readFileSync(resolve(__dirname, "../../pages/SettingsAbout.tsx"), "utf8");
    // App.tsx monte le dialogue (UpdaterBridge)…
    expect(app).toMatch(/<UpdateDialog \/>/);
    // …et SettingsAbout ne doit PAS le monter une seconde fois (état partagé).
    expect(about).not.toMatch(/<UpdateDialog/);
    // Le bouton de SettingsAbout écrit dans le MÊME store.
    expect(about).toMatch(/useUpdater\(\)/);
  });
});
