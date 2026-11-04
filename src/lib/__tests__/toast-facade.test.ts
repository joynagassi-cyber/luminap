/**
 * A6 — façade toast adossée au IonToast d'Ionic (@/utils/toast).
 *
 * Vérifie le mapping sémantique (couleurs de la palette A5, durées,
 * header) et le contrat « un retour utilisateur ne casse jamais le flux »
 * (panne du contrôleur → journalisée via reportError, jamais propagée).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockReportError } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockReportError: vi.fn(),
}));

vi.mock("@ionic/core", () => ({
  toastController: { create: mockCreate },
}));
vi.mock("@/lib/observability/errorReporter", () => ({
  reportError: mockReportError,
}));

import { showSuccess, showError, showWarning, showInfo } from "@/utils/toast";

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue({
    present: vi.fn().mockResolvedValue(undefined),
  });
});

describe("A6 — façade toast Ionic", () => {
  it("succès : couleur success, 3 s, position basse", async () => {
    showSuccess("Enregistré");
    await flush();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Enregistré",
        color: "success",
        duration: 3000,
        position: "bottom",
      }),
    );
  });

  it("erreur : couleur danger, 4,5 s, header transmis", async () => {
    showError("Le fichier n'a pas pu être lu.", {
      header: "Lecture impossible",
    });
    await flush();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        header: "Lecture impossible",
        message: "Le fichier n'a pas pu être lu.",
        color: "danger",
        duration: 4500,
      }),
    );
  });

  it("warning/info : couleurs et durée personnalisée", async () => {
    showWarning("Synchronisation en attente", { durationMs: 8000 });
    showInfo("Vous êtes à jour");
    await flush();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ color: "warning", duration: 8000 }),
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Vous êtes à jour", color: undefined }),
    );
  });

  it("panne du contrôleur : journalisée, jamais propagée", async () => {
    mockCreate.mockRejectedValueOnce(new Error("contrôleur HS"));
    showSuccess("x");
    await flush();
    expect(mockReportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ source: "toast-present" }),
    );
  });
});
