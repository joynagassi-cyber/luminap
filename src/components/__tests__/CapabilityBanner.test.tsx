// @vitest-environment jsdom
/**
 * CapabilityBanner — contrat RBAC §3.7.
 *
 * Le bandeau doit rendre VISIBLE la projection de `useMyCapabilities` :
 * les capacités accordées sous « Vous pouvez », toutes les autres sous
 * « Vous ne pouvez pas ». Le hook (chantier B) est mocké : on teste ici le
 * rendu du composant, pas la décision d'autorisation (qui appartient à B).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

import type { CapabilityState } from "@/hooks/useMyCapabilities";

const hoisted = vi.hoisted(() => ({
  result: {
    role: null as string | null,
    capabilities: [] as unknown[],
    allowed: [] as unknown[],
    loading: false,
  },
}));

vi.mock("@/hooks/useMyCapabilities", () => ({
  useMyCapabilities: () => hoisted.result,
}));

import CapabilityBanner from "@/components/CapabilityBanner";

const cap = (
  id: string,
  label: string,
  description: string,
  allowed: boolean,
): CapabilityState =>
  ({
    capability: {
      id,
      label,
      description,
      domain: "finance",
      permissions: [],
    },
    allowed,
    source: "role",
  }) as CapabilityState;

/** Conteneur d'un groupe (« Vous pouvez » / « Vous ne pouvez pas »). */
function group(tone: "allowed" | "denied") {
  const marker = document.querySelector(`[data-capability-group="${tone}"]`);
  expect(marker, `groupe ${tone} introuvable`).not.toBeNull();
  return within(marker!.parentElement as HTMLElement);
}

afterEach(() => {
  cleanup();
});

describe("CapabilityBanner", () => {
  it("affiche les capacités accordées sous « Vous pouvez » et les autres sous « Vous ne pouvez pas »", () => {
    hoisted.result = {
      role: "TREASURIER",
      capabilities: [
        cap("finance.manage", "Gérer les finances", "Créer et approuver", true),
        cap("members.manage", "Gérer les membres", "Ajouter des membres", false),
      ],
      allowed: [],
      loading: false,
    };

    render(<CapabilityBanner orgId="org-1" />);

    expect(screen.getByText("Vous pouvez")).toBeInTheDocument();
    expect(screen.getByText("Vous ne pouvez pas")).toBeInTheDocument();

    expect(group("allowed").getByText("Gérer les finances")).toBeInTheDocument();
    expect(group("allowed").queryByText("Gérer les membres")).toBeNull();

    expect(group("denied").getByText("Gérer les membres")).toBeInTheDocument();
    expect(group("denied").queryByText("Gérer les finances")).toBeNull();
  });

  it("affiche la description de chaque capacité", () => {
    hoisted.result = {
      role: "MEMBRE",
      capabilities: [
        cap("reports.export", "Exporter les rapports", "Générer un PDF", false),
      ],
      allowed: [],
      loading: false,
    };

    render(<CapabilityBanner orgId="org-1" />);

    expect(group("denied").getByText("Générer un PDF")).toBeInTheDocument();
  });

  it("expose un rôle accessible (role=status + aria-label)", () => {
    hoisted.result = {
      role: "MEMBRE",
      capabilities: [cap("a", "A", "desc A", true)],
      allowed: [],
      loading: false,
    };

    render(<CapabilityBanner orgId="org-1" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute(
      "aria-label",
      "Vos capacités dans cette organisation",
    );
  });

  it("ne rend rien quand aucune capacité n'est connue", () => {
    hoisted.result = {
      role: null,
      capabilities: [],
      allowed: [],
      loading: false,
    };

    const { container } = render(<CapabilityBanner orgId="org-1" />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("status")).toBeNull();
  });
});
