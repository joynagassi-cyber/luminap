import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';

export default function Login() {
  const navigate = useNavigate();
  const { selectRole, loadInitialData } = useLocalStore();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!name.trim()) { setError('Veuillez entrer votre prénom'); return; }
    if (!role) { setError('Veuillez sélectionner un rôle'); return; }
    setLoading(true);
    try {
      localStorage.setItem('lumina-session', crypto.randomUUID());
      localStorage.setItem('lumina-role', role);
      localStorage.setItem('lumina-onboarded', 'true');
      await selectRole(role as any);
      await loadInitialData();
      navigate('/role-selection', { replace: true });
    } catch (e) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <img src="/lumina-logo.png" alt="Lumina" className="w-16 h-16 mx-auto mb-4 rounded-xl" />
          <h1 className="text-text-primary text-2xl font-bold mb-2">Lumina</h1>
          <p className="text-text-tertiary text-sm">Gestion financière de l'église</p>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="text-text-secondary text-xs font-medium mb-2 block">Votre prénom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Jean"
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-text-secondary text-xs font-medium mb-2 block">Votre rôle</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'TREASURIER', label: 'Trésorier' },
                { id: 'PASTEUR', label: 'Pasteur' },
                { id: 'SECRETAIRE', label: 'Secrétaire' },
                { id: 'COMPTABLE', label: 'Comptable' },
                { id: 'TREASURIER_ADJOINT', label: 'Trés. Adjoint' },
                { id: 'SECRETAIRE_ADJOINT', label: 'Secr. Adjoint' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setRole(id)}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl text-xs font-medium transition-all"
                  style={role === id
                    ? { backgroundColor: '#FF6B0020', border: '1px solid #FF6B00', color: '#FF6B00' }
                    : { backgroundColor: '#212121', border: '1px solid #282828', color: '#808080' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-text-tertiary text-xs text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3.5 rounded-full font-semibold text-base text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: '#FF6B00' }}
        >
          {loading ? 'Connexion...' : 'Continuer'}
        </button>

        <p className="text-text-tertiary text-xs text-center mt-6">
          Accès direct — aucune authentification requise
        </p>
      </div>
    </div>
  );
}
