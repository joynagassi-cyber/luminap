// @vitest-environment node
/**
 * Politique d'environnement de l'edge function `report-error` — logique PURE,
 * testée SANS Deno (comme `issue.ts` / `throttle.ts`).
 *
 * Enjeu : un client PÉRIMÉ (serveur de dev de la CI Cypress `pnpm run dev`,
 * ancien bundle, APK non mis à jour) appelle l'endpoint public malgré la garde
 * client `isTransmissionAllowed`. Mesuré (2026-11-01, PR #200) : ~58 Issues
 * « Tâche longue détectée » créées depuis `environment: development`. La garde
 * serveur est le seul point de passage autoritaire.
 */
import { describe, it, expect } from "vitest";

import {
  isNonProductionReport,
  NON_PRODUCTION_ENVIRONMENTS,
} from "../../../supabase/functions/report-error/environment";

describe("edge report-error — filtre d'environnement non-production", () => {
  it("bloque les étiquettes non-production connues (casse/espaces tolérés)", () => {
    for (const env of NON_PRODUCTION_ENVIRONMENTS) {
      expect(isNonProductionReport({ environment: env }), env).toBe(true);
      expect(isNonProductionReport({ environment: `  ${env.toUpperCase()} ` }), env).toBe(true);
    }
    // Le cas réel mesuré.
    expect(isNonProductionReport({ environment: "development" })).toBe(true);
  });

  it("accepte la production et les étiquettes inconnues/absentes (fail-open)", () => {
    expect(isNonProductionReport({ environment: "production" })).toBe(false);
    expect(isNonProductionReport({ environment: "staging" })).toBe(false);
    expect(isNonProductionReport({ environment: "" })).toBe(false);
    expect(isNonProductionReport({ environment: undefined })).toBe(false);
    expect(isNonProductionReport({})).toBe(false);
  });
});
