/**
 * Labo Design — Bouton d'ouverture du Labo.
 *
 * Affiché uniquement en développement (`import.meta.env.DEV`). C'est le seul
 * point d'entrée du panneau Labo dans l'UI. En production, ce composant ne
 * rend rien.
 */

import { useState } from "react";
import { Wrench } from "lucide-react";
import { PanneauLabo } from "./panneau-labo";
import { isLaboEnabled } from "./labo-guard";

export function LaboToggle() {
  if (!isLaboEnabled()) return null;

  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-primary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "var(--shadow-pop)",
        }}
        aria-label="Ouvrir le Labo design (développement)"
        title="Labo — développement uniquement"
      >
        <Wrench size={18} strokeWidth={2} />
      </button>
      {open && <PanneauLabo open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
