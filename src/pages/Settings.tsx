import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Settings, Database, Cloud, CloudOff, RefreshCw, CreditCard, UserCircle, Camera, Building2, Image as ImageIcon, BookOpen, ScrollText, Check } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import LuminaLogo from '@/components/LuminaLogo';
import { FullPageSkeleton } from '@/components/Skeleton';
import { generateId } from '@/lib/utils';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, appConfig, updateConfig, loadInitialData, isOnline, auditEntries } = useLocalStore();
  const [churchName, setChurchName] = useState(appConfig.churchName);
  const [churchLogo, setChurchLogo] = useState(appConfig.churchLogoUrl);
  const [userPhoto, setUserPhoto] = useState(appConfig.userPhoto);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateConfig({ churchName: churchName.trim(), churchLogoUrl: churchLogo, userPhoto });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setUserPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setChurchLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRefresh = async () => {
    await loadInitialData();
  };

  const handleLogout = () => {
    localStorage.removeItem('lumina-session');
    localStorage.removeItem('lumina-role');
    navigate('/login');
  };

  const pendingCount = auditEntries.filter(a => a.action === 'CREATED' || a.action === 'UPDATED').length;
  const totalActions = auditEntries.length;

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Paramètres" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <h1 className="text-text-primary font-bold text-xl mb-5">Paramètres</h1>

        {/* Profile card */}
        <div className="rounded-xl p-4 mb-5 flex items-center gap-4" style={{ backgroundColor: '#212121' }}>
          <div className="relative">
            {userPhoto ? (
              <img src={userPhoto} alt="Photo" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
                <UserCircle className="w-7 h-7" style={{ color: '#FF6B00' }} />
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95" style={{ backgroundColor: '#FF6B00' }}>
              <Camera className="w-3 h-3 text-white" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          <div className="flex-1">
            <p className="text-text-primary font-semibold text-base">{user.firstName} {user.lastName}</p>
            <p className="text-text-tertiary text-sm">{user.role.replace(/_/g, ' ').toLowerCase()}</p>
            <p className="text-text-tertiary text-xs mt-0.5">{user.org.name}</p>
          </div>
        </div>

        {/* Church config */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5" style={{ color: '#FF6B00' }} />
            <span className="text-text-primary font-semibold">Configuration de l'église</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Nom complet de l'église</label>
              <input
                type="text"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                placeholder="Ex: Église MFE-JC Centrale de Douala"
                className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
              />
            </div>
            <div>
              <label className="text-text-tertiary text-xs mb-1.5 block">Logo de l'église</label>
              <div className="flex items-center gap-3">
                {churchLogo ? (
                  <img src={churchLogo} alt="Logo" className="w-12 h-12 rounded-lg object-cover" style={{ border: '1px solid #282828' }} />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#181818', border: '1px solid #282828' }}>
                    <ImageIcon className="w-5 h-5 text-text-tertiary" />
                  </div>
                )}
                <label className="flex-1">
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <span className="text-xs font-medium text-center py-2 rounded-xl block cursor-pointer transition-all active:scale-95" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>
                    Choisir un logo
                  </span>
                </label>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50" style={{ backgroundColor: '#FF6B00' }}>
              {saving ? 'Sauvegarde...' : saved ? (
                <span className="flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Sauvegardé</span>
              ) : 'Sauvegarder la configuration'}
            </button>
          </div>
        </div>

        {/* Sync status */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isOnline ? <Cloud className="w-5 h-5" style={{ color: '#1DB954' }} /> : <CloudOff className="w-5 h-5" style={{ color: '#808080' }} />}
              <span className="text-text-primary font-medium">Synchronisation</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: isOnline ? '#1DB95420' : '#80808020', color: isOnline ? '#1DB954' : '#808080' }}>
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
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-tertiary">Base de données</span>
            <span className="text-text-secondary">lumina-db v8</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Actions enregistrées</span>
            <span className="text-text-secondary">{totalActions}</span>
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

          <button onClick={() => navigate('/tutoriel')} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#8B5CF620' }}>
              <BookOpen className="text-lg" style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">Tutoriel & Aide</p>
              <p className="text-text-tertiary text-xs mt-0.5">Guide complet d'utilisation</p>
            </div>
          </button>

          <button onClick={() => navigate('/history')} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3B82F620' }}>
              <ScrollText className="text-lg" style={{ color: '#3B82F6' }} />
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">Historique des actions</p>
              <p className="text-text-tertiary text-xs mt-0.5">Traçabilité de toutes les opérations</p>
            </div>
          </button>

          <button onClick={() => navigate('/versement')} className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FFB80020' }}>
              <CreditCard className="text-lg" style={{ color: '#FFB800' }} />
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">Versement</p>
              <p className="text-text-tertiary text-xs mt-0.5">Transférer vers la caisse principale</p>
            </div>
          </button>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} className="w-full py-3 rounded-full font-medium text-sm text-text-tertiary transition-all active:scale-95" style={{ backgroundColor: '#212121' }}>
          Se déconnecter
        </button>

        <div className="flex items-center justify-center gap-2 mt-6">
          <img src="/lumina-logo.png" alt="Lumina" className="w-5 h-5 rounded" />
          <p className="text-text-tertiary text-xs">Lumina v2.0 · {appConfig.churchName || user.org.name}</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
