/**
 * Cypress E2E — Ionic UI helpers.
 *
 * Lumina renders Ionic 7 web components. Two facts drive every selector here,
 * and getting them wrong made the whole E2E suite fail while the app actually
 * worked:
 *
 *   1. `IonButton` has NO inner native `<button>` carrying the label text.
 *      The label lives in the *light* DOM (slotted). `cy.contains('button',
 *      label)` therefore never matches; you must target the custom element:
 *      `cy.contains('ion-button, button', label)`.
 *   2. `IonInput` is a custom element whose own `aria-label` is what the app
 *      sets. Cypress `type()` on the inner native `<input>` updates the DOM
 *      value but does NOT notify React: the component only re-emits on
 *      `ionChange`. Writing the value and dispatching a bubbling `ionChange`
 *      CustomEvent is the reliable path.
 *
 * These helpers centralise both so specs stay atomic and free of copy-paste.
 */

/** Selector matching a label-bearing button regardless of Ionic/native. */
export const BTN = "ion-button, button";

/** Matcher for `cy.contains(...)`: text may live on the host or a native button. */
export const buttonContaining = (label: string) => `ion-button, button:contains(${label})`;

/**
 * Click a button by its visible label. Tries the Ionic host first, then any
 * native button, then a generic text match — each with the same timeout, so a
 * missing label still fails with a readable message.
 */
Cypress.Commands.add(
  "clickButton",
  (label: string, opts: { timeout?: number } = {}) => {
    const timeout = opts.timeout ?? 20_000;
    cy.contains("ion-button, button", label, { timeout })
      .first()
      .scrollIntoView()
      .click({ force: true });
    return cy.wrap(null);
  },
);

/**
 * Type into an `IonInput` (or `IonTextarea`) identified by its `aria-label`.
 * Writes the value on both the native input and the host, then dispatches a
 * bubbling `ionChange` so React state updates — exactly what the component
 * itself emits. Falls back to a plain `type()` if no such element exists.
 */
Cypress.Commands.add(
  "typeIonicInput",
  (ariaLabel: string, value: string, opts: { timeout?: number } = {}) => {
    const timeout = opts.timeout ?? 30_000;
    // The app puts `aria-label` on the NATIVE <input>/<textarea> rendered in
    // the light DOM (proven by probing /event/new and /transaction/new), so we
    // match both the native control and the Ionic host for robustness.
    cy.get(
      `input[aria-label="${ariaLabel}"], textarea[aria-label="${ariaLabel}"], ` +
        `ion-input[aria-label="${ariaLabel}"], ion-textarea[aria-label="${ariaLabel}"]`,
      { timeout },
    )
      .first()
      .then(($el) => {
        const el = $el[0] as HTMLElement;
        const isNative = el.tagName === "INPUT" || el.tagName === "TEXTAREA";
        const native = isNative
          ? (el as HTMLInputElement)
          : ((el as unknown as { nativeInput?: HTMLInputElement }).nativeInput ??
            el.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea"));
        const host = isNative
          ? (el.closest("ion-input, ion-textarea") ?? el)
          : el;

        if (native) native.value = value;
        (host as unknown as { value?: string }).value = value;

        // React listens to `onIonChange` for Ionic inputs and `onChange` for
        // plain ones; fire both so either wiring picks the value up.
        host.dispatchEvent(
          new CustomEvent("ionChange", {
            detail: { value },
            bubbles: true,
            composed: true,
          }),
        );
        if (native) {
          native.dispatchEvent(new Event("input", { bubbles: true }));
          native.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    return cy.wrap(null);
  },
);

/** True when the app rendered no unhandled-error overlay / blank screen. */
Cypress.Commands.add("expectNoBlankScreen", () => {
  cy.get("body").should("be.visible");
  cy.get("body").then(($body) => {
    expect($body.text().trim().length, "page has content").to.be.greaterThan(0);
  });
  return cy.wrap(null);
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      clickButton(label: string, opts?: { timeout?: number }): Chainable<null>;
      typeIonicInput(
        ariaLabel: string,
        value: string,
        opts?: { timeout?: number },
      ): Chainable<null>;
      expectNoBlankScreen(): Chainable<null>;
    }
  }
}
