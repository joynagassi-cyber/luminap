/** Barrel du service de permissions (seul chemin autorisé pour demander). */
export {
  PermissionService,
  permissionService,
  resolveStatus,
  isSnoozed,
  MAX_DENIALS_BEFORE_BLOCKED,
  SNOOZE_DAYS,
} from "./nativePermissionService";
export type { PermissionName, PermissionStatus } from "./nativePermissionService";
export {
  ensureNotificationChannel,
  DEFAULT_CHANNEL_IMPORTANCE,
} from "./ensureNotificationChannel";

