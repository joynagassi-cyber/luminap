/**
 * OneSignal Integration with Authentication
 * Connects Supabase auth to OneSignal push notifications
 */

import { OneSignal, OsNotificationClickEvent, NotificationReceivedEvent } from 'onesignal-capacitor-plugin';
import { PushNotifications } from '@capacitor/push-notifications';
import { authService } from './auth';
import type { Role } from '@/types';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '5482a4eb-a402-4612-ab5e-a72df7961b12';

// OneSignal service class
class OneSignalAuthService {
  private isInitialized = false;
  private userId: string | null = null;

  // Initialize OneSignal
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await OneSignal.initialize(ONESIGNAL_APP_ID);

      // Set up notification listeners
      OneSignal.Notifications.addEventListener('received', this.handleNotificationReceived);
      OneSignal.Notifications.addEventListener('click', this.handleNotificationClick);

      this.isInitialized = true;
      console.log('[OneSignal] Service initialized');
    } catch (error) {
      console.error('[OneSignal] Initialization error:', error);
    }
  }

  // Login user to OneSignal
  async login(role: Role, userId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Login with user ID as external ID
      await OneSignal.login(userId);

      // Set user tags for segmentation
      await OneSignal.User.addTag('role', role);
      await OneSignal.User.addTag('user_id', userId);

      this.userId = userId;
      console.log(`[OneSignal] User logged in: ${userId}, role: ${role}`);
    } catch (error) {
      console.error('[OneSignal] Login error:', error);
    }
  }

  // Logout from OneSignal
  async logout(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await OneSignal.logout();
      this.userId = null;
      console.log('[OneSignal] User logged out');
    } catch (error) {
      console.error('[OneSignal] Logout error:', error);
    }
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    try {
      const permission = await PushNotifications.requestPermission();
      console.log('[OneSignal] Permission status:', permission);
      return permission.granted;
    } catch (error) {
      console.error('[OneSignal] Permission error:', error);
      return false;
    }
  }

  // Get current user ID
  getUserId(): string | null {
    return this.userId;
  }

  // Handle notification received (foreground)
  private handleNotificationReceived = (event: NotificationReceivedEvent): void => {
    console.log('[OneSignal] Notification received:', event.notification);
    // Could show in-app notification or toast
  };

  // Handle notification click
  private handleNotificationClick = (event: OsNotificationClickEvent): void => {
    console.log('[OneSignal] Notification clicked:', event.notification);
    const data = event.notification.additionalData;

    if (data?.['actionId']) {
      // Navigate to specific screen based on action ID
      const actionId = data['actionId'] as string;
      this.navigateToAction(actionId, data);
    }
  };

  // Navigate to action based on notification data
  private navigateToAction(actionId: string, data?: any): void {
    // Use window.location for navigation (will work in both web and Capacitor)
    switch (actionId) {
      case 'transaction_pending':
        window.location.href = '/finance?filter=pending';
        break;
      case 'transaction_approved':
        if (data?.['transaction_id']) {
          window.location.href = '/transaction/' + data['transaction_id'];
        } else {
          window.location.href = '/finance';
        }
        break;
      case 'cotisation_paid':
        window.location.href = '/cotisations';
        break;
      default:
        window.location.href = '/dashboard';
    }
  }

  // Send notification to specific role (this would typically be called from Edge Function)
  async notifyRole(role: Role, title: string, message: string, data?: Record<string, any>): Promise<void> {
    // This would call the backend Edge Function to send push notification
    // For now, we just log it
    console.log(`[OneSignal] Would send notification to role ${role}: ${title}`);
    console.log(`[OneSignal] Data:`, data);
  }
}

// Export singleton instance
export const oneSignalService = new OneSignalAuthService();

// Export hook for React components
export function useOneSignal() {
  return oneSignalService;
}
