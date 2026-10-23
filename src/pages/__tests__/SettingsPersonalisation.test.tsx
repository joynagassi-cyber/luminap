// @vitest-environment jsdom
/**
 * SettingsPersonalisation — le nom de l'organisation doit être persisté EN BASE.
 *
 * Défaut corrigé : « Sauvegarder » n'écrivait le nom que dans `lumina-config`
 * (localStorage). Les autres membres de l'organisation, les rapports et
 * l'en-tête ne voyaient donc jamais le nouveau nom. Ces tests verrouillent :
 *  - l'appel à `renameOrganizationPS` (écriture base) ;
 *  - le traitement d'un refus de permission (0 ligne) ;
 *  - le traitement d'une erreur d'écriture (message visible, pas de faux
 *    « Sauvegardé »).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const renameOrganizationPS = vi.fn();
const updateConfig = vi.fn(async () => undefined);

// Rôle de l'utilisateur courant (mutable, lu au rendu).
const me = { role: "ADMIN" };
vi.mock("@/lib/dataLayer", () => ({
  useAppConfig: () => ({
    config: { churchName: "Ancien nom", churchLogoUrl: "", userPhoto: "" },
    updateConfig: (...a: unknown[]) => updateConfig(...a),
  }),
  useCurrentUser: () => ({ id: "u1", role: me.role }),
  renameOrganizationPS: (...a: unknown[]) => renameOrganizationPS(...a),
}));

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-e2e",
  hasResolvedOrganization: () => true,
}));

vi.mock("@/lib/storageService", () => ({
  uploadLuminaFile: vi.fn(async () => "logos/x.png"),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) } },
}));

vi.mock("@/components/SettingsShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@ionic/react", async () => {
  const { createIonicMock } = await import("@/test/ionic-mock");
  return createIonicMock();
});

import SettingsPersonalisation from "@/pages/SettingsPersonalisation";

function setOrgName(value: string) {
  const el = document.getElementById("org-name") as HTMLInputElement;
  fireEvent.change(el, { target: { value } });
}

describe("SettingsPersonalisation — persistance du nom d'organisation", () => {
  beforeEach(() => {
    renameOrganizationPS.mockReset();
    updateConfig.mockClear();
    renameOrganizationPS.mockResolvedValue(1);
    me.role = "ADMIN";
  });
  afterEach(cleanup);

  it("écrit le nom EN BASE (renameOrganizationPS) puis met à jour le cache local", async () => {
    render(<SettingsPersonalisation />);
    setOrgName("Église Nouvelle");
    fireEvent.click(screen.getByLabelText("Sauvegarder la personnalisation"));

    await waitFor(() =>
      expect(renameOrganizationPS).toHaveBeenCalledWith("org-e2e", "Église Nouvelle"),
    );
    await waitFor(() => expect(updateConfig).toHaveBeenCalled());
    expect(screen.queryByTestId("org-save-error")).not.toBeInTheDocument();
  });

  it("rôle non administrateur : erreur visible, AUCUNE écriture (base ni cache)", async () => {
    me.role = "MEMBRE";
    render(<SettingsPersonalisation />);
    setOrgName("Nom interdit");
    fireEvent.click(screen.getByLabelText("Sauvegarder la personnalisation"));

    const alert = await screen.findByTestId("org-save-error");
    expect(alert).toHaveTextContent(/administrateur/i);
    expect(renameOrganizationPS).not.toHaveBeenCalled();
    // Le cache local ne doit pas mentir : pas d'écriture.
    expect(updateConfig).not.toHaveBeenCalled();
  });

  it("erreur d'écriture : erreur visible, pas de faux « Sauvegardé »", async () => {
    renameOrganizationPS.mockRejectedValue(new Error("réseau"));
    render(<SettingsPersonalisation />);
    setOrgName("Peu importe");
    fireEvent.click(screen.getByLabelText("Sauvegarder la personnalisation"));

    const alert = await screen.findByTestId("org-save-error");
    expect(alert).toHaveTextContent(/réseau/i);
    expect(updateConfig).not.toHaveBeenCalled();
  });
});
