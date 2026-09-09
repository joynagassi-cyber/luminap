/**
 * Notification Service
 *
 * Handles notification creation and read management.
 */

import { generateId } from "./utils";
import type { NotificationItem } from "@/types";

export interface NotificationState {
  notifications: NotificationItem[];
}

export function createNotification(
  notif: Omit<NotificationItem, "id" | "createdAt">,
  state: NotificationState,
): NotificationItem {
  const id = generateId();
  const now = new Date().toISOString();
  return { ...notif, id, createdAt: now };
}

export function markNotificationRead(
  id: string,
  state: NotificationState,
): NotificationItem[] {
  return state.notifications.map((n) =>
    n.id === id ? { ...n, isRead: true } : n,
  );
}

export function markAllNotificationsRead(
  state: NotificationState,
): NotificationItem[] {
  return state.notifications.map((n) => ({ ...n, isRead: true }));
}
