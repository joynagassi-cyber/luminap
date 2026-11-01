// @vitest-environment jsdom
/**
 * Moniteur de performance — mesure d'opération lente (émet un rapport) et
 * throttle (n'inonde pas).
 */
import { describe, it, expect, beforeEach } from "vitest";

import {
  measureOperation,
  resetPerfMonitor,
  SLOW_OPERATION_THRESHOLD_MS,
} from "@/lib/observability/perfMonitor";
import {
  getQueuedReports,
  clearQueuedReports,
  resetReporterState,
  setReportTransport,
} from "@/lib/observability/errorReporter";

beforeEach(() => {
  resetPerfMonitor();
  resetReporterState();
  clearQueuedReports();
  setReportTransport(async () => ({ ok: false }));
});

describe("measureOperation", () => {
  it("ne signale PAS une opération rapide", async () => {
    const result = await measureOperation("rapide", async () => 42, 10_000);
    expect(result).toBe(42);
    expect(getQueuedReports()).toHaveLength(0);
  });

  it("signale une opération au-delà du seuil (type performance)", async () => {
    await measureOperation(
      "lente",
      async () => {
        await new Promise((r) => setTimeout(r, 5));
        return "ok";
      },
      0, // seuil 0 → toujours au-dessus
    );
    const report = getQueuedReports()[0];
    expect(report?.type).toBe("performance");
    expect(report?.source).toBe("slow-operation");
    expect(report?.context?.operation).toBe("lente");
  });

  it("propage l'erreur métier sans la masquer", async () => {
    await expect(
      measureOperation(
        "echoue",
        async () => {
          throw new Error("métier");
        },
        0,
      ),
    ).rejects.toThrow("métier");
  });

  it("n'émet qu'un seul rapport par fenêtre de throttle", async () => {
    await measureOperation("a", async () => 1, 0);
    await measureOperation("b", async () => 2, 0);
    expect(getQueuedReports()).toHaveLength(1);
  });

  it("le seuil par défaut est documenté", () => {
    expect(SLOW_OPERATION_THRESHOLD_MS).toBeGreaterThan(0);
  });
});
