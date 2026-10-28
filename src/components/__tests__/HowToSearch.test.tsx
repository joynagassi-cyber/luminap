// @vitest-environment jsdom
/**
 * HowToSearch — recherche guidée « Comment faire ? ».
 *
 * Ce qui est réellement vérifié ici, c'est le CONTRAT D'INTERFACE :
 *  · le champ est interrogeable et filtrable ;
 *  · une requête sans résultat ne laisse pas l'utilisateur dans le vide ;
 *  · un parcours replié cache ses étapes, déplié les montre toutes ;
 *  · le bouton d'action navigue vers la route profonde du parcours ;
 *  · l'attribut `aria-expanded` reflète l'état (accessibilité, pas cosmétique).
 *
 * La logique de score est testée séparément dans `src/lib/__tests__/howto.test.ts`
 * — ici on ne teste que le rendu et les interactions.
 *
 * Note : le dépôt n'a pas `@testing-library/user-event` ; on utilise `fireEvent`,
 * comme les autres tests de composants.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import type { HowTo } from "@/lib/howto";

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

const CATALOGUE: HowTo[] = [
  {
    id: "inviter-membre",
    question: "Comment inviter quelqu'un à rejoindre l'organisation ?",
    summary: "Émettre un code d'invitation.",
    keywords: ["inviter", "invitation", "code"],
    steps: [
      { label: "Ouvrir Invitations → Émettre" },
      { label: "Générer le code", detail: "Le partager ensuite." },
    ],
    route: "/invitation/emit",
    routeLabel: "Émettre une invitation",
    pitfalls: ["Un code expiré est refusé."],
  },
  {
    id: "faire-versement",
    question: "Comment faire un versement entre caisses ?",
    summary: "Transférer entre deux caisses.",
    keywords: ["versement", "transfert", "caisse"],
    steps: [{ label: "Ouvrir Finances → Versement" }],
    route: "/versement",
  },
];

afterEach(() => {
  cleanup();
  navigate.mockClear();
});

// Import après le mock de `react-router-dom`.
import HowToSearch from "../HowToSearch";

const setup = () =>
  render(<HowToSearch catalogue={CATALOGUE} featuredLimit={2} />);

const type = (value: string) =>
  fireEvent.change(screen.getByRole("searchbox"), { target: { value } });

const click = (el: HTMLElement) => fireEvent.click(el);

describe("HowToSearch — état initial", () => {
  it("affiche les suggestions quand le champ est vide", () => {
    setup();
    expect(screen.getByText(/Questions fréquentes/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /inviter quelqu'un/i }),
    ).toBeInTheDocument();
  });

  it("expose un champ de recherche étiqueté", () => {
    setup();
    expect(
      screen.getByRole("searchbox", { name: /rechercher une procédure/i }),
    ).toBeInTheDocument();
  });
});

describe("HowToSearch — recherche", () => {
  it("filtre les parcours à la frappe", () => {
    setup();
    type("versement");

    expect(
      screen.getByText("Comment faire un versement entre caisses ?"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Comment inviter quelqu'un/i)).not.toBeInTheDocument();
  });

  it("ignore les accents et la casse", () => {
    setup();
    type("INVITATION");
    expect(screen.getByText(/Comment inviter quelqu'un/i)).toBeInTheDocument();
  });

  it("affiche un état vide utile, jamais une page blanche", () => {
    setup();
    type("zanzibar");

    expect(
      screen.getByText(/Aucun parcours pour « zanzibar »/i),
    ).toBeInTheDocument();
    // L'échappatoire existe : le tutoriel complet.
    click(screen.getByRole("button", { name: /ouvrir le tutoriel/i }));
    expect(navigate).toHaveBeenCalledWith("/tutoriel");
  });

  it("efface la recherche avec le bouton dédié", () => {
    setup();
    type("versement");
    click(screen.getByRole("button", { name: /effacer la recherche/i }));

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByText(/Questions fréquentes/i)).toBeInTheDocument();
  });
});

describe("HowToSearch — parcours déplié", () => {
  /** Ouvre la recherche sur « inviter » et renvoie le déclencheur du parcours. */
  const openFirst = () => {
    setup();
    type("inviter");
    return screen.getByRole("button", {
      name: /Comment inviter quelqu'un/i,
    });
  };

  it("est replié par défaut (aria-expanded=false, étapes absentes)", () => {
    const trigger = openFirst();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText("Ouvrir Invitations → Émettre"),
    ).not.toBeInTheDocument();
  });

  it("déplie les étapes numérotées, les précisions et les pièges", () => {
    const trigger = openFirst();
    click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ouvrir Invitations → Émettre")).toBeInTheDocument();
    expect(screen.getByText("Le partager ensuite.")).toBeInTheDocument();
    expect(screen.getByText(/À savoir/i)).toBeInTheDocument();
    expect(screen.getByText(/Un code expiré est refusé/i)).toBeInTheDocument();
  });

  it("se replie au second appui", () => {
    const trigger = openFirst();
    click(trigger);
    click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText("Ouvrir Invitations → Émettre"),
    ).not.toBeInTheDocument();
  });

  it("navigue vers la route profonde du parcours", () => {
    const trigger = openFirst();
    click(trigger);
    click(screen.getByRole("button", { name: /émettre une invitation/i }));
    expect(navigate).toHaveBeenCalledWith("/invitation/emit");
  });

  it("utilise un libellé par défaut quand routeLabel est absent", () => {
    setup();
    type("versement");
    click(screen.getByRole("button", { name: /Comment faire un versement/i }));
    expect(
      screen.getByRole("button", { name: /ouvrir la page/i }),
    ).toBeInTheDocument();
  });
});
