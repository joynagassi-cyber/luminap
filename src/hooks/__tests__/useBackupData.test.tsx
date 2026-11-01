// @vitest-environment jsdom
/**
 * PR2 — collecte des données de sauvegarde (`useBackupData`).
 *
 * Ce hook est le SEUL point qui décide ce qui entre dans la sauvegarde et
 * QUAND elle est annonçable. Il était jusqu'ici toujours remplacé par un mock
 * dans les tests de l'écran (`SettingsGestion-backup.test.tsx`), donc ses
 * invariants n'étaient pas vérifiés :
 *
 *   1. R52 — `ready` = `isPowerSyncReadyNow()`. Tant que la réplique n'est pas
 *      lue, `ready` DOIT rester faux : c'est ce drapeau qui empêche l'écran
 *      d'annoncer « 0 élément » (fait faux). Le forcer à `true` dans le hook
 *      ne faisait échouer AUCUN test — trou de non-vacuité fermé ici.
 *   2. Cloisonnement d'organisation — les champs personnalisés ne sont pas
 *      filtrés par org côté SQL (`listCustomFieldDefinitionsPS`), le hook DOIT
 *      borner sur l'organisation active. Sans ce filtre, la sauvegarde d'une
 *      organisation exporterait les champs d'une AUTRE (fuite de données).
 *   3. `counts`/`total` reflètent les données réellement collectées et
 *      `buildBundle()` produit une enveloppe cohérente.
 *
 * NON-VACUITÉ (vérifié) : remplacer `ready: isPowerSyncReadyNow()` par
 * `ready: true` dans `src/hooks/useBackupData.ts` ⇒ le test « pas prêt » échoue.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";

const state = { ready: false };

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: () => "org-1",
}));

const formDefinitions = [
  { id: "f1", orgId: "org-1", key: "k", name: "Formulaire", version: 1 },
];

const customFieldDefinitions = [
  { id: "c1", orgId: "org-1", entityType: "Member", key: "a", label: "A", type: "text", order: 0 },
  { id: "c2", orgId: "org-2", entityType: "Member", key: "b", label: "B", type: "text", order: 1 },
];

vi.mock("@/lib/dataLayer", () => ({
  useTransactions: () => ({ data: [{ id: "t1" }, { id: "t2" }], isLoading: false }),
  useGroups: () => ({ data: [{ id: "g1" }], isLoading: false }),
  useMembers: () => ({ data: [], isLoading: false }),
  useEvents: () => ({ data: [], isLoading: false }),
  useCaisses: () => ({ data: [], isLoading: false }),
  useAccounts: () => ({ data: [], isLoading: false }),
  useAuditEntries: () => ({ data: [{ id: "a1" }], isLoading: false }),
  useNotifications: () => ({ data: [], isLoading: false }),
  useDocuments: () => ({ data: [], isLoading: false }),
  listFormDefinitionsPS: vi.fn(async () => formDefinitions),
  listCustomFieldDefinitionsPS: vi.fn(async () => customFieldDefinitions),
  isPowerSyncReadyNow: () => state.ready,
}));

vi.mock("@/lib/clientErrors", () => ({
  captureClientError: vi.fn(),
}));

import { useBackupData } from "@/hooks/useBackupData";

afterEach(cleanup);

describe("useBackupData — disponibilité (R52) et périmètre de sauvegarde", () => {
  it("ready reflète isPowerSyncReadyNow() (faux tant que la réplique n'est pas lue)", () => {
    state.ready = false;
    const { result } = renderHook(() => useBackupData());
    expect(result.current.ready).toBe(false);
  });

  it("ready devient vrai quand la réplique est prête", () => {
    state.ready = true;
    const { result } = renderHook(() => useBackupData());
    expect(result.current.ready).toBe(true);
  });

  it("borne les champs personnalisés sur l'organisation active (pas de fuite inter-org)", async () => {
    state.ready = true;
    const { result } = renderHook(() => useBackupData());

    await waitFor(() => {
      expect(result.current.counts.custom_fields).toBe(1);
    });
    const bundle = result.current.buildBundle();
    const ids = (bundle.data.custom_fields as Array<{ id: string }>).map((f) => f.id);
    expect(ids).toEqual(["c1"]);
    expect(bundle.orgId).toBe("org-1");
  });

  it("dérive counts/total des données collectées et construit une enveloppe cohérente", async () => {
    state.ready = true;
    const { result } = renderHook(() => useBackupData());

    await waitFor(() => {
      expect(result.current.counts.forms).toBe(1);
    });
    expect(result.current.counts.transactions).toBe(2);
    expect(result.current.counts.audit_entries).toBe(1);
    expect(result.current.total).toBe(
      Object.values(result.current.counts).reduce((n, c) => n + c, 0),
    );

    const bundle = result.current.buildBundle();
    expect(bundle.format).toBe("lumina-backup");
    expect(bundle.data.transactions).toHaveLength(2);
    expect(bundle.counts.forms).toBe(1);
  });
});
