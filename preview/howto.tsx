/* eslint-disable react-refresh/only-export-components -- point d'entrée de développement, pas un module de composant. */
/**
 * Aperçu autonome de `HowToSearch` — fichier de développement uniquement.
 *
 * Sert à contrôler visuellement le rendu mobile sans backend, sans
 * authentification et sans Supabase. Il n'est pas destiné au build applicatif :
 * il n'est référencé que par `preview/howto.html`.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import "../src/globals.css";
import HowToSearch from "../src/components/HowToSearch";

function Frame() {
  return (
    <div style={{ backgroundColor: "var(--canvas)", minHeight: "100dvh" }}>
      {/* Largeur d'un iPhone 13/14 pour juger les zones tactiles. */}
      <div
        style={{
          maxWidth: 390,
          margin: "0 auto",
          padding: "16px 20px 48px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 12,
          }}
        >
          Aperçu · zone de pouce
        </div>
        <HowToSearch onSelectRoute={(r) => console.log("navigation →", r)} />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MemoryRouter>
      <Frame />
    </MemoryRouter>
  </StrictMode>,
);
