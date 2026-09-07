import { OneSignal, HmsEvent, OsNotificationClickEvent, NotificationReceivedEvent } from 'onesignal-capacitor-plugin';
import { PushNotifications, PermissionStatus } from '@capacitor/push-notifications';
import { useCallback, useEffect, useState } from 'react';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '5482a4eb-a402-4612-ab5e-a72df7961b12';

// Hook to use OneSignal in React components
export function useOneSignal() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    initOneSignal();
    return () => {
      // Cleanup listeners on unmount
      OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
      OneSignal.Notifications.removeEventListener('subscriptionChange', handleSubscriptionChange);
      OneSignal.Notifications.removeEventListener('received', handleNotificationReceived);
    };
  }, []);

  const initOneSignal = useCallback(async () => {
    try {
      // Initialize OneSignal
      await OneSignal.initialize(ONESIGNAL_APP_ID);

      // Request permission
      const permissionStatus = await PushNotifications.requestPermission();
      console.log('[OneSignal] Permission status:', permissionStatus);

      if (permissionStatus.granted) {
        await OneSignal.Notifications.requestPermission(true);
      }

      // Set up listeners
      OneSignal.Notifications.addEventListener('received', handleNotificationReceived);
      OneSignal.Notifications.addEventListener('click', handleNotificationClick);
      OneSignal.Notifications.addEventListener('subscriptionChange', handleSubscriptionChange);

      // Get current user ID
      const playerId = await OneSignal.Users.getCurrentPushSubscriptionId();
      if (playerId) {
        setUserId(playerId);
        setIsSubscribed(true);
      }

      console.log('[OneSignal] Initialized successfully');
    } catch (error) {
      console.error('[OneSignal] Initialization error:', error);
    }
  }, []);

  const handleNotificationReceived = (event: NotificationReceivedEvent) => {
    console.log('[OneSignal] Notification received:', event.notification);
    // Handle notification received while app is in foreground
  };

  const handleNotificationClick = (event: OsNotificationClickEvent) => {
    console.log('[OneSignal] Notification clicked:', event.notification);
    // Handle notification click - navigate to specific screen
    const data = event.notification.additionalData;
    if (data?.['deeplink']) {
      // Navigate based on deeplink
      window.location.href = data['deeplink'] as string;
    }
  };

  const handleSubscriptionChange = (event: any) => {
    const subscription = event.subscription;
    if (subscription && subscription.id && !subscription.id.startsWith('local-')) {
      setUserId(subscription.id);
      setIsSubscribed(true);
      console.log('[OneSignal] User subscribed:', subscription.id);
    }
  };

  const setTag = useCallback(async (key: string, value: string) => {
    try {
      await OneSignal.User.addTag(key, value);
      console.log(`[OneSignal] Tag set: ${key} = ${value}`);
    } catch (error) {
      console.error('[OneSignal] Error setting tag:', error);
    }
  }, []);

  const setEmail = useCallback(async (email: string) => {
    try {
      await OneSignal.User.addEmail(email);
      console.log('[OneSignal] Email set:', email);
    } catch (error) {
      console.error('[OneSignal] Error setting email:', error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await OneSignal.logout();
      setUserId(null);
      setIsSubscribed(false);
      console.log('[OneSignal] User logged out');
    } catch (error) {
      console.error('[OneSignal] Error logging out:', error);
    }
  }, []);

  return {
    userId,
    isSubscribed,
    setTag,
    setEmail,
    logout,
    refresh: initOneSignal,
  };
}

// Service initialization function (for non-React contexts)
export async function initOneSignalService() {
  try {
    await OneSignal.initialize(ONESIGNAL_APP_ID);

    // Request permission
    const permissionStatus = await PushNotifications.requestPermission();
    console.log('[OneSignal] Permission status:', permissionStatus);

    if (permissionStatus.granted) {
      await OneSignal.Notifications.requestPermission(true);
    }

    // Set up listeners
    OneSignal.Notifications.addEventListener('received', handleNotificationReceived);
    OneSignal.Notifications.addEventListener('click', handleNotificationClick);
    OneSignal.Notifications.addEventListener('subscriptionChange', handleSubscriptionChange);

    // Get current user ID
    const playerId = await OneSignal.Users.getCurrentPushSubscriptionId();
    if (playerId) {
      console.log('[OneSignal] User ID:', playerId);
    }

    console.log('[OneSignal] Service initialized successfully');
  } catch (error) {
    console.error('[OneSignal] Service initialization error:', error);
  }
}

function handleNotificationReceived(event: NotificationReceivedEvent) {
  console.log('[OneSignal] Notification received:', event.notification);
}

function handleNotificationClick(event: OsNotificationClickEvent) {
  console.log('[OneSignal] Notification clicked:', event.notification);
  const data = event.notification.additionalData;
  if (data?.['deeplink']) {
    window.location.href = data['deeplink'] as string;
  }
}

function handleSubscriptionChange(event: any) {
  const subscription = event.subscription;
  if (subscription && subscription.id && !subscription.id.startsWith('local-')) {
    console.log('[OneSignal] User subscribed:', subscription.id);
  }
}
