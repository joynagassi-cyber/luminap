# Notification Capability

**Module:** `src/capabilities/notification/index.ts`
**Tests:** [`notification.test.ts`](../../src/capabilities/__tests__/notification.test.ts)

## Purpose and Responsibility

The Notification capability is a **domain-agnostic facade over the OneSignal push notification service**. It manages the full notification lifecycle: SDK initialization, user authentication (login/logout), permission requests, topic subscriptions, and programmatic notification sending.

No church-specific concepts are present in this capability -- all terms are generic.

## Public API

### Types

```typescript
interface NotificationSendData {
  title: string;
  message: string;
  targetRole?: Role;        // send to all users with this role
  targetUserId?: string;    // send to a single user
  extraData?: Record<string, string>; // additional tags
}
```

### NotificationCapability

```typescript
class NotificationCapability {
  /** Initialize the OneSignal SDK. Safe to call multiple times (idempotent). */
  async initialize(): Promise<void>

  /** Associate the current OneSignal player with a user identity and role tag. */
  async login(userId: string, role: Role): Promise<void>

  /** Disconnect the current OneSignal player from the user identity. */
  async logout(): Promise<void>

  /** Request push notification permission from the OS. Returns true if granted. */
  async requestPermission(): Promise<boolean>

  /**
   * Send a push notification.
   * When targetRole is set, targets all users with that role.
   * When targetUserId is set, targets a single user.
   * When neither is set, broadcasts to all subscribed players.
   * NOTE: Full send requires a backend call; this records intent via tags.
   */
  async sendNotification(data: NotificationSendData): Promise<void>

  /** Subscribe the current player to a topic (segment). */
  async subscribeToTopic(topic: string): Promise<void>

  /** Unsubscribe the current player from a topic. */
  async unsubscribeFromTopic(topic: string): Promise<void>
}
```

## Usage Examples

```typescript
import { notification } from '@/capabilities/notification';

// Initialize (usually done at app startup)
await notification.initialize();

// Authenticate user with OneSignal
await notification.login('user-1', 'TREASURIER');

// Request notification permission
const granted = await notification.requestPermission();

// Send a targeted notification
await notification.sendNotification({
  title: 'Meeting Reminder',
  message: 'Your group meeting starts in 15 minutes',
  targetRole: 'RESPONSABLE_GROUPE',
  extraData: { groupId: 'group-1' },
});

// Subscribe to topic-based notifications
await notification.subscribeToTopic('announcements');
await notification.subscribeToTopic('weekly-update');

// Unsubscribe
await notification.unsubscribeFromTopic('weekly-update');

// Logout
await notification.logout();
```

## Architecture Notes

- **Lazy initialization**: `login()`, `requestPermission()`, `sendNotification()`, `subscribeToTopic()`, and `unsubscribeFromTopic()` all auto-initialize the SDK if not already initialized.
- **Topic storage**: Topics are stored as a JSON array in the OneSignal `topics` tag. `subscribeToTopic` appends; `unsubscribeFromTopic` removes.
- **Send vs. Backend**: `sendNotification()` records tags for client-side tracing. Actual push delivery requires a server-side OneSignal API call.
- **Idempotent initialize**: Calling `initialize()` multiple times is a no-op after the first call.
- **Logout safety**: Calling `logout()` when not initialized is a no-op (does not throw).

## Test Coverage

| Test Suite | Tests |
|---|---|
| `initialize` | 2 -- calls initOneSignal, no-op on second call |
| `login` | 2 -- sets tags, auto-initializes |
| `logout` | 2 -- calls logout after init, no-op if not initialized |
| `requestPermission` | 3 -- granted, denied, rejects returns false |
| `sendNotification` | 4 -- targetRole tags, targetUserId tags, extraData prefixed tags, auto-initializes |
| `subscribeToTopic` | 3 -- appends new topic, deduplicates, creates array when none exists |
| `unsubscribeFromTopic` | 2 -- removes topic, leaves others intact |

Total: **18 tests**

### Key Test Scenarios

- **Auto-initialization**: All methods that require the SDK initialize it lazily
- **Topic deduplication**: Subscribing to an already-subscribed topic does not duplicate it
- **Tag recording**: `sendNotification` writes `last_notification_title`, `last_notification_message`, `target_role`, `target_user_id`, and `extra_*` tags for tracing
- **Graceful no-ops**: `logout()` and `initialize()` are safe to call at any time
