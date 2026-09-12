/**
 * Tests for src/lib/event-service.ts, src/lib/group-service.ts,
 * src/lib/member-service.ts, and src/lib/group-lifecycle.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── In-memory PowerSync mock ──────────────────────────────────────────────
const psState = vi.hoisted(() => ({ rows: [] as any[] }));

vi.mock("@/lib/powersync", () => ({
  getPowerSyncDatabase: vi.fn(() => ({
    execute: vi.fn(async (sql: string, params: any[]) => {
      psState.rows.push({ sql, params });
      return { array: [] };
    }),
    getOptional: vi.fn(async () => null),
  })),
  getPowerSyncConnector: vi.fn(),
  initPowerSync: vi.fn(async () => {}),
  disconnectPowerSync: vi.fn(async () => {}),
}));

// ─── Data layer mock ────────────────────────────────────────────────────────
const dataLayerMock = vi.hoisted(() => ({
  addEventPS: vi.fn(async () => {}),
  updateEventPS: vi.fn(async () => {}),
  deleteEventPS: vi.fn(async () => {}),
  addGroupPS: vi.fn(async () => {}),
  updateGroupPS: vi.fn(async () => {}),
  addMemberPS: vi.fn(async () => {}),
  updateMemberPS: vi.fn(async () => {}),
  canAccessOrganization: vi.fn(async () => true),
  useCurrentUser: vi.fn(() => ({ data: { id: "user-1", role: "ADMIN" } })),
  useOrganizations: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/lib/dataLayer", () => dataLayerMock);

// ─── Org context mock ───────────────────────────────────────────────────────
vi.mock("@/lib/orgContext", () => ({
  getOrganizationId: vi.fn(() => "test-org"),
  setOrganizationId: vi.fn(),
}));

import {
  buildAddEvent,
  persistAddEvent,
  applyUpdateEvent,
  applyDeleteEvent,
  applyUpdateEventStatus,
  addBudgetItem,
  removeBudgetItem,
  updateShoppingItemStatus,
} from "@/lib/event-service";
import { createGroup } from "@/lib/group-service";
import {
  buildCreateMember,
  persistCreateMember,
  applyUpdateMember,
  applyDeleteMember,
  persistUpdateMember,
} from "@/lib/member-service";
import {
  applyUpdateGroup,
  applyDeleteGroup,
  applyArchiveGroup,
  applyRestoreGroup,
  buildCreateEventBudget,
  buildAddBudgetLine,
  applyRemoveBudgetLine,
} from "@/lib/group-lifecycle";
import type {
  Event,
  BudgetItem,
  ShoppingItem,
  Member,
  OrgUnit,
  Caisse,
  Group,
  Account,
  BudgetLine,
} from "@/types";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "ev-1",
    orgId: "test-org",
    name: "Gala",
    description: "Annual gala",
    startDate: "2026-10-01",
    endDate: "2026-10-02",
    status: "PLANIFIED",
    type: "EVENT",
    budget: 5_000_000,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    budgetItems: [],
    shoppingItems: [],
    ...overrides,
  };
}

function makeBudgetItem(overrides: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: "bi-1",
    label: "Decor",
    allocated: 1_000_000,
    spent: 0,
    fundedBy: "main",
    ...overrides,
  };
}

function makeShoppingItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: "si-1",
    label: "Flowers",
    quantity: 5,
    unitPrice: 200,
    total: 1000,
    status: "PENDING",
    ...overrides,
  };
}

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "m-1",
    orgId: "test-org",
    firstName: "Aya",
    lastName: "Traoré",
    phone: "+2250102030405",
    email: "aya@example.com",
    status: "ACTIVE",
    joinedAt: "2026-01-01",
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    totalDons: 0,
    montantEnAvance: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeOrgUnit(overrides: Partial<OrgUnit> = {}): OrgUnit {
  return {
    id: "ou-1",
    name: "Groupe École",
    type: "groupe",
    description: "desc",
    orgId: "test-org",
    isActive: true,
    ...overrides,
  };
}

function makeCaisse(overrides: Partial<Caisse> = {}): Caisse {
  return {
    id: "ca-1",
    name: "Caisse École",
    description: "desc",
    type: "GROUP",
    color: "#3B82F6",
    orgId: "test-org",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    status: "ACTIVE",
    ...overrides,
  };
}

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "g-1",
    orgId: "test-org",
    name: "Groupe École",
    parentGroupId: null,
    responsableMemberId: null,
    status: "ACTIVE",
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    orgId: "test-org",
    ownerType: "GROUP",
    ownerId: "g-1",
    name: "Groupe École",
    currency: "XOF",
    status: "ACTIVE",
    archivedAt: null,
    archivedBy: null,
    archiveReason: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

// All four group-linked entities share the same id for cross-coherence
function makeGroupState(): {
  orgUnits: OrgUnit[];
  caisses: Caisse[];
  groups: Group[];
  accounts: Account[];
} {
  return {
    orgUnits: [
      makeOrgUnit({ id: "g-1" }),
      makeOrgUnit({ id: "g-2", name: "Autre" }),
    ],
    caisses: [
      makeCaisse({ id: "g-1" }),
      makeCaisse({ id: "g-2", name: "Autre" }),
    ],
    groups: [makeGroup(), makeGroup({ id: "g-2", name: "Autre" })],
    accounts: [
      makeAccount({ id: "g-1" }),
      makeAccount({ id: "g-2", name: "Autre" }),
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  psState.rows = [];
});

// ─── createGroup ────────────────────────────────────────────────────────────

describe("createGroup", () => {
  it("creates 4 entities sharing the same id", () => {
    const { orgUnit, caisse, group, account } = createGroup({
      name: "Groupe École",
      type: "groupe",
      description: "desc",
    });
    expect(orgUnit.id).toBe(caisse.id);
    expect(caisse.id).toBe(group.id);
    expect(group.id).toBe(account.id);
    expect(orgUnit.name).toBe("Groupe École");
    expect(account.ownerType).toBe("GROUP");
    expect(account.currency).toBe("XOF");
    expect(caisse.type).toBe("GROUP");
    expect(group.status).toBe("ACTIVE");
    expect(caisse.status).toBe("ACTIVE");
  });

  it("defaults color to palette[0] when existingGroupCount is undefined", () => {
    const { caisse } = createGroup({
      name: "A",
      type: "g",
      description: "",
    });
    expect(caisse.color).toBe("#3B82F6"); // palette[0]
  });

  it("picks palette color by existingGroupCount % 10", () => {
    const { caisse: c1 } = createGroup({
      name: "A",
      type: "g",
      description: "",
      existingGroupCount: 1,
    });
    expect(c1.color).toBe("#8B5CF6"); // palette[1]

    const { caisse: c10 } = createGroup({
      name: "A",
      type: "g",
      description: "",
      existingGroupCount: 10,
    });
    // 10 % 10 = 0 → wraps to palette[0]
    expect(c10.color).toBe("#3B82F6");

    const { caisse: c9 } = createGroup({
      name: "A",
      type: "g",
      description: "",
      existingGroupCount: 9,
    });
    expect(c9.color).toBe("#06B6D4"); // palette[9]
  });

  it("falls back to defaults for empty type/description", () => {
    const { orgUnit } = createGroup({
      name: "A",
      type: "",
      description: "",
    });
    expect(orgUnit.type).toBe("groupe");
    expect(orgUnit.description).toBe("");
  });
});

// ─── group-lifecycle ────────────────────────────────────────────────────────

describe("applyUpdateGroup", () => {
  it("updates all 4 entities coherently for the target id only", () => {
    const state = makeGroupState();
    const result = applyUpdateGroup(state, "g-1", {
      name: "Renamed",
      description: "new desc",
    });

    const target = result.orgUnits.find((o) => o.id === "g-1")!;
    expect(target.name).toBe("Renamed");
    expect(target.description).toBe("new desc");
    expect(typeof target.updatedAt).toBe("string");

    const other = result.orgUnits.find((o) => o.id === "g-2")!;
    expect(other.name).toBe("Autre"); // untouched

    // Caisse keeps its own fields but picks up name/description + updatedAt
    const caisse = result.caisses.find((c) => c.id === "g-1")!;
    expect(caisse.name).toBe("Renamed");
    expect(caisse.description).toBe("new desc");
    const caisseOther = result.caisses.find((c) => c.id === "g-2")!;
    expect(caisseOther.name).toBe("Autre");

    // Accounts pick up name only
    const acc = result.accounts.find((a) => a.id === "g-1")!;
    expect(acc.name).toBe("Renamed");
    const accOther = result.accounts.find((a) => a.id === "g-2")!;
    expect(accOther.name).toBe("Autre");

    // Group updated
    const g = result.groups.find((gg) => gg.id === "g-1")!;
    expect(g.name).toBe("Renamed");
  });

  it("keeps existing values when update data fields are undefined", () => {
    const state = makeGroupState();
    const result = applyUpdateGroup(state, "g-1", {});
    const caisse = result.caisses.find((c) => c.id === "g-1")!;
    expect(caisse.name).toBe("Caisse École");
    expect(caisse.description).toBe("desc");
  });
});

describe("applyDeleteGroup", () => {
  it("removes the matching entity from all 4 collections", () => {
    const state = makeGroupState();
    const result = applyDeleteGroup(state, "g-1");
    expect(result.orgUnits.find((o) => o.id === "g-1")).toBeUndefined();
    expect(result.caisses.find((c) => c.id === "g-1")).toBeUndefined();
    expect(result.groups.find((g) => g.id === "g-1")).toBeUndefined();
    expect(result.accounts.find((a) => a.id === "g-1")).toBeUndefined();
    // siblings remain
    expect(result.orgUnits).toHaveLength(1);
    expect(result.caisses).toHaveLength(1);
    expect(result.groups).toHaveLength(1);
    expect(result.accounts).toHaveLength(1);
  });
});

describe("applyArchiveGroup", () => {
  it("sets status ARCHIVED + archivedAt/By/Reason on group, account, caisse", () => {
    const state = makeGroupState();
    const result = applyArchiveGroup(
      state,
      "g-1",
      "reorganisation",
      "user-1",
    );

    const g = result.groups.find((gg) => gg.id === "g-1")!;
    expect(g.status).toBe("ARCHIVED");
    expect(g.archivedAt).not.toBeNull();
    expect(g.archivedBy).toBe("user-1");
    expect(g.archiveReason).toBe("reorganisation");

    const a = result.accounts.find((aa) => aa.id === "g-1")!;
    expect(a.status).toBe("ARCHIVED");
    expect(a.archivedBy).toBe("user-1");
    expect(a.archiveReason).toBe("reorganisation");

    const c = result.caisses.find((cc) => cc.id === "g-1")!;
    expect(c.status).toBe("ARCHIVED");
    expect(c.archivedBy).toBe("user-1");

    // untouched sibling stays ACTIVE
    const g2 = result.groups.find((gg) => gg.id === "g-2")!;
    expect(g2.status).toBe("ACTIVE");
    expect(g2.archivedAt).toBeNull();
  });
});

describe("applyRestoreGroup", () => {
  it("reverts to ACTIVE and nulls archive fields", () => {
    const state = makeGroupState();
    const archived = applyArchiveGroup(state, "g-1", "temp", "user-1");
    const restored = applyRestoreGroup(archived, "g-1", "restored", "user-1");

    const g = restored.groups.find((gg) => gg.id === "g-1")!;
    expect(g.status).toBe("ACTIVE");
    expect(g.archivedAt).toBeNull();
    expect(g.archivedBy).toBeNull();
    expect(g.archiveReason).toBeNull();

    const a = restored.accounts.find((aa) => aa.id === "g-1")!;
    expect(a.status).toBe("ACTIVE");
    expect(a.archivedAt).toBeNull();

    const c = restored.caisses.find((cc) => cc.id === "g-1")!;
    expect(c.status).toBe("ACTIVE");
    expect(c.archivedAt).toBeNull();
  });
});

describe("event budget helpers", () => {
  it("buildCreateEventBudget", () => {
    const b = buildCreateEventBudget("ev-1", "XOF");
    expect(b.eventId).toBe("ev-1");
    expect(b.currency).toBe("XOF");
    expect(b.revisedAt).toBeNull();
    expect(b.revisedBy).toBeNull();
    expect(b.id).toBeTruthy();
    expect(b.createdAt).toBeTruthy();
  });

  it("buildAddBudgetLine stamps id and createdAt", () => {
    const line = buildAddBudgetLine({
      eventBudgetId: "eb-1",
      categoryId: "cat-1",
      plannedAmountCents: 100,
      actualAmountCents: 0,
    });
    expect(line.id).toBeTruthy();
    expect(line.createdAt).toBeTruthy();
    expect(line.eventBudgetId).toBe("eb-1");
  });

  it("applyRemoveBudgetLine only removes matching eventBudgetId+lineId", () => {
    const lines: BudgetLine[] = [
      {
        id: "bl-1",
        eventBudgetId: "eb-1",
        categoryId: "c",
        plannedAmountCents: 1,
        actualAmountCents: 0,
        createdAt: "x",
      },
      {
        id: "bl-2",
        eventBudgetId: "eb-1",
        categoryId: "c",
        plannedAmountCents: 2,
        actualAmountCents: 0,
        createdAt: "x",
      },
      {
        id: "bl-3",
        eventBudgetId: "eb-2",
        categoryId: "c",
        plannedAmountCents: 3,
        actualAmountCents: 0,
        createdAt: "x",
      },
    ];
    const result = applyRemoveBudgetLine(lines, "eb-1", "bl-1");
    expect(result).toHaveLength(2);
    expect(result.map((l) => l.id)).toEqual(["bl-2", "bl-3"]);
  });
});

// ─── member-service ─────────────────────────────────────────────────────────

describe("buildCreateMember", () => {
  it("stamps a generated id and identical createdAt/updatedAt", () => {
    const m = buildCreateMember({
      orgId: "test-org",
      firstName: "A",
      lastName: "B",
      phone: "p",
      email: "e",
      status: "ACTIVE",
      joinedAt: "2026-01-01",
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      totalDons: 0,
      montantEnAvance: 0,
    });
    expect(m.id).toBeTruthy();
    expect(m.createdAt).toBe(m.updatedAt);
    expect(m.firstName).toBe("A");
  });
});

describe("applyUpdateMember", () => {
  it("merges data and bumps updatedAt for target only", () => {
    const members = [makeMember(), makeMember({ id: "m-2" })];
    const result = applyUpdateMember(members, "m-1", { status: "ARCHIVED" });
    const target = result.find((m) => m.id === "m-1")!;
    expect(target.status).toBe("ARCHIVED");
    expect(target.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");
    const other = result.find((m) => m.id === "m-2")!;
    expect(other.updatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(other.status).toBe("ACTIVE");
  });
});

describe("applyDeleteMember", () => {
  it("filters out the target id", () => {
    const members = [makeMember(), makeMember({ id: "m-2" })];
    const result = applyDeleteMember(members, "m-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("m-2");
  });
});

describe("persistCreateMember / persistUpdateMember", () => {
  it("calls dataLayer member functions with snake_case fields", async () => {
    const member = makeMember();
    await persistCreateMember(member);
    expect(dataLayerMock.addMemberPS).toHaveBeenCalledWith({
      org_id: "test-org",
      first_name: "Aya",
      last_name: "Traoré",
      phone: "+2250102030405",
      email: "aya@example.com",
      status: "ACTIVE",
      joined_at: "2026-01-01",
      archived_at: null,
      archived_by: null,
      archive_reason: null,
    });

    await persistUpdateMember("m-1", { status: "ARCHIVED" });
    expect(dataLayerMock.updateMemberPS).toHaveBeenCalledWith("m-1", {
      status: "ARCHIVED",
    });
  });

  it("swallows dataLayer failures (offline queue retries)", async () => {
    vi.mocked(dataLayerMock.addMemberPS).mockRejectedValueOnce(
      new Error("offline"),
    );
    vi.mocked(dataLayerMock.updateMemberPS).mockRejectedValueOnce(
      new Error("offline"),
    );
    await expect(persistCreateMember(makeMember())).resolves.toBeUndefined();
    await expect(
      persistUpdateMember("m-1", { status: "ARCHIVED" }),
    ).resolves.toBeUndefined();
  });
});

// ─── event-service ──────────────────────────────────────────────────────────

describe("buildAddEvent", () => {
  it("generates id + timestamps and defaults budgetItems/shoppingItems to []", () => {
    const e = buildAddEvent(
      {
        orgId: "test-org",
        name: "Gala",
        description: "d",
        startDate: "2026-10-01",
        endDate: "2026-10-02",
        status: "PLANIFIED",
        type: "EVENT",
        budget: 100,
        budgetItems: undefined as unknown as Event["budgetItems"],
        shoppingItems: undefined as unknown as Event["shoppingItems"],
      },
    );
    expect(e.id).toBeTruthy();
    expect(e.createdAt).toBe(e.updatedAt);
    expect(e.budgetItems).toEqual([]);
    expect(e.shoppingItems).toEqual([]);
  });

  it("keeps provided arrays untouched", () => {
    const bi = makeBudgetItem();
    const si = makeShoppingItem();
    const e = buildAddEvent(
      {
        orgId: "o",
        name: "n",
        description: "",
        startDate: "s",
        endDate: "e",
        status: "PLANIFIED",
        type: "EVENT",
        budget: 0,
        budgetItems: [bi],
        shoppingItems: [si],
      },
    );
    expect(e.budgetItems).toEqual([bi]);
    expect(e.shoppingItems).toEqual([si]);
  });
});

describe("persistAddEvent", () => {
  it("writes snake_case row via addEventPS with JSON-stringified budget_items", async () => {
    const e = makeEvent();
    await persistAddEvent(e);
    expect(dataLayerMock.addEventPS).toHaveBeenCalledWith({
      org_id: "test-org",
      name: "Gala",
      description: "Annual gala",
      start_date: "2026-10-01",
      end_date: "2026-10-02",
      status: "PLANIFIED",
      type: "EVENT",
      budget: 5_000_000,
      budget_items: "[]",
    });
  });

  it("does not throw when addEventPS fails", async () => {
    vi.mocked(dataLayerMock.addEventPS).mockRejectedValueOnce(
      new Error("offline"),
    );
    await expect(persistAddEvent(makeEvent())).resolves.toBeUndefined();
  });
});

describe("applyUpdateEvent / applyUpdateEventStatus / applyDeleteEvent", () => {
  it("applyUpdateEvent merges + bumps updatedAt", () => {
    const events = [makeEvent(), makeEvent({ id: "ev-2" })];
    const result = applyUpdateEvent(events, "ev-1", { name: "New" });
    expect(result[0].name).toBe("New");
    expect(result[1].name).toBe("Gala");
    expect(result[0].updatedAt).not.toBe("2026-09-01T00:00:00.000Z");
  });

  it("applyUpdateEventStatus changes only status", () => {
    const events = [makeEvent()];
    const result = applyUpdateEventStatus(events, "ev-1", "ONGOING");
    expect(result[0].status).toBe("ONGOING");
    expect(result[0].name).toBe("Gala");
  });

  it("applyDeleteEvent removes target", () => {
    const events = [makeEvent(), makeEvent({ id: "ev-2" })];
    const result = applyDeleteEvent(events, "ev-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ev-2");
  });
});

describe("addBudgetItem / removeBudgetItem", () => {
  it("addBudgetItem recalculates total as sum of allocated", () => {
    const items = [makeBudgetItem({ allocated: 100_000 })];
    const { newItems, total } = addBudgetItem(items, "ev-1", {
      eventId: "ev-1",
      label: "New",
      allocated: 400_000,
      spent: 0,
    });
    expect(newItems).toHaveLength(2);
    expect(total).toBe(500_000);
    expect(newItems[1].id).toBeTruthy();
    // original array is not mutated
    expect(items).toHaveLength(1);
  });

  it("removeBudgetItem recalculates total from remaining items", () => {
    const items = [
      makeBudgetItem({ id: "a", allocated: 100 }),
      makeBudgetItem({ id: "b", allocated: 200 }),
    ];
    const { newItems, total } = removeBudgetItem(items, "a");
    expect(newItems).toHaveLength(1);
    expect(total).toBe(200);
  });

  it("total is 0 when all items removed", () => {
    const { total } = removeBudgetItem([makeBudgetItem()], "bi-1");
    expect(total).toBe(0);
  });
});

describe("updateShoppingItemStatus", () => {
  it("updates only the target item", () => {
    const items = [
      makeShoppingItem(),
      makeShoppingItem({ id: "si-2" }),
    ];
    const result = updateShoppingItemStatus(items, "si-1", "ORDERED");
    expect(result[0].status).toBe("ORDERED");
    expect(result[1].status).toBe("PENDING");
  });
});
