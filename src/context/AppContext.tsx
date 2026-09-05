import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import {
  startBackgroundSync,
  stopBackgroundSync,
  startRealtimeSubscriptions,
  stopRealtimeSubscriptions,
  setupNetworkListeners,
} from '@/lib/sync';
import { cleanInitialData } from '@/lib/cleanup';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { loadInitialData, setOnline } = useLocalStore();

  // First-run cleanup: remove stale groups, clear IndexedDB
  useEffect(() => {
    const stored = localStorage.getItem('lumina-onboarded');
    if (!stored) {
      cleanInitialData();
    }
  }, []);

  // Load data once on mount — cold start with short skeleton
  useEffect(() => {
    loadInitialData().catch(() => {});
  }, []);

  // Network listeners
  useEffect(() => {
    setupNetworkListeners();
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  // Start background sync and realtime on mount
  useEffect(() => {
    if (navigator.onLine) {
      startBackgroundSync();
      startRealtimeSubscriptions();
    }
    return () => {
      stopBackgroundSync();
      stopRealtimeSubscriptions();
    };
  }, []);

  return <>{children}</>;
}
