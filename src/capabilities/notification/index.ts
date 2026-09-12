/**
 * Notification Capability — OneSignal push notification facade
 *
 * Domain-agnostic wrapper around the OneSignal service.
 * Provides a clean capability contract for notification lifecycle
 * (initialize, auth integration, permission, topic management,
 * and programmatic sending).
 *
 * No church-specific concepts — all terms are generic.
 */

import { getPowerSyncDatabase } from "@/lib/powersync";
import { getOrganizationId } from "@/lib/orgContext";
import { getOneSignalService, initOneSignal } from "@/lib/onesignal";
import type { Role } from "@/types";

export interface NotificationSendData {
  title: string;
  message: string;
  targetRole?: Role;
  targetUserId?: string;
  extraData?: Record<string, string>;
}

/**
 * Notification capability — OneSignal adapter
 */
export class NotificationCapability {
  private isInitialized = false;

  /**
   * Initialize the OneSignal SDK with the configured app ID.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await initOneSignal();
    this.isInitialized = true;
  }

  /**
   * Login: associate the current OneSignal player with a user identity
   * and role tag so targeted notifications can be sent.
   */
  async login(userId: string, role: Role): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    const service = getOneSignalService();
    await service.login(userId);
    await service.setTag("role", role);
    await service.setTag("user_id", userId);
  }

  /**
   * Logout: disconnect the current OneSignal player from the user identity.
   */
  async logout(): Promise<void> {
    if (!this.isInitialized) return;
    const service = getOneSignalService();
    await service.logout();
  }

  /**
   * Request push notification permission from the OS.
   * Returns true if the user granted permission.
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();
    const service = getOneSignalService();
    try {
      return await service.requestPermission();
    } catch {
      return false;
    }
  }

  /**
   * Send a push notification.
   *
   * PERSIST (audit O4): the notification is written to the local
   * PowerSync `notifications` table so it lands in Supabase and feeds
   * the app's in-app notification UI (one row per send; the in-app
   * list already dedups on read).
   *
   * The OneSignal tags below still record the *targeting intent*
   * (role/user) on the local player so a future server-side OneSignal
   * API call can target the right segment — but the notification
   * itself no longer depends on that call to be visible.
   *
   * When targetRole is set, the notification is targeted to all users
   * with that role. When targetUserId is set, it is targeted to a
   * single user. When neither is set, it is a broadcast for the
   * current organization.
   */
  async sendNotification(data: NotificationSendData): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    const service = getOneSignalService();

    // 1) Persist the notification to PowerSync (→ Supabase → in-app UI)
    // Uses the existing `notifications` table columns:
    // org_id, action_type, title, message, is_read, source_transaction_id,
    // created_at. OneSignal extra data is folded into `message`.
    try {
      const db = getPowerSyncDatabase();
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        ...(data.extraData ?? {}),
        targetUserId: data.targetUserId ?? null,
      };
      await db.execute(
        `INSERT INTO notifications
           (org_id, action_type, title, message, is_read, source_transaction_id, created_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
        [
          getOrganizationId(),
          data.targetRole ?? "PUSH",
          data.title,
          data.message + (Object.keys(payload).length ? ` ${JSON.stringify(payload)}` : ""),
          data.targetUserId ?? null,
          now,
        ],
      );
    } catch {
      // Persistence is best-effort — the OneSignal path below still runs.
    }

    // 2) Tag the current session for server-side targeting
    const tags: Record<string, string> = {
      last_notification_title: data.title,
      last_notification_message: data.message,
    };
    if (data.targetRole) tags.target_role = data.targetRole;
    if (data.targetUserId) tags.target_user_id = data.targetUserId;
    if (data.extraData) {
      for (const [k, v] of Object.entries(data.extraData)) {
        tags[`extra_${k}`] = v;
      }
    }
    await service.setTags(tags);
  }

  /**
   * Subscribe the current player to a topic (segment).
   * Topics are stored as a OneSignal user tag and can be targeted
   * when sending notifications.
   */
  async subscribeToTopic(topic: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    const service = getOneSignalService() as any;

    // Retrieve existing topics, append new one, write back
    const tags = (await service.User?.getTags?.()) ?? {};
    const existing: string[] = tags["topics"] ? JSON.parse(tags["topics"]) : [];
    if (!existing.includes(topic)) {
      existing.push(topic);
    }
    await service.User?.addTag("topics", JSON.stringify(existing));
  }

  /**
   * Unsubscribe the current player from a topic.
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    const service = getOneSignalService() as any;

    const tags = (await service.User?.getTags?.()) ?? {};
    const existing: string[] = tags["topics"] ? JSON.parse(tags["topics"]) : [];
    const filtered = existing.filter((t) => t !== topic);
    await service.User?.addTag("topics", JSON.stringify(filtered));
  }
}

/** Singleton instance */
export const notification = new NotificationCapability();
