// @vitest-environment jsdom
/**
 * downloadBlob — point de sortie unique des exports (bug P0-2).
 *
 * Contrat : web = <a download> classique ; natif (Capacitor) = fichier
 * écrit dans le cache + feuille de partage système (<a download> seul
 * ne télécharge RIEN dans la WebView Android). Un échec natif doit
 * remonter en toast, jamais rester silencieux.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  native: { value: false },
  writeFile: vi.fn(async () => ({ uri: "file:///cache/export.csv" })),
  share: vi.fn(async () => undefined),
  showError: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => mocks.native.value },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: mocks.writeFile },
  Directory: { Cache: "CACHE" },
}));

vi.mock("@capacitor/share", () => ({
  Share: { share: mocks.share },
}));

vi.mock("@/utils/toast", () => ({
  showError: mocks.showError,
}));

import { downloadBlob } from "@/lib/download";

describe("downloadBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.native.value = false;
    mocks.writeFile.mockResolvedValue({ uri: "file:///cache/export.csv" });
    mocks.share.mockResolvedValue(undefined);
  });

  it("web : délègue à un lien <a download> et révoque l'URL", async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const anchor: any = { href: "", download: "", click, remove };
    const create = vi
      .spyOn(document, "createElement")
      .mockReturnValue(anchor as any);
    const append = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation((node: any) => node);
    (URL as any).createObjectURL = vi.fn(() => "blob:mock");
    (URL as any).revokeObjectURL = vi.fn();

    await downloadBlob(new Blob(["a;b"], { type: "text/csv" }), "export.csv");

    expect(create).toHaveBeenCalledWith("a");
    expect(anchor.download).toBe("export.csv");
    expect(anchor.href).toBe("blob:mock");
    expect(append).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect((URL as any).revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    expect(mocks.writeFile).not.toHaveBeenCalled();
  });

  it("natif : écrit le fichier dans le cache puis ouvre la feuille de partage", async () => {
    mocks.native.value = true;

    await downloadBlob(
      new Blob(["a;b"], { type: "text/csv" }),
      "bilan-2026-11.csv",
    );

    expect(mocks.writeFile).toHaveBeenCalledTimes(1);
    const written = (mocks.writeFile.mock.calls as any[][])[0][0];
    expect(written.path).toBe("bilan-2026-11.csv");
    expect(written.directory).toBe("CACHE");
    expect(atob(written.data)).toBe("a;b");
    expect(mocks.share).toHaveBeenCalledTimes(1);
    expect((mocks.share.mock.calls as any[][])[0][0]).toMatchObject({
      url: "file:///cache/export.csv",
    });
    expect(mocks.showError).not.toHaveBeenCalled();
  });

  it("natif : un échec d'écriture/partage est signalé (jamais silencieux)", async () => {
    mocks.native.value = true;
    mocks.writeFile.mockRejectedValueOnce(new Error("disk full"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await downloadBlob(new Blob(["x"], { type: "text/csv" }), "export.csv");

    expect(mocks.showError).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("natif : l'annulation de la feuille de partage n'est pas une erreur", async () => {
    mocks.native.value = true;
    mocks.share.mockRejectedValueOnce(new Error("Share canceled"));

    await downloadBlob(new Blob(["x"], { type: "text/csv" }), "export.csv");

    expect(mocks.showError).not.toHaveBeenCalled();
  });
});
