// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { notifIconKey } from "@/pages/Notifications";

/**
 * Preuve du correctif : les types d'action réellement persistés en base
 * (EVENT_CREATED, INVITATION_RECEIVED, FORM_SUBMITTED) doivent produire une
 * icône spécifique, et non l'icône générique par défaut.
 */
describe("notifIconKey — icône des notifications", () => {
  it("mappe les types réellement persistés (relevé en base)", () => {
    expect(notifIconKey("EVENT_CREATED")).toBe("event");
    expect(notifIconKey("INVITATION_RECEIVED")).toBe("invitation");
    expect(notifIconKey("FORM_SUBMITTED")).toBe("form");
  });

  it("mappe les types historiques (transaction, budget)", () => {
    expect(notifIconKey("TRANSACTION_PENDING")).toBe("pending");
    expect(notifIconKey("TRANSACTION_APPROVED")).toBe("approved");
    expect(notifIconKey("BUDGET_EXCEEDED")).toBe("exceeded");
  });

  it("retombe sur l'icône générique pour un type inconnu ou vide", () => {
    expect(notifIconKey("PUSH")).toBe("default");
    expect(notifIconKey("")).toBe("default");
    expect(notifIconKey("WHATEVER")).toBe("default");
  });
});
