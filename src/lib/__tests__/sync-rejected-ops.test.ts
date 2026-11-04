// @vitest-environment jsdom
/**
 * B-02 — journal local des opérations d'upload rejetées définitivement.
 *
 * Le connecteur PowerSync jette les ops « fatales » (RLS 42501, intégrité
 * 23xxx…) pour ne pas boucher la file ; avant ce journal, le rejet ne
 * laissait qu'un log console DEV → perte de données silencieuse. Ces
 * tests verrouillent : persistance, plafond, événement de notification.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}
if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
  });
}

import {
  recordRejectedSyncOp,
  getRejectedSyncOps,
  clearRejectedSyncOps,
  SYNC_REJECTED_EVENT,
} from "@/lib/powersync/syncRejectedOps";

beforeEach(() => {
  localStorage.clear();
});

describe("syncRejectedOps — journal des rejets (B-02)", () => {
  it("persiste un rejet avec horodatage", () => {
    recordRejectedSyncOp({
      table: "transactions",
      op: "PUT",
      id: "tx-1",
      code: "42501",
      message: "row-level security",
    });
    const ops = getRejectedSyncOps();
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      table: "transactions",
      op: "PUT",
      id: "tx-1",
      code: "42501",
    });
    expect(typeof ops[0].at).toBe("string");
    expect(Number.isNaN(Date.parse(ops[0].at))).toBe(false);
  });

  it("plafonne à 50 entrées (les plus récentes)", () => {
    for (let i = 0; i < 60; i++) {
      recordRejectedSyncOp({
        table: "t",
        op: "PUT",
        id: `id-${i}`,
        code: "23505",
        message: "dup",
      });
    }
    const ops = getRejectedSyncOps();
    expect(ops).toHaveLength(50);
    expect(ops[0].id).toBe("id-10");
    expect(ops[49].id).toBe("id-59");
  });

  it("émet l'événement fenêtre à chaque rejet (déclenche la notification UI)", () => {
    const listener = vi.fn();
    window.addEventListener(SYNC_REJECTED_EVENT, listener);
    recordRejectedSyncOp({
      table: "members",
      op: "PATCH",
      id: "m-1",
      code: "23502",
      message: "not null",
    });
    window.removeEventListener(SYNC_REJECTED_EVENT, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("clear vide le journal", () => {
    recordRejectedSyncOp({
      table: "t",
      op: "PUT",
      id: "x",
      code: "42501",
      message: "rls",
    });
    clearRejectedSyncOps();
    expect(getRejectedSyncOps()).toEqual([]);
  });
});
