/**
 * Garde COMPORTEMENTALE (pas seulement structurelle) de la transmission des
 * rapports d'erreur vers GitHub.
 *
 * Défaut mesuré (2026-11-01) : la CI GitHub exporte `NODE_ENV=production`,
 * donc un `vite dev` (serveur de dev Cypress sur `localhost:8080`) voyait
 * `import.meta.env.PROD === true` et remontait ses erreurs au dépôt PUBLIC
 * (~58 Issues « Tâche longue détectée »). `PROD` seul est un mauvais
 * discriminant ; `MODE` distingue de façon fiable un `vite dev`/vitest d'un
 * vrai build.
 */
import { describe, it, expect } from "vitest";

import { isTransmissionAllowedFor } from "../observability/errorReporter";

describe("isTransmissionAllowedFor — décision pure par environnement", () => {
  it("REFUSE le cas CI exact : PROD hérité vrai + MODE=development (vite dev)", () => {
    expect(isTransmissionAllowedFor({ PROD: true, MODE: "development" })).toBe(false);
  });

  it("refuse le mode test (vitest)", () => {
    expect(isTransmissionAllowedFor({ PROD: true, MODE: "test" })).toBe(false);
  });

  it("refuse un build non-production (PROD=false)", () => {
    expect(isTransmissionAllowedFor({ PROD: false, MODE: "production" })).toBe(false);
  });

  it("refuse quand PROD est absent", () => {
    expect(isTransmissionAllowedFor({ MODE: "production" })).toBe(false);
  });

  it("autorise un VRAI build de production (PROD=true, MODE=production)", () => {
    expect(isTransmissionAllowedFor({ PROD: true, MODE: "production" })).toBe(true);
  });

  it("l'échappatoire VITE_REPORT_ERRORS_IN_DEV=true prime sur tout", () => {
    expect(
      isTransmissionAllowedFor({
        PROD: false,
        MODE: "development",
        VITE_REPORT_ERRORS_IN_DEV: "true",
      }),
    ).toBe(true);
  });
});
