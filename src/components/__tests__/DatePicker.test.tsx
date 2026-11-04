// @vitest-environment jsdom
/**
 * A6 — DatePicker réécrit sur IonDatetime (feuille modale).
 *
 * Le contrat verrouillé est celui du composant : libellé fr-FR, invite
 * quand vide, et aller-retour de la valeur `aaaa-mm-jj` en heure LOCALE
 * (l'ancienne implémentation décalait d'un jour en UTC+ via
 * `toISOString()`). Le calendrier d'Ionic lui-même n'est pas testé ici.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("@ionic/react", () => ({
  IonButton: ({ children, onClick, id }: any) => (
    <button type="button" id={id} onClick={onClick}>
      {children}
    </button>
  ),
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonModal: ({ isOpen, children }: any) =>
    isOpen ? <div data-testid="ion-modal">{children}</div> : null,
  IonDatetime: ({ value, onIonChange }: any) => (
    <input
      type="date"
      data-testid="ion-datetime"
      value={typeof value === "string" ? value.slice(0, 10) : ""}
      onChange={(e) =>
        onIonChange?.({ detail: { value: `${e.target.value}T00:00:00.000` } })
      }
    />
  ),
}));

import DatePicker from "@/components/DatePicker";

describe("A6 — DatePicker (IonDatetime en feuille)", () => {
  it("affiche la date au format long fr-FR", () => {
    render(<DatePicker value="2026-11-04" onChange={() => {}} label="Date" />);
    expect(screen.getByText("4 novembre 2026")).toBeInTheDocument();
  });

  it("affiche l'invite quand aucune date n'est choisie", () => {
    render(<DatePicker value="" onChange={() => {}} label="Date" />);
    expect(screen.getByText("Sélectionner…")).toBeInTheDocument();
  });

  it("ouvre la feuille et émet aaaa-mm-jj sans décalage de fuseau", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-11-04" onChange={onChange} label="Date" />);
    fireEvent.click(screen.getByRole("button"));

    const input = screen.getByTestId("ion-datetime") as HTMLInputElement;
    // Le calendrier reçoit exactement le jour stocké (pas la veille).
    expect(input.value).toBe("2026-11-04");

    fireEvent.change(input, { target: { value: "2026-12-25" } });
    expect(onChange).toHaveBeenCalledWith("2026-12-25");
  });
});
