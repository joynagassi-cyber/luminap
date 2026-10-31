// @vitest-environment jsdom
/**
 * PR12 — câblage UI de l'import CSV sécurisé (`CsvImportPanel`, monté dans
 * « Sauvegarde des données » de `/settings/gestion`).
 *
 * Défauts verrouillés (comportement réel, pas de mock du parseur) :
 *   1. un fichier hostile (`=SUM(1+1)`) est PRÉVISUALISÉ avec la cellule
 *      neutralisée (texte littéral) et un avertissement — jamais exécuté ;
 *   2. un en-tête non conforme est REFUSÉ avec un message FR, aucun bouton
 *      d'import n'apparaît ;
 *   3. rien n'est écrit AVANT confirmation : `addTransaction` n'est pas appelé
 *      tant que « Importer … » n'est pas cliqué ;
 *   4. à la confirmation, seules les lignes VALIDES sont écrites (en DRAFT) ;
 *      une ligne invalide n'appelle jamais `addTransaction` ;
 *   5. une erreur d'écriture est capturée (`captureClientError`) + toast.
 *
 * NON-VACUITÉ (vérifié manuellement, puis restauré) :
 *   - supprimer le garde `!parsed.ok` (rendre l'aperçu malgré un en-tête
 *     invalide) ⇒ le test « en-tête refusé » échoue ;
 *   - écrire au moment de l'analyse (au lieu d'attendre la confirmation) ⇒ le
 *     test « aucune écriture avant confirmation » échoue ;
 *   - écrire toutes les lignes (ignorer `status !== "valid"`) ⇒ le test
 *     « ligne invalide non écrite » échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

const addTransaction = vi.fn<(input: Record<string, unknown>) => Promise<void>>(
  async () => undefined,
);
const downloadBlob = vi.fn();
const captureClientError = vi.fn();
const toast = vi.fn();

vi.mock("@/lib/dataLayer", () => ({
  useCurrentUser: () => ({ id: "u-1", role: "ADMIN", org: { id: "org-1" } }),
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: (sel: (s: unknown) => unknown) =>
    sel({
      addTransaction: (input: Record<string, unknown>) => addTransaction(input),
    }),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
}));

vi.mock("@/lib/download", () => ({
  downloadBlob: (...args: unknown[]) => downloadBlob(...args),
}));

vi.mock("@/lib/clientErrors", () => ({
  captureClientError: (...args: unknown[]) => captureClientError(...args),
}));

vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

import CsvImportPanel from "@/components/CsvImportPanel";

const HEADER = "type;amount;description;date;category_id;source;comment";

function makeFile(name: string, content: string): File {
  const file = new File([content], name, { type: "text/csv" });
  // jsdom n'implémente pas toujours `File.prototype.text`.
  if (typeof file.text !== "function") {
    (file as unknown as { text: () => Promise<string> }).text = async () => content;
  }
  return file;
}

function selectFile(content: string) {
  const input = screen.getByTestId("csv-import-input") as HTMLInputElement;
  const file = makeFile("import.csv", content);
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  addTransaction.mockClear();
  downloadBlob.mockClear();
  captureClientError.mockClear();
  toast.mockClear();
});

afterEach(cleanup);

describe("CsvImportPanel — aperçu sécurisé", () => {
  it("affiche l'affordance d'import et le modèle téléchargeable", () => {
    render(<CsvImportPanel />);
    expect(screen.getByTestId("csv-import-choose")).toBeInTheDocument();
    expect(screen.getByTestId("csv-import-template")).toBeInTheDocument();
  });

  it("prévisualise une cellule hostile neutralisée et n'écrit RIEN avant confirmation", async () => {
    render(<CsvImportPanel />);
    selectFile(`${HEADER}\nINCOME;10000;=SUM(1+1);2026-01-31;cat-dime;CAISSE;`);

    await waitFor(() =>
      expect(screen.getByTestId("csv-import-preview")).toBeInTheDocument(),
    );
    // Le résumé montre la valeur neutralisée (apostrophe de tête), pas exécutée.
    expect(screen.getByText(/'=SUM\(1\+1\)/)).toBeInTheDocument();
    expect(screen.getByTestId("csv-import-warnings")).toBeInTheDocument();
    // Aucune écriture tant que l'utilisateur n'a pas confirmé.
    expect(addTransaction).not.toHaveBeenCalled();
  });

  it("refuse un en-tête non conforme avec un message FR (pas de bouton d'import)", async () => {
    render(<CsvImportPanel />);
    selectFile(`type;amount;date;category_id;source;comment\nINCOME;10000;2026-01-31;cat-dime;CAISSE;`);

    await waitFor(() =>
      expect(screen.getByTestId("csv-import-rejected")).toBeInTheDocument(),
    );
    expect(screen.getByText(/En-tête invalide/)).toBeInTheDocument();
    expect(screen.queryByTestId("csv-import-confirm")).not.toBeInTheDocument();
    expect(addTransaction).not.toHaveBeenCalled();
  });

  it("n'écrit que les lignes valides (en DRAFT) après confirmation", async () => {
    render(<CsvImportPanel />);
    selectFile(
      `${HEADER}\n` +
        `INCOME;10000;Valide;2026-01-31;cat-dime;CAISSE;\n` +
        `INCOME;0;Invalide;2026-01-31;cat-dime;CAISSE;`,
    );

    await waitFor(() =>
      expect(screen.getByTestId("csv-import-confirm")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("csv-import-confirm"));

    await waitFor(() => expect(addTransaction).toHaveBeenCalledTimes(1));
    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Valide", status: "DRAFT" }),
    );
    // La ligne invalide n'a jamais été écrite.
    expect(
      addTransaction.mock.calls.some(
        (c) => (c[0] as { description: string }).description === "Invalide",
      ),
    ).toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Import terminé" }),
    );
  });

  it("capture une erreur d'écriture et la signale (jamais avalée)", async () => {
    addTransaction.mockRejectedValueOnce(new Error("boom"));
    render(<CsvImportPanel />);
    selectFile(`${HEADER}\nINCOME;10000;Valide;2026-01-31;cat-dime;CAISSE;`);

    await waitFor(() =>
      expect(screen.getByTestId("csv-import-confirm")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId("csv-import-confirm"));

    await waitFor(() => expect(toast).toHaveBeenCalled());
    // L'erreur d'écriture remonte via le résumé puis un toast d'échec.
    expect(
      toast.mock.calls.some(
        (c) => (c[0] as { variant?: string }).variant === "destructive",
      ),
    ).toBe(true);
  });

  it("télécharge le modèle CSV (avec BOM) via `downloadBlob`", () => {
    render(<CsvImportPanel />);
    fireEvent.click(screen.getByTestId("csv-import-template"));
    expect(downloadBlob).toHaveBeenCalledTimes(1);
  });
});
