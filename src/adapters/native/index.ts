/** Barrel export for all native adapters. */
export { NetworkAdapter } from "./NetworkAdapter";
export type { ConnectionStatus, ConnectionType } from "./NetworkAdapter";

export { StorageAdapter } from "./StorageAdapter";

export { NotificationAdapter } from "./NotificationAdapter";
export type {
  PermissionStatus,
  PushNotificationSchema,
  ActionPerformed,
  Channel,
  Token,
  PushRegistrationResult,
  ReceivedNotification,
} from "./NotificationAdapter";
