import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { loadInitialData, setOnline } = useLocalStore();

  useEffect(() => {
    loadInitialData();
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <>{children}</>;
}
