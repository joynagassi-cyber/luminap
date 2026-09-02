import { useEffect, useState } from 'react';
import { onSyncStatusChange, getSyncStatus } from '@/lib/sync';
import { toast } from 'sonner';
import { Loader2, WifiOff, AlertCircle, Wifi } from 'lucide-react';

let lastStatus: string | null = null;
let lastOffline = false;

export default function SyncIndicator() {
  const [status, setStatus] = useState<{ syncStatus: string; lastSyncedAt: string | null }>({
    syncStatus: 'idle',
    lastSyncedAt: null,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const unsub = onSyncStatusChange(() => {
      setStatus(getSyncStatus());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); };
    const onOffline = () => { setIsOnline(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const { syncStatus, lastSyncedAt } = status;
    const key = `${syncStatus}-${isOnline}`;
    if (key === lastStatus) return;
    lastStatus = key;

    if (!isOnline) {
      if (!lastOffline) {
        toast.info('Hors ligne', {
          description: 'Les données sont sauvegardées localement.',
          icon: <WifiOff className="w-4 h-4" />,
          duration: 3000,
        });
        lastOffline = true;
      }
      return;
    }
    lastOffline = false;

    if (syncStatus === 'syncing') {
      toast.info('Synchronisation', {
        description: 'Mise à jour des données…',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        duration: 2000,
      });
    } else if (syncStatus === 'error') {
      toast.error('Erreur de synchronisation', {
        description: 'Réessayez automatiquement…',
        icon: <AlertCircle className="w-4 h-4" />,
        duration: 4000,
      });
    } else if (lastSyncedAt) {
      toast.success('Sync terminée', {
        description: `Dernière synchro: ${new Date(lastSyncedAt).toLocaleTimeString('fr-FR')}`,
        icon: <Wifi className="w-4 h-4" style={{ color: '#1DB954' }} />,
        duration: 2000,
      });
    }
  }, [status, isOnline]);

  return null;
}
