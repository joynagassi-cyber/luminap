/**
 * App Context - PowerSync Integration
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { usePowerSyncStatus } from '@/lib/dataLayer';

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

  return <>{children}</>;
}
