/**
 * Account Service — PowerSync
 *
 * All account operations now use PowerSync.
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import type { Transaction } from "@/types";
import { getOrganizationId } from "./orgContext";
import { get, set } from "./cache";

/**
 * Get the derived balance for an account (caisse).
 * Invariant NeverBreak #2: balance is derived, never stored.
 */
export async function getAccountBalance(accountId: string): Promise<number> {
  const orgId = getOrganizationId();
  const cacheKey = `balance:${orgId}:${accountId}`;
  const cached = get<number>(cacheKey);
  if (cached !== undefined) return cached;

  const db = getPowerSyncDatabase();
  const result = await db.execute(
    "SELECT type, amount FROM transactions WHERE source_caisse_id = ? AND org_id = ? AND status = ?",
    [accountId, orgId, "APPROVED"],
  );
  const approved: any[] = result?.result || [];
  const income = approved
    .filter((t: any) => t.type === "INCOME")
    .reduce((s: number, t: any) => s + t.amount, 0);
  const expense = approved
    .filter((t: any) => t.type === "EXPENSE")
    .reduce((s: number, t: any) => s + t.amount, 0);
  const balance = income - expense;
  set(cacheKey, balance, { tier: "cpu" });
  return balance;
}
