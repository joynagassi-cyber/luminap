/**
 * Garde — `ConfirmModal` doit toujours fournir un TABLEAU à la prop `inputs`
 * de `IonAlert`.
 *
 * Contexte (bug réel reproduit en local sous Cypress, corrigé en 2026-11) :
 * avec React 19, un accessoire JSX `inputs={undefined}` est écrit comme
 * PROPRIÉTÉ (`el.inputs = undefined`) sur le custom element, ce qui écrase le
 * défaut `[]` du cœur Ionic. Le rendu de l'alerte lève alors un
 * `TypeError: ... reading 'find'` (dans `inputsChanged`) et TOUT le contenu de
 * l'alerte avorte : ni titre (`.alert-title`), ni boutons (`.alert-button`).
 * C'est ce qui faisait échouer `archives-purge.cy.ts` / `archives-restore.cy.ts`
 * (« Expected to find content: 'Supprimer définitivement ?' but never did »).
 *
 * La garde échoue si `inputs` reçoit `undefined` (littéral ou via un ternaire).
 *
 * Non-vacuité : remettre `: undefined` dans le ternaire de `inputs` fait
 * échouer le test (vérifié par mutation).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = resolve(__dirname, "../ConfirmModal.tsx");

/** Retire les commentaires pour ne pas matcher la documentation du piège. */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

describe("ConfirmModal — inputs d'IonAlert toujours défini", () => {
  const code = stripComments(readFileSync(SRC, "utf8"));

  it("ne passe jamais `inputs={undefined}`", () => {
    expect(code).not.toMatch(/inputs=\{\s*undefined\s*\}/);
  });

  it("ne résout jamais `inputs` vers `undefined` (ternaire)", () => {
    const start = code.indexOf("inputs={");
    expect(start, "prop `inputs` introuvable — garde à mettre à jour").toBeGreaterThanOrEqual(0);
    // Fenêtre jusqu'à la prop suivante, bornée pour rester locale au JSX.
    const end = code.indexOf("backdropDismiss", start);
    const region = code.slice(start, end === -1 ? start + 800 : end);
    expect(region).not.toMatch(/\bundefined\b/);
  });
});
