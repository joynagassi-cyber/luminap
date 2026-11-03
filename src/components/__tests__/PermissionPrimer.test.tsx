// @vitest-environment jsdom
/**
 * PermissionPrimer — l'explication passe AVANT la fenêtre système.
 *
 * Comportements verrouillés :
 *   1. Le texte d'explication est affiché, et AUCUNE demande n'est déclenchée
 *      à l'ouverture (l'utilisateur doit lire avant qu'Android demande).
 *   2. « Autoriser » appelle `onConfirm` (⇒ PermissionService.request).
 *   3. « Plus tard » appelle `onDismiss` (⇒ report 7 jours), jamais `onConfirm`.
 *   4. État `blocked` : le bouton système disparaît au profit de « Ouvrir les
 *      réglages » — une fenêtre de permission ne peut plus apparaître.
 *
 * NON-VACUITÉ : remplacer `onClick={onConfirm}` par `onClick={onDismiss}` sur
 * le bouton principal ⇒ les tests 2 et 3 échouent. Afficher toujours le bouton
 * principal ⇒ le test 4 échoue.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("@ionic/react", () => ({
  // Stubs minimaux : IonModal ne monte pas son contenu quand isOpen=false.
  IonModal: ({ isOpen, children }: any) =>
    isOpen ? <div data-testid="ion-modal">{children}</div> : null,
  IonContent: ({ children }: any) => <div>{children}</div>,
  IonButton: ({ children, onClick, disabled, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

import PermissionPrimer from "../PermissionPrimer";

const MESSAGE = "Recevez une alerte quand une dépense attend votre visa.";

afterEach(() => cleanup());

describe("PermissionPrimer", () => {
  it("affiche l'explication sans déclencher de demande", () => {
    const onConfirm = vi.fn();
    render(
      <PermissionPrimer
        isOpen
        status="prompt"
        message={MESSAGE}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("« Autoriser » remonte onConfirm", () => {
    const onConfirm = vi.fn();
    render(
      <PermissionPrimer
        isOpen
        status="prompt"
        message={MESSAGE}
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("permission-primer-confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("« Plus tard » remonte onDismiss et jamais onConfirm", () => {
    const onConfirm = vi.fn();
    const onDismiss = vi.fn();
    render(
      <PermissionPrimer
        isOpen
        status="denied"
        message={MESSAGE}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByTestId("permission-primer-later"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("état `blocked` : seule issue proposée = ouvrir les réglages", () => {
    const onOpenSettings = vi.fn();
    render(
      <PermissionPrimer
        isOpen
        status="blocked"
        message={MESSAGE}
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
        onOpenSettings={onOpenSettings}
      />,
    );
    expect(
      screen.queryByTestId("permission-primer-confirm"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("permission-primer-open-settings"));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("fermé : ne rend rien", () => {
    render(
      <PermissionPrimer
        isOpen={false}
        status="prompt"
        message={MESSAGE}
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("ion-modal")).not.toBeInTheDocument();
  });
});
