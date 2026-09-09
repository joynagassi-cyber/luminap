/**
 * OneSignal Integration with Authentication
 * Connects Supabase auth to OneSignal push notifications
 *
 * Uses src/lib/onesignal.ts for the actual implementation,
 * which handles both Capacitor native and web environments.
 */
import { getOneSignalService, initOneSignal } from './onesignal';
import { authService } from './auth';
import type { Role } from '@/types';

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '5482a4eb-a402-4612-ab5e-a72df7961b12';

// OneSignal service class (delegates to src/lib/onesignal.ts)
class OneSignalAuthService {
  private isInitialized = false;
  private userId: string | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      await initOneSignal();
      this.isInitialized = true;
    } catch (error) {
    }
  }

  async login(role: Role, userId: string): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    try {
      const service = getOneSignalService();
      await service.login(userId);
      await service.setTag('role', role);
      await service.setTag('user_id', userId);
      this.userId = userId;
    } catch (error) {
    }
  }

  async logout(): Promise<void> {
    if (!this.isInitialized) return;
    try {
      const service = getOneSignalService();
      await service.logout();
      this.userId = null;
    } catch (error) {
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const service = getOneSignalService();
      return await service.requestPermission();
    } catch (error) {
      return false;
    }
  }

  getUserId(): string | null {
    return this.userId;
  }

  async notifyRole(role: Role, title: string, message: string, data?: Record<string, any>): Promise<void> {
    // no-op: client-side stub; actual sends go through backend
  }
}

export const oneSignalService = new OneSignalAuthService();
export function useOneSignal() { return oneSignalService; }
