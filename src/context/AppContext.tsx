/**
 * App Context - PowerSync Integration + Auth
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { usePowerSyncStatus } from '@/lib/dataLayer';
import { authService } from '@/lib/auth';
import { oneSignalService } from '@/lib/authOneSignal';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { loadInitialData, setOnline } = useLocalStore();
  const isPowerSyncReady = usePowerSyncStatus();

  // Load initial data
  useEffect(() => {
    loadInitialData().catch(() => {});
  }, []);

  // Network listeners
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const session = await authService.getSession();
      if (session) {
        const profile = await authService.getProfile(session.user.id);
        if (profile) {
          // Sync role with local store
          await useLocalStore.getState().selectRole(profile.role as any);
          // Sync with OneSignal
          await oneSignalService.login(profile.role as any, profile.id);
        }
      }
    };
    checkAuth();
  }, []);

  return <>{children}</>;
}
