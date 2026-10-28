// @vitest-environment jsdom
/**
 * R52.r — `/settings/notifications` annonçait un fait FAUX avant la 1re lecture.
 *
 * Même cause systémique que R52.l→R52.q (`isLoading` mort / réplique vide,
 * D-R41) : avant le premier sync, l'écran affichait « Tout est lu », « 0 au
 * total » et « Aucune notification à vider » — trois affirmations présentées
 * comme un état stable alors que la donnée n'avait pas encore été lue.
 *
 * Ce test échoue sans la garde (vérifié : garde retirée → « Tout est lu »).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state = { ready: false };

vi.mock("@/lib/dataLayer", () => ({
  useNotifications: () => ({ data: [], isLoading: false }),
  isPowerSyncReadyNow: () => state.ready,
  useCurrentUser: () => ({ id: "u-1", role: "ADMIN", first_name: "A", last_name: "B" }),
  useAppConfig: () => ({ config: { churchName: "Lumina" }, updateConfig: vi.fn() }),
}));

vi.mock("@/components/TopHeader", () => ({
  default: ({ title }: { title: string }) => <div data-testid="top-header">{title}</div>,
}));

vi.mock("@/store/useLocalStore", () => ({
  useLocalStore: () => ({ markAllNotificationsRead: vi.fn(async () => undefined) }),
}));

vi.mock("@/capabilities/notification", () => ({
  notification: {
    initialize: vi.fn(async () => undefined),
    requestPermission: vi.fn(async () => true),
  },
}));

import SettingsNotifications from "@/pages/SettingsNotifications";

afterEach(cleanup);

describe("R52.r — /settings/notifications", () => {
  it("n'annonce pas « Tout est lu / 0 au total » avant la 1re lecture", () => {
    state.ready = false;
    render(
      <MemoryRouter>
        <SettingsNotifications />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Tout est lu")).toBeNull();
    expect(screen.queryByText("0 au total")).toBeNull();
    expect(screen.queryByText("Aucune notification à vider")).toBeNull();
    expect(screen.getAllByText(/Chargement/).length).toBeGreaterThan(0);
  });

  it("annonce « Tout est lu » une fois la réplique disponible et réellement vide", () => {
    state.ready = true;
    render(
      <MemoryRouter>
        <SettingsNotifications />
      </MemoryRouter>,
    );

    expect(screen.getByText("Tout est lu")).toBeInTheDocument();
    expect(screen.getByText("0 au total")).toBeInTheDocument();
    expect(screen.getByText("Aucune notification à vider")).toBeInTheDocument();
  });
});
