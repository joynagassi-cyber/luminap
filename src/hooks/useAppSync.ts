import { useEffect } from 'react';
import { useSupabaseStore } from '@/store/useSupabaseStore';
import { useRealtimeSync } from '@/store/useSupabaseStore';

/**
 * Hook that initializes the app with Supabase data and realtime sync.
 * Call this in your root component or main app.
 */
export function useAppSync() {
  const user = useSupabaseStore(s => s.user);
  const isLoading = useSupabaseStore(s => s.isLoading);
  const refreshData = useSupabaseStore(s => s.refreshData);

  // Subscribe to realtime events
  useRealtimeSync();

  // Initial data load (after auth check)
  useEffect(() => {
    if (!isLoading && user) {
      refreshData();
    }
  }, [user, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps
}
