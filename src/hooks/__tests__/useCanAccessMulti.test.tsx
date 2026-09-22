/**
 * useCanAccessMulti (B.1) — tests du hook d'accès multi-org.
 *
 * 4 cas attendus par le cahier :
 *   1. canAccess=true,  legacy=false → allowed=true,  source="federation"
 *   2. canAccess=false, legacy=true  → allowed=true,  source="legacy"
 *   3. les deux false               → allowed=false, source="neither"
 *   4. cache : 2 montages identiques → 1 seul appel `federation.canAccess`
 *
 * `federation` et `security` sont mockés — pas de PowerSync, pas de RBAC réel.
 *
 * Note technique : le chemin fédéré se résout en micro-tâche. Pour lire la
 * valeur réglée par le re-mount de la référence de cache dans le même
 * processus, on passe par une `renderHook` unique dont la `hook` callback
 * se ré-exécute via l'état interne du composant (voir `forceRemount`).
 *
 * Run with: npx vitest run src/hooks/__tests__/useCanAccessMulti.test.tsx
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { federation } from "@/capabilities/federation";
import { security } from "@/capabilities/security";
import {
  useCanAccessMulti,
  clearCanAccessMultiCache,
  type CanAccessMultiResult,
} from "@/hooks/useCanAccessMulti";

const UID = "u1";
const ORG = "org-1";
const RESOURCE = "report";
const ACTION = "export";
const ROLE = "TREASURIER";

let mockCanAccess: ReturnType<typeof vi.fn>;

beforeAll(() => {
  mockCanAccess = vi.fn(async () => false);
  vi.spyOn(federation, "canAccess").mockImplementation(
    (..._args: unknown[]) => mockCanAccess(...(_args as [])),
  );
});

beforeEach(() => {
  mockCanAccess.mockClear();
  vi.spyOn(security, "hasPermission");
  clearCanAccessMultiCache();
});

function mockLegacy(allows: boolean) {
  vi.mocked(security.hasPermission).mockImplementation(() => allows);
}

/**
 * Rend le hook, attend la micro-tâche de résolution fédérée, puis force un
 * re-render du composant pour qu'il relise la valeur cachée (résolue).
 * Retourne la référence `result.current` finale.
 */
async function runAndSettle(legacyAllows: boolean, fedResolves: boolean) {
  mockLegacy(legacyAllows);
  mockCanAccess.mockClear();
  mockCanAccess.mockImplementation(async () => fedResolves);

  const handle = renderHook(
    () => useCanAccessMulti(UID, ORG, RESOURCE, ACTION, undefined, ROLE),
  );

  // 1er rendu : loading=true tant que la promesse fédérée n'a pas réglé le
  // cache module-level.
  const first = handle.result.current as CanAccessMultiResult;

  // Fait avancer la micro-tâche (Promise .then) pour que le cache soit mis
  // à jour avec le résultat fédéré.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

  // Re-monte : le composant lit la valeur résolue depuis le cache.
  const handle2 = renderHook(
    () => useCanAccessMulti(UID, ORG, RESOURCE, ACTION, undefined, ROLE),
  );
  const settled = handle2.result.current as CanAccessMultiResult;

  return { first, settled, calls: mockCanAccess.mock.calls.length };
}

describe("useCanAccessMulti (B.1)", () => {
  it("1. canAccess=true, legacy=false → allowed=true, source='federation'", async () => {
    const { first, settled, calls } = await runAndSettle(false, true);

    // 1er rendu : la résolution fédérée est en attente.
    expect(first.loading).toBe(true);
    expect(first.allowed).toBe(false); // legacy refusé, fed pas encore réglé
    expect(first.source).toBe("neither");

    // Après résolution : le chemin fédéré accorde.
    expect(settled.loading).toBe(false);
    expect(settled.allowed).toBe(true);
    expect(settled.source).toBe("federation");

    // Le service fédéré a été appelé au moins une fois.
    expect(calls).toBeGreaterThan(0);
  });

  it("2. canAccess=false, legacy=true → allowed=true, source='legacy'", async () => {
    const { first, settled } = await runAndSettle(true, false);

    // Dès le 1er rendu : le legacy (synchrone) permet immédiatement.
    expect(first.allowed).toBe(true);
    expect(first.source).toBe("legacy");
    expect(first.loading).toBe(true); // fed pas encore réglé

    // Après résolution : le fed refuse, le legacy reste la seule source.
    expect(settled.loading).toBe(false);
    expect(settled.allowed).toBe(true);
    expect(settled.source).toBe("legacy");
  });

  it("3. les deux false → allowed=false, source='neither'", async () => {
    const { first, settled } = await runAndSettle(false, false);

    expect(first.allowed).toBe(false);
    expect(first.source).toBe("neither");
    expect(first.loading).toBe(true);

    expect(settled.loading).toBe(false);
    expect(settled.allowed).toBe(false);
    expect(settled.source).toBe("neither");
  });

  it("4. cache : 2 montages identiques → 1 seul appel de federation.canAccess", async () => {
    mockLegacy(false);
    // Un compteur global survit aux re-mounts (contrairement à
    // `mockCanAccess.mock.calls` qui est réinitialisé par chaque montage).
    let totalCalls = 0;
    mockCanAccess.mockImplementation(async () => {
      totalCalls += 1;
      return true;
    });

    // 1er montage : résout et met en cache.
    const h1 = renderHook(
      () => useCanAccessMulti(UID, ORG, RESOURCE, ACTION, undefined, ROLE),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const afterFirst = totalCalls;
    expect(afterFirst).toBeGreaterThan(0);

    // 2e montage identique : le cache module-level doit éviter le re-call.
    const h2 = renderHook(
      () => useCanAccessMulti(UID, ORG, RESOURCE, ACTION, undefined, ROLE),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(totalCalls).toBe(afterFirst);
    // Et le résultat des deux montages est le même (fed accorde).
    expect(h1.result.current).toMatchObject({ allowed: true, source: "federation" });
    expect(h2.result.current).toMatchObject({ allowed: true, source: "federation" });
  });

  it("cache par scope : même (user,org,res,action) avec scope différent → re-call", async () => {
    mockLegacy(false);
    mockCanAccess.mockClear();
    mockCanAccess.mockImplementation(async () => true);

    // Montage sans scope : résout et cache la clé "global".
    const handleA = renderHook(
      () => useCanAccessMulti(UID, ORG, RESOURCE, ACTION, undefined, ROLE),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const callsBefore = mockCanAccess.mock.calls.length;

    // Montage avec scope : clé de cache différente → le service est rappelé.
    const handleB = renderHook(
      () =>
        useCanAccessMulti(UID, ORG, RESOURCE, ACTION, { resource: "group", id: "G1" }, ROLE),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const callsAfter = mockCanAccess.mock.calls.length;

    expect(callsAfter).toBe(callsBefore + 1);
    expect(handleA.result.current).toBeDefined();
    expect(handleB.result.current).toBeDefined();
  });
});
