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
      await selectRole(role as any);
      await loadInitialData();
      navigate('/role-selection', { replace: true });
    } catch (e) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5">
        <img src="/lumina-logo.png" alt="Lumina" className="w-10 h-10 object-contain" />
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
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
              style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-[#B3B3B3] text-xs font-medium mb-2 block">Votre rôle</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setRole(id)}
                  disabled={loading}
                  className="py-2.5 px-3 rounded-xl text-xs font-medium transition-all"
                  style={role === id
                    ? { backgroundColor: '#FF6B0020', border: '1px solid #FF6B00', color: '#FF6B00' }
                    : { backgroundColor: '#181818', border: '1px solid #282828', color: '#808080' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-[#E51332] text-xs text-center mt-4">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3.5 rounded-full font-semibold text-base text-white mt-8 transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: '#FF6B00' }}
        >
          {loading ? 'Connexion...' : 'Continuer'}
        </button>

        <p className="text-[#808080] text-xs text-center mt-6">
          Accès direct — aucune authentification requise
        </p>
      </div>
    </div>
  );
}
