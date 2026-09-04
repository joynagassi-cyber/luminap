import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Settings, Database, Cloud, CloudOff, RefreshCw, CreditCard, UserCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, loadInitialData, isOnline } = useLocalStore();

  const handleRefresh = async () => {
    await loadInitialData();
  };

  const handleLogout = () => {
    localStorage.removeItem('lumina-session');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Paramètres" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <h1 className="text-text-primary font-bold text-xl mb-6">Paramètres</h1>

        {/* Profile */}
        <div className="rounded-xl p-4 mb-5 flex items-center gap-4" style={{ backgroundColor: '#212121' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
            <UserCircle className="w-7 h-7" style={{ color: '#FF6B00' }} />
          </div>
          <div className="flex-1">
            <p className="text-text-primary font-semibold text-base">{user.firstName} {user.lastName}</p>
            <p className="text-text-tertiary text-sm">{user.role}</p>
            <p className="text-text-tertiary text-xs mt-0.5">{user.org.name}</p>
          </div>
        </div>

        {/* Sync status */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isOnline ? <Cloud className="w-5 h-5" style={{ color: '#1DB954' }} /> : <CloudOff className="w-5 h-5" style={{ color: '#808080' }} />}
              <span className="text-text-primary font-medium">Synchronisation</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: isOnline ? '#1DB95420' : '#80808020', color: isOnline ? '#1DB954' : '#808080' }}>
              {isOnline ? 'Connecté' : 'Hors ligne'}
            </span>
          </div>
          <p className="text-text-tertiary text-xs">Données synchronisées automatiquement quand la connexion est disponible.</p>
        </div>

        {/* Storage */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-5 h-5" style={{ color: '#FF6B00' }} />
            <span className="text-text-primary font-medium">Stockage local</span>
          </div>
          <p className="text-text-tertiary text-xs mb-3">Les données sont stockées localement sur votre appareil (IndexedDB). Aucune authentification requise.</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Base de données</span>
            <span className="text-text-secondary">lumina-db v7</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 mb-6">
          <button onClick={handleRefresh} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
              <RefreshCw className="w-5 h-5" style={{ color: '#FF6B00' }} />
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">Actualiser les données</p>
              <p className="text-text-tertiary text-xs mt-0.5">Recharger depuis la base locale</p>
            </div>
          </button>

          <button onClick={() => navigate('/balance')} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1DB95420' }}>
              <CreditCard className="w-5 h-5" style={{ color: '#1DB954' }} />
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">Bilan financier</p>
              <p className="text-text-tertiary text-xs mt-0.5">Voir le rapport par période</p>
            </div>
          </button>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary transition-all active:scale-95" style={{ backgroundColor: '#212121' }}>
          Se déconnecter
        </button>

        <p className="text-text-tertiary text-xs text-center mt-6">Lumina v1.0 · Église MFE-JC Centrale</p>
      </div>
      <BottomNav />
    </div>
  );
}
