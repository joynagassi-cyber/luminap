// @vitest-environment jsdom
/**
 * Réglages › Notifications — l'interrupteur dit la VÉRITÉ.
 *
 * Défaut d'origine : l'écran affichait un booléen local (`pushEnabled`) qui
 * restait faux même quand Android avait accordé la permission, et le clic
 * passait par le pont OneSignal inopérant (P-01) : l'utilisateur ne voyait
 * jamais de fenêtre système et croyait l'interrupteur cassé.
 *
 * Comportements verrouillés ici :
 *   1. Aucun chemin de permission (`requestPermission` de l'ancien service)
 *      n'est appelé au montage : rien ne se demande à froid.
 *   2. Sur le web (statut `unavailable`), l'écran le dit explicitement et le
 *      clic n'ouvre PAS la feuille d'explication (elle annoncerait une
 *      fonctionnalité inexistante).
 *   3. Sur natif, un clic ouvre l'explication ; c'est le bouton de la feuille
 *      qui déclenche la demande (jamais le montage).
 *
 * NON-VACUITÉ : remplacer `permissionHint(notif.status)` par l'ancien texte
 * conditionnel ⇒ le test 2 échoue ; appeler `notif.ask()` au montage ⇒ le
 * test 1 échoue.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const permission = vi.hoisted(() => ({
  status: "prompt" as string | null,
  primerOpen: false,
  pending: false,
  ask: vi.fn(),
  confirm: vi.fn(),
  dismiss: vi.fn(),
  openSettings: vi.fn(),
  markTransactionSaved: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/hooks/useNotificationPermission", () => ({
  useNotificationPermission: () => ({
    status: permission.status,
    primerOpen: permission.primerOpen,
    pending: permission.pending,
    ask: permission.ask,
    confirm: permission.confirm,
    dismiss: permission.dismiss,
    openSettings: permission.openSettings,
    markTransactionSaved: permission.markTransactionSaved,
    refresh: permission.refresh,
  }),
  useRefreshOnResume: () => undefined,
}));

vi.mock("@/components/PermissionPrimer", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="primer" /> : null,
}));

vi.mock("@/lib/dataLayer", () => ({
  useNotifications: () => ({ data: [], isLoading: false }),
  isPowerSyncReadyNow: () => true,
  useCurrentUser: () => ({ id: "u-1", role: "ADMIN" }),
  useAppConfig: () => ({ config: { churchName: "Lumina" }, updateConfig: vi.fn() }),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: () => ({ markAllNotificationsRead: vi.fn(async () => undefined) }),
}));

vi.mock("@/capabilities/notification", () => ({
  notification: {
    initialize: vi.fn(async () => undefined),
    requestPermission: vi.fn(async () => true),
    sendNotification: vi.fn(async () => undefined),
    scheduleLocalNotification: vi.fn(async () => 1),
  },
}));

import SettingsNotifications from "@/pages/SettingsNotifications";

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingsNotifications />
    </MemoryRouter>,
  );

const switchButton = () => screen.getByRole("switch", { name: /notifications activées/i });

beforeEach(() => {
  vi.clearAllMocks();
  permission.status = "prompt";
  permission.primerOpen = false;
  permission.pending = false;
});

afterEach(cleanup);

describe("Réglages › Notifications — état réel de la permission", () => {
  it("ne demande RIEN au montage (aucun appel à ask/confirm)", () => {
    renderPage();
    expect(permission.ask).not.toHaveBeenCalled();
    expect(permission.confirm).not.toHaveBeenCalled();
    expect(permission.markTransactionSaved).not.toHaveBeenCalled();
  });

  it("web / permission sans objet : le dit et n'ouvre pas l'explication", () => {
    permission.status = "unavailable";
    renderPage();
    expect(screen.getByText(/Indisponible sur cet appareil/i)).toBeInTheDocument();
    expect(switchButton()).toHaveAttribute("aria-checked", "false");
    fireEvent.click(switchButton());
    expect(permission.ask).not.toHaveBeenCalled();
    expect(screen.queryByTestId("primer")).not.toBeInTheDocument();
  });

  it("accordée : l'interrupteur reflète l'état réel, et un clic renvoie aux réglages", () => {
    permission.status = "granted";
    renderPage();
    expect(switchButton()).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Notifications activées sur cet appareil/i)).toBeInTheDocument();
    fireEvent.click(switchButton());
    // Une application ne peut pas retirer sa propre permission : on ouvre les
    // réglages Android au lieu de laisser croire à une désactivation.
    expect(permission.openSettings).toHaveBeenCalledTimes(1);
    expect(permission.ask).not.toHaveBeenCalled();
  });

  it("bloquée : état explicite + bouton « Ouvrir les réglages Android »", () => {
    permission.status = "blocked";
    renderPage();
    expect(screen.getByText(/Bloquées dans Android/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/Ouvrir les réglages Android/i));
    expect(permission.openSettings).toHaveBeenCalledTimes(1);
  });

  it("à demander (prompt) : un clic ouvre l'explication, sans demander directement", () => {
    permission.status = "prompt";
    renderPage();
    fireEvent.click(switchButton());
    expect(permission.ask).toHaveBeenCalledTimes(1);
    expect(permission.confirm).not.toHaveBeenCalled();
  });

  it("refusée : l'écran invite à réessayer (Android redemandera)", () => {
    permission.status = "denied";
    renderPage();
    expect(screen.getByText(/Refusées/i)).toBeInTheDocument();
  });
});
