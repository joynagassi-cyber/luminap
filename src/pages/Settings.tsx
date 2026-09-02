import { useNavigate } from 'react-router-dom';
import { User, Wifi, WifiOff } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';
import BottomNav from '@/components/BottomNav';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Settings() {
  const { user, syncStatus, lastSyncedAt, isOnline } = useLocalStore();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header */}
        <h1 className="text-xl font-bold text-text-primary mb-6">Paramètres</h1>

        {/* Profile Card */}
        <div className="rounded-xl p-4 mb-5 flex items-center gap-4" style={{ backgroundColor: '#212121' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-semibold text-lg truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-text-tertiary text-sm truncate">{user?.email}</p>
            <p className="text-text-tertiary text-xs mt-1 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>

        {/* Network Status */}
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">Connectivité</p>
        <div className="rounded-lg overflow-hidden mb-5" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="w-5 h-5" style={{ color: '#1DB954' }} />
              ) : (
                <WifiOff className="w-5 h-5" style={{ color: '#E51332' }} />
              )}
              <div>
                <p className="text-text-primary font-medium text-sm">{isOnline ? 'En ligne' : 'Hors ligne'}</p>
                <p className="text-text-tertiary text-xs">
                  {lastSyncedAt
                    ? `Sync: ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true, locale: fr })}`
                    : 'Jamais sync'}
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ backgroundColor: isOnline ? '#1DB95420' : '#E5133220', color: isOnline ? '#1DB954' : '#E51332' }}>
              {syncStatus === 'syncing' ? 'Sync...' : syncStatus === 'error' ? 'Erreur' : 'OK'}
            </span>
          </div>
        </div>

        {/* Storage info */}
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">Stockage local</p>
        <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-tertiary text-sm">IndexedDB</span>
            <span className="text-text-primary text-sm font-medium">Actif</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary text-sm">Mode</span>
            <span className="text-text-primary text-sm font-medium">Local-first</span>
          </div>
        </div>

        {/* Organization */}
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">Organisation</p>
        <div className="rounded-lg p-4 mb-8" style={{ backgroundColor: '#212121' }}>
          <p className="text-text-primary font-semibold">{user?.org?.name || '—'}</p>
          <p className="text-text-tertiary text-sm mt-1">{user?.org?.type}</p>
        </div>

        <p className="text-text-tertiary text-xs text-center pb-6">
          Lumina v2.0 · Église MFE-JC Centrale<br />
          Données sauvegardées localement · Sync cloud automatique
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
