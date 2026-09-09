/**
 * Conflict Resolution — handle concurrent edits
 *
 * Strategies:
 * - last-write-wins: latest timestamp wins
 * - server-wins: remote state always wins
 * - manual: flag for user resolution
 */

import type { ConflictResolution } from "./strategy";

export class ConflictResolver {
  /** Resolve conflict using last-write-wins strategy */
  resolveLastWriteWins(
    local: any,
    remote: any,
    timestampField = "updated_at",
  ): any {
    const localTime = new Date(local[timestampField]).getTime();
    const remoteTime = new Date(remote[timestampField]).getTime();
    return remoteTime >= localTime ? remote : local;
  }

  /** Resolve conflict using server-wins strategy */
  resolveServerWins(local: any, remote: any): any {
    return remote;
  }

  /** Detect if there's a conflict (different content, same ID) */
  hasConflict(local: any, remote: any): boolean {
    if (!local || !remote) return false;
    const localKeys = Object.keys(local).sort().join(",");
    const remoteKeys = Object.keys(remote).sort().join(",");
    return (
      localKeys !== remoteKeys ||
      JSON.stringify(local) !== JSON.stringify(remote)
    );
  }

  /** Get resolution strategy for a table */
  getStrategy(table: string): ConflictResolution["strategy"] {
    // Default to last-write-wins for most tables
    const tableStrategies: Record<string, ConflictResolution["strategy"]> = {
      transactions: "server-wins", // Financial data: server wins
      members: "last-write-wins",
      groups: "last-write-wins",
      events: "last-write-wins",
      cotisations: "server-wins", // Financial data: server wins
    };
    return tableStrategies[table] ?? "last-write-wins";
  }
}

/** Singleton instance */
export const conflictResolver = new ConflictResolver();
