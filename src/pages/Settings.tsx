import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Wifi, WifiOff, BookOpen, Bell, Building2, Camera, Upload, Save, X } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import LuminaLogo from '@/components/LuminaLogo';

export default function Settings() {
  const navigate = useNavigate();
  const { user, syncStatus, lastSyncedAt, isOnline, notifications, refreshData } = useLocalStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const [orgName, setOrgName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      const name = await import('@/lib/db').then(m => m.getConfig<string>('orgName')).catch(() => null);
      const logo = await import('@/lib/db').then(m => m.getConfig<string>('orgLogoUrl')).catch(() => null);
      setOrgName(name || 'Église MFE-JC Centrale');
      setLogoUrl(logo || '');
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    const db = await import('@/lib/db');
    setSaving(true);
    await db.setOrgConfig('orgName', orgName.trim());
    await db.setOrgConfig('orgLogoUrl', logoUrl.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError(true);
      return;
    }
    if (file.size > 500 * 1024) {
      setLogoError(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoUrl(ev.target?.result as string);
      setLogoError(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Paramètres" />
      <div className="max-w-lg mx-auto px-5 pb-24">

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

        {/* Organization Config */}
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">Organisation</p>
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
          <div className="flex items-center gap-3 mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo église" className="w-12 h-12 rounded-lg object-cover" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
            ) : (
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
                <Building2 className="w-6 h-6" style={{ color: '#808080' }} />
              </div>
            )}
            <div className="flex-1">
              <p className="text-text-primary font-semibold text-base">{orgName || 'Église MFE-JC Centrale'}</p>
              <p className="text-text-tertiary text-xs mt-0.5">Configurateur d'identité</p>
            </div>
          </div>

          {/* Church name */}
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-medium mb-2">Nom de l'église</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="ex: Église de la Grâce"
              maxLength={60}
              className="w-full px-4 py-3 rounded-lg text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#121212', border: '1px solid #282828' }}
            />
          </div>

          {/* Logo upload */}
          <div className="mb-4">
            <label className="block text-text-secondary text-sm font-medium mb-2">Logo de l'église</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center gap-2 py-3 px-4 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: '#121212', border: '1px dashed #282828' }}>
                <Upload className="w-4 h-4 text-text-tertiary" />
                <span className="text-text-tertiary text-sm">Choisir une image</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {logoUrl && (
                <button onClick={() => { setLogoUrl(''); setLogoError(false); }} className="p-2.5 rounded-lg" style={{ backgroundColor: '#282828', color: '#808080' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {logoError && <p className="text-xs mt-1" style={{ color: '#E51332' }}>Image requise (max 500 Ko)</p>}
            {logoUrl && (
              <div className="mt-3 flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#121212' }}>
                <img src={logoUrl} alt="Aperçu" className="w-10 h-10 rounded-lg object-cover" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
                <div>
                  <p className="text-text-primary text-sm font-medium">Logo prêt</p>
                  <p className="text-text-tertiary text-xs">Sera affiché dans les rapports</p>
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: saved ? '#1DB954' : '#FF6B00', color: '#FFFFFF' }}
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : saved ? (
              <><Save className="w-4 h-4" />Sauvegardé ✓</>
            ) : (
              <><Save className="w-4 h-4" />Sauvegarder</>
            )}
          </button>
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
          Lumina v2.0 · {orgName || 'Église MFE-JC Centrale'}<br />
          Données sauvegardées localement · Sync cloud automatique
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

