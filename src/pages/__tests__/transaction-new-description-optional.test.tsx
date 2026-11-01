// @vitest-environment jsdom
/**
 * Formulaires — la DESCRIPTION n'est pas obligatoire.
 *
 * Défaut mesuré : `handleSubmit` exigeait `description` (avec montant et
 * catégorie) → l'utilisateur devait inventer un texte pour un mouvement déjà
 * décrit par sa catégorie (« Dîme »), sinon « Veuillez remplir tous les champs
 * obligatoires ».
 *
 * Contrainte de schéma : `transactions.description` est NOT NULL en base : on
 * ne peut pas écrire NULL/'' → le formulaire doit fournir un repli LISIBLE (la
 * catégorie choisie), jamais un placeholder trompeur.
 *
 * Non-vacuité : en rétablissant `!trimmedDesc` dans la garde de `handleSubmit`,
 * le test « soumission sans description » échoue (addTransactionPS non appelé).
 */
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const CATEGORY = { id: "cat-1", name: "Offrandes", label_fr: "Dîme", type: "INCOME" };
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

function setNativeValue(el: Element, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function submitButton(container: HTMLElement): HTMLButtonElement {
  return Array.from(container.querySelectorAll("button")).find((b) =>
    (b.textContent || "").includes("Enregistrer la transaction"),
  ) as HTMLButtonElement;
}

describe("TransactionNew — description facultative", () => {
  it("enregistre SANS description et écrit un repli non vide (colonne NOT NULL)", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/transaction/new?type=INCOME"]}>
        <TransactionNew />
      </MemoryRouter>,
    );
    const inputs = container.querySelectorAll("input");
    // [0]=montant, [1]=description (laissée VIDE), [2]=date.
    setNativeValue(inputs[0], "5000");
    // La catégorie est présélectionnée par défaut (cat-1).

    await act(async () => {
      submitButton(container).dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(addTransactionPS).toHaveBeenCalledTimes(1);
    const payload = addTransactionPS.mock.calls[0][0] as any;
    // La description ne doit JAMAIS être vide/NULL (contrainte NOT NULL).
    expect(typeof payload.description).toBe("string");
    expect(payload.description.length).toBeGreaterThan(0);
    // Repli lisible : le libellé de la catégorie, pas un texte inventé.
    expect(payload.description).toBe("Dîme");
  });

  it("respecte la description saisie quand elle est fournie", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/transaction/new?type=INCOME"]}>
        <TransactionNew />
      </MemoryRouter>,
    );
    const inputs = container.querySelectorAll("input");
    setNativeValue(inputs[0], "5000");
    setNativeValue(inputs[1], "Offrande spéciale");

    await act(async () => {
      submitButton(container).dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(addTransactionPS).toHaveBeenCalledTimes(1);
    expect((addTransactionPS.mock.calls[0][0] as any).description).toBe(
      "Offrande spéciale",
    );
  });
});
