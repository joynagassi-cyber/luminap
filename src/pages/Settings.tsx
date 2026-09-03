import { useNavigate } from 'react-router-dom';
import { User, Wifi, WifiOff, BookOpen, Bell } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';
import BottomNav from '@/components/BottomNav';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Settings() {
  const navigate = useNavigate();
  const { user, syncStatus, lastSyncedAt, isOnline, notifications } = useLocalStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header */}
        <h1 className="text-xl font-bold text-text-primary mb-6">Paramètres</h1>

        {/* Profile Card */}
        <div className="rounded-xl p-4 mb-5 flex items-center gap-4" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            {user?.role?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-semibold text-lg">
              {user?.role === 'TREASURIER' ? 'Trésorier' :
               user?.role === 'PASTEUR' ? 'Pasteur' :
               user?.role === 'SECRETAIRE' ? 'Secrétaire' :
               user?.role === 'COMPTABLE' ? 'Comptable' :
               user?.role === 'TREASURIER_ADJOINT' ? 'Trésorier Adjoint' :
               user?.role === 'SECRETAIRE_ADJOINT' ? 'Secrétaire Adjoint' :
               user?.firstName || 'Utilisateur'}
            </p>
            <p className="text-text-tertiary text-sm capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
          </div>
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="w-full flex items-center gap-4 p-4 rounded-xl mb-5 text-left active:scale-95 transition-transform"
          style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
            <Bell className="w-5 h-5" style={{ color: '#FF6B00' }} />
          </div>
          <div className="flex-1">
            <p className="text-text-primary font-semibold text-sm">Notifications</p>
            <p className="text-text-tertiary text-xs mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                : 'Aucune notification'}
            </p>
          </div>
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
              {unreadCount}
            </span>
          )}
          <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Network Status */}
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">Connectivité</p>
        <div className="rounded-lg overflow-hidden mb-5" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
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
        <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
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
        <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
          <p className="text-text-primary font-semibold">Église MFE-JC Centrale</p>
          <p className="text-text-tertiary text-sm mt-1">Eglise</p>
        </div>

        {/* Help link */}
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">Aide</p>
        <button
          onClick={() => navigate('/help')}
          className="w-full flex items-center gap-3 p-4 rounded-lg mb-8 text-left active:scale-95 transition-transform"
          style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
            <BookOpen className="w-5 h-5" style={{ color: '#FF6B00' }} />
          </div>
          <div>
            <p className="text-text-primary font-semibold text-sm">Centre d'aide</p>
            <p className="text-text-tertiary text-xs mt-0.5">Guide d'utilisation et FAQ</p>
          </div>
          <svg className="w-4 h-4 text-text-tertiary ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <p className="text-text-tertiary text-xs text-center pb-6">
          Lumina v2.0 · Église MFE-JC Centrale<br />
          Données sauvegardées localement · Sync cloud automatique
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
