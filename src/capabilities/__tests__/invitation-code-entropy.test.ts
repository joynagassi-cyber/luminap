/**
 * Invitation — le code est un JETON PORTEUR (QR/lien remis hors-bande).
 *
 * DÉFAUT (réel) : `generateCode()` utilisait `Math.random()` — un générateur
 * NON cryptographique, à flux prévisible. Un code d'invitation ouvre l'accès
 * à une organisation (rôle + grants) ; sa valeur ne doit pas être devinable.
 *
 * Preuve du défaut : en figeant `Math.random`, deux codes successifs sont
 * IDENTIQUES (le code est entièrement déterminé par le flux `Math.random`).
 * Un générateur cryptographique (`crypto.getRandomValues`) ignore ce flux et
 * produit des codes distincts.
 */
import { describe, it, expect } from "vitest";
import { generateCode } from "@/capabilities/invitation";

describe("generateCode — entropie cryptographique", () => {
  it("n'est PAS déterminé par Math.random (CSPRNG requis)", () => {
    const original = Math.random;
    try {
      Math.random = () => 0.4242424242;
      const first = generateCode();
      const second = generateCode();
      expect(first).not.toBe(second);
    } finally {
      Math.random = original;
    }
  });

  it("conserve le format LUM-XXXXXX et l'alphabet sans ambiguïté", () => {
    const code = generateCode();
    expect(code).toMatch(/^LUM-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(code).not.toMatch(/[IO01]/);
  });

  it("produit des codes variés (pas de collision sur 200 tirages)", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateCode()));
    expect(codes.size).toBe(200);
  });
});
