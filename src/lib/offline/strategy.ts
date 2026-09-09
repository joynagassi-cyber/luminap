/**
 * Offline Strategy — PowerSync offline-first patterns
 *
 * Defines how reads and writes are handled when offline,
 * and how conflicts are resolved when syncing.
 */

export interface OfflineWrite {
  id: string;
  operation: "insert" | "update" | "delete";
  table: string;
  data: Record<string, any>;
  orgId: string;
  createdAt: string;
  synced: boolean;
}

export interface ConflictResolution {
  strategy: "last-write-wins" | "server-wins" | "manual";
  timestampField: string;
}

export class OfflineService {
  private pendingWrites: OfflineWrite[] = [];
  private conflicts: Map<string, ConflictResolution> = new Map();

  /** Queue a write for later sync */
  queueWrite(
    write: Omit<OfflineWrite, "id" | "createdAt" | "synced">,
  ): OfflineWrite {
    const offlineWrite: OfflineWrite = {
      ...write,
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      synced: false,
    };
    this.pendingWrites.push(offlineWrite);
    return offlineWrite;
  }

  /** Get all pending writes */
  getPendingWrites(): OfflineWrite[] {
    return this.pendingWrites.filter((w) => !w.synced);
  }

  /** Mark a write as synced */
  markSynced(writeId: string): void {
    const write = this.pendingWrites.find((w) => w.id === writeId);
    if (write) {
      write.synced = true;
    }
  }

  /** Set conflict resolution strategy for a table */
  setConflictStrategy(table: string, strategy: ConflictResolution): void {
    this.conflicts.set(table, strategy);
  }

  /** Get conflict resolution strategy for a table */
  getConflictStrategy(table: string): ConflictResolution | null {
    return this.conflicts.get(table) ?? null;
  }

  /** Clear all pending writes (after successful sync) */
  clearSyncedWrites(): void {
    this.pendingWrites = this.pendingWrites.filter((w) => !w.synced);
  }

  /** Count pending writes */
  pendingCount(): number {
    return this.pendingWrites.filter((w) => !w.synced).length;
  }
}

/** Singleton instance */
export const offline = new OfflineService();
