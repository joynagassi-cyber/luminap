import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';
import * as db from '@/lib/db';
import LuminaLogo from '@/components/LuminaLogo';
import LogoSpinner from '@/components/LogoSpinner';
import Onboarding from '@/pages/Onboarding';

export default function Login() {
  const navigate = useNavigate();
  const { refreshData } = useLocalStore();
  const [loading, setLoading] = useState(false);
  const [checkDone, setCheckDone] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const check = async () => {
      const hasCompleted = await db.getConfig<boolean>('hasCompletedOnboarding');
      if (!hasCompleted) {
        setShowOnboarding(true);
        return;
      }
      const role = await db.getRole();
      if (role) {
        navigate('/');
      } else {
        setCheckDone(true);
      }
    };
    check();
  }, [navigate]);

  const handleEnter = async () => {
    setLoading(true);
    await refreshData();
    setLoading(false);
    navigate('/role-selection');
  };

  if (showOnboarding) {
    return <Onboarding />;
  }

  if (!checkDone) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121212' }}>
        <LogoSpinner size={100} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#121212' }}>
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#181818', border: '3px solid #FF6B00' }}>
          <LuminaLogo size={80} />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">Lumina</h1>
        <p className="text-text-tertiary text-sm mt-1">Gestion financière · Sans compte requis</p>
      </div>

      {/* Info card */}
      <div className="w-full max-w-sm mb-8 p-5 rounded-xl" style={{ backgroundColor: '#181818', border: '1px solid #282828' }}>
        <h2 className="text-text-primary font-semibold mb-3">Comment ça marche ?</h2>
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span style={{ color: '#1DB954' }}>✓</span>
            <span>Données sauvegardées localement (IndexedDB)</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: '#1DB954' }}>✓</span>
            <span>Sync automatique vers le cloud quand connecté</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: '#1DB954' }}>✓</span>
            <span>Travaille hors-ligne, sync à la reconnexion</span>
          </li>
          <li className="flex items-start gap-2">
            <span style={{ color: '#1DB954' }}>✓</span>
            <span>Choisissez votre rôle, suivez les notifications</span>
          </li>
        </ul>
      </div>

      {/* Enter button */}
      <button
        onClick={handleEnter}
        disabled={loading}
        className="w-full max-w-sm flex items-center justify-center gap-3 py-4 rounded-full font-semibold text-base text-white transition-all active:scale-95 disabled:opacity-60"
        style={{ backgroundColor: '#FF6B00' }}
      >
        <LogIn className="w-5 h-5" />
        {loading ? 'Chargement…' : "Entrer dans l'application"}
      </button>

      <p className="text-text-tertiary text-xs mt-8 text-center max-w-sm">
        Lumina v2.0 · Église MFE-JC Centrale<br />
        Données sauvegardées localement · Sync cloud automatique
      </p>
    </div>
  );
}
