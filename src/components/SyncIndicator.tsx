import { useLocalStore } from '@/store/useLocalStore';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SyncIndicator() {
  const syncStatus = useLocalStore(s => s.syncStatus);
  const lastSyncedAt = useLocalStore(s => s.lastSyncedAt);
  const isOnline = useLocalStore(s => s.isOnline);

  if (!isOnline) {
    return (
      <div
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
        style={{ backgroundColor: '#E5133220', border: '1px solid #E5133240', color: '#E51332' }}
      >
        <WifiOff className="w-3 h-3" />
        Hors ligne · Données locales
      </div>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <div
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
        style={{ backgroundColor: '#FFB80020', border: '1px solid #FFB80040', color: '#FFB800' }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        Sync en cours...
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium cursor-default"
        style={{ backgroundColor: '#E5133220', border: '1px solid #E5133240', color: '#E51332' }}
        title="Erreur de sync — réessaie automatiquement"
      >
        <WifiOff className="w-3 h-3" />
        Sync erreur
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium cursor-default transition-all hover:scale-105"
      style={{ backgroundColor: '#1DB95420', border: '1px solid #1DB95440', color: '#1DB954' }}
      title={lastSyncedAt ? `Dernière sync: ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: fr })}` : 'Connecté'}
    >
      <Wifi className="w-3 h-3" />
      {lastSyncedAt ? (
        <span style={{ color: '#1DB95480' }}>
          · {formatDistanceToNow(new Date(lastSyncedAt), { locale: fr })}
        </span>
      ) : 'Connecté'}
    </div>
  );
}
