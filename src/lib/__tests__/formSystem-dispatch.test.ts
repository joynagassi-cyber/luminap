/**
 * Tests for dispatchFormSubmission (src/lib/formSystem.ts).
 *
 * Mocks :
 *  - @/lib/dataLayer : addMemberPS / addEventPS / createGroupPS / executeWrite
 *  - @/lib/orgContext : org id fixe
 *  - @/lib/utils, @/lib/powersync, @/lib/cache : neutres (imports transitifs
 *    de formSystem.ts — generateId/writeAudit ne sont pas exercés ici)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted dataLayer mock (addMemberPS / addEventPS / createGroupPS / executeWrite).
const dataLayerMock = vi.hoisted(() => ({
  createFormDefinitionPS: vi.fn(),
  getFormDefinitionPS: vi.fn(async () => null),
  listFormDefinitionsPS: vi.fn(async () => []),
  updateFormDefinitionPS: vi.fn(),
  deleteFormDefinitionPS: vi.fn(),
  createFormSubmissionPS: vi.fn(),
  getFormSubmissionPS: vi.fn(async () => null),
  listFormSubmissionsPS: vi.fn(async () => []),
  updateFormSubmissionPS: vi.fn(),
  addMemberPS: vi.fn(async () => "m-1"),
  addEventPS: vi.fn(async () => "e-1"),
  createGroupPS: vi.fn(async () => "g-1"),
  executeWrite: vi.fn(async () => 1),
}));

vi.mock("@/lib/dataLayer", () => dataLayerMock);

vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: vi.fn(() => "org-1"),
}));

vi.mock("@/lib/utils", () => ({ generateId: vi.fn(() => "gen-id") }));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: vi.fn(async () => ({ rowsAffected: 1 })),
  })),
}));

vi.mock("@/lib/cache", () => ({
  get: vi.fn(),
  set: vi.fn(),
  invalidate: vi.fn(),
}));

import { dispatchFormSubmission } from "@/lib/formSystem";
import * as dataLayer from "@/lib/dataLayer";

const fieldsWith = (mapsToEntityField: string, order = 0) =>
  [
    {
      key: "nom",
      label: "Nom",
      type: "text",
      required: false,
      mapsToEntityField,
      order,
    },
  ] as any[];

// Definition minimale ciblée : on ne remplit que les champs requis du switch.
const defOf = (targetEntityType: string, fields: any[] = []) =>
  ({
    id: "f-1",
    orgId: "org-1",
    key: "k",
    name: "N",
    version: 1,
    targetEntityType,
    status: "DRAFT",
    fields,
    createdAt: "t",
    updatedAt: "t",
  }) as any;

// Données déjà mappées (sortie de mapFormFields), format snake_case :
// l'API du dispatcher est (submission, definition).
const snaky = {
  org_id: "org-1",
  created_from_form_submission_id: "sub-1",
};

describe("dispatchFormSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("member : convertit firstName/lastName en first_name/last_name, joint status/joined_at, écrit l'id lié dans la soumission", async () => {
    const submission = {
      id: "sub-1",
      orgId: "org-1",
      formDefinitionId: "f-1",
      formVersion: 1,
      submittedBy: "u-1",
      submittedAt: "2026-10-01T00:00:00Z",
      data: { nom: "Jean", prenom: "Marie" },
      status: "SUBMITTED" as const,
      createdAt: "2026-10-01T00:00:00Z",
      linkedEntityType: undefined,
      linkedEntityId: undefined,
    } as any;
    const definition = defOf("member", [
      { key: "nom", label: "Nom", type: "text", required: false, mapsToEntityField: "lastName", order: 0 },
      { key: "prenom", label: "Prénom", type: "text", required: false, mapsToEntityField: "firstName", order: 1 },
    ]);

    const result = await dispatchFormSubmission(submission, definition);

    expect(result).toEqual({ linkedEntityType: "member", linkedEntityId: "m-1" });
    expect(dataLayer.addMemberPS).toHaveBeenCalledTimes(1);
    expect(dataLayer.addMemberPS).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: "org-1",
        first_name: "Marie",
        last_name: "Jean",
        status: "ACTIVE",
        phone: "",
        email: "",
        created_from_form_submission_id: "sub-1",
        archived_at: null,
        archived_by: null,
        archive_reason: null,
      }),
    );
    // joined_at : le dispatcher le remplit toujours (une date ISO, pas une valeur de formulaire).
    const memberArg = (dataLayer.addMemberPS as any).mock.calls[0][0];
    expect(memberArg.first_name).toBe("Marie");
    expect(memberArg.last_name).toBe("Jean");
    expect(typeof memberArg.joined_at).toBe("string");
    expect(Date.parse(memberArg.joined_at)).not.toBeNaN();

    // L'entité créée est reliée à la soumission (linkedEntityType / linkedEntityId).
    expect(dataLayer.updateFormSubmissionPS).toHaveBeenCalledTimes(1);
    expect(dataLayer.updateFormSubmissionPS).toHaveBeenCalledWith(
      "sub-1",
      expect.objectContaining({
        linkedEntityType: "member",
        linkedEntityId: "m-1",
        status: "PROCESSED",
      }),
    );
  });

  it("event : convertit startDate/endDate et joint les valeurs par défaut", async () => {
    const submission = {
      id: "sub-2",
      orgId: "org-1",
      formDefinitionId: "f-1",
      formVersion: 1,
      submittedBy: "u-1",
      submittedAt: "2026-10-01T00:00:00Z",
      data: { name: "Baptême", start: "2026-10-10", end: "2026-10-11" },
      status: "SUBMITTED" as const,
      createdAt: "2026-10-01T00:00:00Z",
    } as any;
    const definition = defOf("event", [
      { key: "name", label: "Nom", type: "text", required: false, mapsToEntityField: "name", order: 0 },
      { key: "start", label: "Début", type: "date", required: false, mapsToEntityField: "startDate", order: 1 },
      { key: "end", label: "Fin", type: "date", required: false, mapsToEntityField: "endDate", order: 2 },
    ]);

    const result = await dispatchFormSubmission(submission, definition);

    expect(result).toEqual({ linkedEntityType: "event", linkedEntityId: "e-1" });
    expect(dataLayer.addEventPS).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Baptême",
        start_date: "2026-10-10",
        end_date: "2026-10-11",
        status: "PLANIFIED",
        type: "GENERIC",
        budget: 0,
        description: "",
        budget_items: null,
      }),
    );
    expect(dataLayer.updateFormSubmissionPS).toHaveBeenCalledWith(
      "sub-2",
      expect.objectContaining({
        linkedEntityType: "event",
        linkedEntityId: "e-1",
        status: "PROCESSED",
      }),
    );
  });

  it("group : appelle createGroupPS avec le nom et la description (cascade org_units + groups + accounts + caisses)", async () => {
    const submission = {
      id: "sub-3",
      orgId: "org-1",
      formDefinitionId: "f-1",
      formVersion: 1,
      submittedBy: "u-1",
      submittedAt: "2026-10-01T00:00:00Z",
      data: { nom: "Groupe Jeunes", description: "Catéchèse" },
      status: "SUBMITTED" as const,
      createdAt: "2026-10-01T00:00:00Z",
    } as any;
    const definition = defOf("group", fieldsWith("name"));
    submission.data = { nom: "Groupe Jeunes" };
    definition.fields = fieldsWith("name");

    const result = await dispatchFormSubmission(submission, definition);

    expect(result).toEqual({ linkedEntityType: "group", linkedEntityId: "g-1" });
    expect(dataLayer.createGroupPS).toHaveBeenCalledWith({
      name: "Groupe Jeunes",
      type: "GROUP",
      description: "",
    });
    expect(dataLayer.updateFormSubmissionPS).toHaveBeenCalledWith(
      "sub-3",
      expect.objectContaining({
        linkedEntityType: "group",
        linkedEntityId: "g-1",
        status: "PROCESSED",
      }),
    );
  });

  it("account : insère une ligne accounts via executeWrite (pas de fonction dataLayer dédiée)", async () => {
    const submission = {
      id: "sub-4",
      orgId: "org-1",
      formDefinitionId: "f-1",
      formVersion: 1,
      submittedBy: "u-1",
      submittedAt: "2026-10-01T00:00:00Z",
      data: { nom: "Caisse Culte", devise: "XOF" },
      status: "SUBMITTED" as const,
      createdAt: "2026-10-01T00:00:00Z",
    } as any;
    const definition = defOf("account", [
      { key: "nom", label: "Nom", type: "text", required: false, mapsToEntityField: "name", order: 0 },
      { key: "devise", label: "Devise", type: "select", required: false, mapsToEntityField: "currency", order: 1 },
    ]);

    const result = await dispatchFormSubmission(submission, definition);

    expect(result.linkedEntityType).toBe("account");
    expect(result.linkedEntityId).toBeTruthy();

    const insertCall = (dataLayer.executeWrite as any).mock.calls.find(
      (c: any[]) => /INSERT INTO accounts/i.test(String(c[0])),
    );
    expect(insertCall).toBeTruthy();
    const sql = insertCall[0];
    const params = insertCall[1];
    // Les paramètres positionnels : id, org_id, owner_type, owner_id, name, currency, status,
    // archived_at, archived_by, archive_reason, created_at, updated_at.
    expect(params).toEqual([
      result.linkedEntityId,
      "org-1",
      "ORGANIZATION",
      "org-1",
      "Caisse Culte",
      "XOF",
      "ACTIVE",
      null,
      null,
      null,
      expect.any(String),
      expect.any(String),
    ]);
    // La table est bien `accounts` (aucune autre INSERT).
    const insertCount = (dataLayer.executeWrite as any).mock.calls.filter(
      (c: any[]) => /INSERT INTO/i.test(String(c[0])),
    ).length;
    expect(insertCount).toBe(1);

    expect(dataLayer.updateFormSubmissionPS).toHaveBeenCalledWith(
      "sub-4",
      expect.objectContaining({
        linkedEntityType: "account",
        linkedEntityId: result.linkedEntityId,
        status: "PROCESSED",
      }),
    );
  });

  it("sans targetEntityType : ne dispatche rien (la soumission reste SUBMITTED)", async () => {
    const submission = {
      id: "sub-5",
      orgId: "org-1",
      formDefinitionId: "f-1",
      formVersion: 1,
      submittedBy: "u-1",
      submittedAt: "2026-10-01T00:00:00Z",
      data: {},
      status: "SUBMITTED" as const,
      createdAt: "2026-10-01T00:00:00Z",
    } as any;
    const definition = defOf(null, fieldsWith("name"));

    const result = await dispatchFormSubmission(submission, definition);

    expect(result).toEqual({ linkedEntityType: null, linkedEntityId: null });
    expect(dataLayer.addMemberPS).not.toHaveBeenCalled();
    expect(dataLayer.addEventPS).not.toHaveBeenCalled();
    expect(dataLayer.createGroupPS).not.toHaveBeenCalled();
    expect(dataLayer.executeWrite).not.toHaveBeenCalled();
    expect(dataLayer.updateFormSubmissionPS).not.toHaveBeenCalled();
  });

  it("targetEntityType inconnu : signale une erreur (console.error) et ne dispatche rien", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const submission = {
      id: "sub-6",
      orgId: "org-1",
      formDefinitionId: "f-1",
      formVersion: 1,
      submittedBy: "u-1",
      submittedAt: "2026-10-01T00:00:00Z",
      data: { nom: "X" },
      status: "SUBMITTED" as const,
      createdAt: "2026-10-01T00:00:00Z",
    } as any;
    const definition = defOf("unknown-thing", fieldsWith("name"));

    const result = await dispatchFormSubmission(submission, definition);

    expect(errorSpy).toHaveBeenCalled();
    expect(result).toEqual({ linkedEntityType: null, linkedEntityId: null });
    expect(dataLayer.addMemberPS).not.toHaveBeenCalled();
    expect(dataLayer.addEventPS).not.toHaveBeenCalled();
    expect(dataLayer.createGroupPS).not.toHaveBeenCalled();
    expect(dataLayer.executeWrite).not.toHaveBeenCalled();
    expect(dataLayer.updateFormSubmissionPS).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("échec de dispatch : ne se propage pas (la soumission reste retraceable), résultat null", async () => {
    vi.mocked(dataLayer.addMemberPS).mockRejectedValueOnce(
      new Error("db offline"),
    );
    const submission = {
      id: "sub-7",
      orgId: "org-1",
      formDefinitionId: "f-1",
      formVersion: 1,
      submittedBy: "u-1",
      submittedAt: "2026-10-01T00:00:00Z",
      data: { nom: "Jean" },
      status: "SUBMITTED" as const,
      createdAt: "2026-10-01T00:00:00Z",
    } as any;
    const definition = defOf("member", fieldsWith("lastName"));

    const result = await dispatchFormSubmission(submission, definition);

    expect(result).toEqual({ linkedEntityType: null, linkedEntityId: null });
    expect(dataLayer.addMemberPS).toHaveBeenCalledTimes(1);
    expect(dataLayer.updateFormSubmissionPS).not.toHaveBeenCalled();
  });

  it("aucun champ mappé vers l'entité : ne dispatche rien même si targetEntityType est défini", async () => {
    const submission = {
      id: "sub-8",
      orgId: "org-1",
      formDefinitionId: "f-1",
      formVersion: 1,
      submittedBy: "u-1",
      submittedAt: "2026-10-01T00:00:00Z",
      data: { foo: "bar" },
      status: "SUBMITTED" as const,
      createdAt: "2026-10-01T00:00:00Z",
    } as any;
    // targetEntityType défini mais aucun mapsToEntityField sur les champs.
    const definition = defOf("member", [
      { key: "foo", label: "Foo", type: "text", required: false, order: 0 },
    ]);

    const result = await dispatchFormSubmission(submission, definition);

    expect(result).toEqual({ linkedEntityType: null, linkedEntityId: null });
    expect(dataLayer.addMemberPS).not.toHaveBeenCalled();
    expect(dataLayer.updateFormSubmissionPS).not.toHaveBeenCalled();
  });
});
