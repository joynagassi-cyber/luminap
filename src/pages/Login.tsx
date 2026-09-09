import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { usePowerSyncStatus } from '@/lib/dataLayer';
import { Shield, User, Mail, Wifi, WifiOff } from 'lucide-react';
import { IonPage, IonHeader, IonContent, IonTitle, IonToolbar } from '@ionic/react';

export default function Login() {
  const navigate = useNavigate();
  const { selectRole, loadInitialData } = useLocalStore();
  const isPowerSyncReady = usePowerSyncStatus();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'TREASURIER', label: 'Trésorier' },
    { id: 'PASTEUR', label: 'Pasteur' },
    { id: 'SECRETAIRE', label: 'Secrétaire' },
    { id: 'COMPTABLE', label: 'Comptable' },
    { id: 'TREASURIER_ADJOINT', label: 'Trés. Adjoint' },
    { id: 'SECRETAIRE_ADJOINT', label: 'Secr. Adjoint' },
  ];

  const handleLogin = async () => {
    if (!name.trim()) { setError('Veuillez entrer votre prénom'); return; }
    if (!role) { setError('Veuillez sélectionner un rôle'); return; }
    setLoading(true);
    try {
      localStorage.setItem('lumina-session', crypto.randomUUID());
      localStorage.setItem('lumina-role', role);
      localStorage.setItem('lumina-onboarded', 'true');
      localStorage.setItem('lumina-firstName', name.trim());
      await selectRole(role as any);
      await loadInitialData();
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError('Nous n\'avons pas pu vous connecter. Vérifiez votre connexion internet puis réessayez.');
    }
    setLoading(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
      <div className="min-h-screen bg-[#121212] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5">
        <img src="/lumina-logo.png" alt="Lumina" className="w-10 h-10 object-contain" />
        <div className="flex items-center gap-2 text-xs" style={{ color: isPowerSyncReady ? '#1DB954' : '#B3B3B3' }}>
          {isPowerSyncReady ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{isPowerSyncReady ? 'Connecté' : 'Hors ligne'}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 flex flex-col justify-center max-w-sm mx-auto w-full pb-12">
        <h1 className="text-white font-bold text-2xl mb-1">Bon retour</h1>
        <p className="text-[#808080] text-sm mb-8">Entrez votre prénom et choisissez votre rôle.</p>

        <div className="space-y-4">
          <div>
            <label className="text-[#B3B3B3] text-xs font-medium mb-2 block">Votre prénom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Jean"
             
className="w-full px-4 py-3 rounded-xl text-white text-sm""
              style={{ backgroundColor: '#1E1E1E', border: '1px solid #282828' }}
            />
          </div>

          <div>
            <label className="text-[#B3B3B3] text-xs font-medium mb-2 block">Votre rôle</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className="py-3 rounded-xl text-xs font-medium transition-all"
                  style={role === r.id
                    ? { backgroundColor: '#FF6B00', color: '#fff' }
                    : { backgroundColor: '#1E1E1E', color: '#B3B3B3', border: '1px solid #282828' }
                  }
                  aria-pressed={role === r.id}
                  aria-label={r.label}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm text-center" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !name.trim() || !role}
            className="w-full py-4 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: '#FF6B00' }}
            aria-label="Continuer"
          >
            {loading ? 'Connexion...' : 'Continuer'}
          </button>
        </div>
      </div>
      </div>
      </IonContent>
    </IonPage>
  );
}
