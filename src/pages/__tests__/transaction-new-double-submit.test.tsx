// @vitest-environment jsdom
/**
 * Intégrité — anti double-soumission du formulaire de transaction.
 *
 * Défaut mesuré : le bouton « Enregistrer la transaction » n'était protégé que
 * par l'état React `submitting` (`disabled={submitting}`). Or React n'applique
 * `disabled` qu'APRÈS le re-rendu : sur un appareil lent, deux clics rapprochés
 * exécutent deux fois `handleSubmit` avant le flush → `addTransactionPS` est
 * appelé DEUX fois → deux transactions financières (doublon d'écriture).
 *
 * Le correctif pose un verrou `ref` SYNCHRONE (avant tout `await`), insensible
 * au timing du re-rendu.
 *
 * Non-vacuité : si l'on retire la garde `submitLockRef` de `handleSubmit`, le
 * test « double clic » échoue (addTransactionPS appelé 2 fois) — le simple état
 * `submitting` ne suffit pas car les deux clics sont déclenchés de façon
 * synchrone, avant tout re-rendu.
 */
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const CATEGORY = { id: "cat-1", name: "Offrandes", type: "INCOME" };
const addTransactionPS = vi.fn(async (..._args: unknown[]) => "tx-created");

vi.mock("@/lib/dataLayer", () => ({
  useTransactions: () => ({ data: [] }),
  useCategories: () => ({ data: [CATEGORY] }),
  useCaisses: () => ({ data: [] }),
  useEvents: () => ({ data: [] }),
  addTransactionPS: (...args: unknown[]) => addTransactionPS(...args),
  useOnlineStatus: () => true,
}));
vi.mock("@/lib/receipts", () => ({ addReceipt: vi.fn(async () => undefined) }));
vi.mock("@/lib/orgContext", () => ({ getOrganizationId: () => "org-test" }));
vi.mock("@/hooks/useKeyboardAvoidance", () => ({ useKeyboardAvoidance: () => 0 }));
vi.mock("@/capabilities/policy", () => ({
  policy: { transaction: { validateAmount: () => ({ ok: true }) } },
}));
vi.mock("@/capabilities/notification", () => ({
  notification: { sendNotification: vi.fn(async () => undefined) },
}));
vi.mock("@/lib/periodLock", () => ({ periodLockMessage: () => "" }));
vi.mock("@/components/TopHeader", () => ({ default: () => null }));
vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@ionic/react", () => {
  const P =
    (tag: string) =>
    ({ children, ...rest }: any) =>
      React.createElement(tag, rest, children);
  // IonInput/IonSelect : re-lier les événements Ionic (`onIonInput` /
  // `onIonChange`) aux événements DOM natifs, sinon la saisie ne met pas à jour
  // l'état du composant (les handlers Ionic ne sont pas des props DOM).
  const Input = ({ onIonInput, value, ...rest }: any) =>
    React.createElement("input", {
      ...rest,
      value,
      onChange: (e: any) => onIonInput?.({ detail: { value: e.target.value } }),
    });
  const Select = ({ onIonChange, value, children, ...rest }: any) =>
    React.createElement(
      "select",
      {
        ...rest,
        value,
        onChange: (e: any) => onIonChange?.({ detail: { value: e.target.value } }),
      },
      children,
    );
  return {
    IonPage: P("div"),
    IonHeader: P("div"),
    IonContent: P("div"),
    IonTitle: P("div"),
    IonToolbar: P("div"),
    IonItem: P("div"),
    IonLabel: P("label"),
    IonInput: Input,
    IonTextarea: P("textarea"),
    IonSelect: Select,
    IonSelectOption: P("option"),
    IonButton: ({ children, ...rest }: any) =>
      React.createElement("button", rest, children),
    IonSpinner: P("span"),
  };
});

import TransactionNew from "@/pages/TransactionNew";

beforeEach(() => addTransactionPS.mockClear());
afterEach(cleanup);

/**
 * Monte le formulaire, renseigne les champs obligatoires et renvoie le bouton
 * de soumission ainsi que le conteneur.
 */
function renderForm() {
  const utils = render(
    <MemoryRouter initialEntries={["/transaction/new?type=INCOME"]}>
      <TransactionNew />
    </MemoryRouter>,
  );
  const inputs = utils.container.querySelectorAll("input");
  // Ordre DOM : [0]=montant, [1]=description, [2]=date.
  const setValue = (el: Element, value: string) => {
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  setValue(inputs[0], "5000");
  setValue(inputs[1], "Offrande du dimanche");
  return utils;
}

function submitButton(container: HTMLElement): HTMLButtonElement {
  return Array.from(container.querySelectorAll("button")).find((b) =>
    (b.textContent || "").includes("Enregistrer la transaction"),
  ) as HTMLButtonElement;
}

describe("TransactionNew — anti double-soumission (intégrité)", () => {
  it("un double clic synchrone n'enregistre qu'UNE seule transaction", async () => {
    const { container } = renderForm();
    const button = submitButton(container);
    expect(button).toBeTruthy();

    // Deux clics SANS laisser React re-rendre entre les deux (le scénario réel
    // du double-tap) : les deux handlers s'exécutent dans le même tick.
    await act(async () => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(addTransactionPS).toHaveBeenCalledTimes(1);
  });
});
