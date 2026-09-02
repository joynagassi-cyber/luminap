import { useSupabaseStore } from '@/store/useSupabaseStore';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SyncIndicator() {
  const syncStatus = useSupabaseStore(s => s.syncStatus);
  const lastSyncedAt = useSupabaseStore(s => s.lastSyncedAt);
  const isLoading = useSupabaseStore(s => s.isLoading);

  if (isLoading) {
    return (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
        style={{ backgroundColor: '#181818', border: '1px solid #282828', color: '#B3B3B3' }}>
        <Loader2 className="w-3 h-3 animate-spin" style={{ color: '#FF6B00' }} />
        Chargement...
      </div>
    );
  }

  const statusConfig = {
    synced: { icon: Wifi, color: '#1DB954', bg: '#1DB95420', label: 'En ligne' },
    syncing: { icon: Loader2, color: '#FFB800', bg: '#FFB80020', label: 'Sync...' },
    error: { icon: WifiOff, color: '#E51332', bg: '#E5133220', label: 'Hors ligne' },
  };

  const { icon: Icon, color, bg, label } = statusConfig[syncStatus];

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium cursor-default transition-all hover:scale-105"
      style={{ backgroundColor: bg, border: `1px solid ${color}40`, color }}
      title={lastSyncedAt ? `Dernière sync: ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: fr })}` : ''}
    >
      <Icon className="w-3 h-3" />
      {label}
      {lastSyncedAt && (
        <span style={{ color: `${color}80` }}>
          · {formatDistanceToNow(new Date(lastSyncedAt), { locale: fr })}
        </span>
      )}
    </div>
  );
}
