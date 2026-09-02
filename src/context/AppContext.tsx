import { createContext, useContext, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { initStore, useLocalStore } from '@/store/useLocalStore';

interface AppState {
  isLoading: boolean;
  error: string | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
  lastSyncedAt: string | null;
  isOnline: boolean;
}

interface AppContextType extends AppState {
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    error: null,
    syncStatus: 'idle',
    lastSyncedAt: null,
    isOnline: navigator.onLine,
  });

  useEffect(() => {
    initStore();

    const unsubscribe = useLocalStore.subscribe((state) => {
      setState({
        isLoading: state.isLoading,
        error: state.error,
        syncStatus: state.syncStatus,
        lastSyncedAt: state.lastSyncedAt,
        isOnline: state.isOnline,
      });
    });

    return unsubscribe;
  }, []);

  const refreshData = async () => {
    await useLocalStore.getState().refreshData();
    setState(s => ({ ...s, isLoading: false }));
  };

  return (
    <AppContext.Provider value={{ ...state, refreshData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
