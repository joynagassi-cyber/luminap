import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Veuillez remplir tous les champs');
      return;
    }

    if (isSignup && (!firstName.trim() || !lastName.trim())) {
      setLocalError('Veuillez entrer votre prénom et nom');
      return;
    }

    setLoading(true);
    try {
      let result: { ok: boolean; error?: string };
      if (isSignup) {
        result = await signup(email, password, firstName.trim(), lastName.trim());
      } else {
        result = await login(email, password);
      }

      if (result.ok) {
        navigate('/');
      } else {
        setLocalError(result.error || (isSignup ? 'Échec de l\'inscription' : 'Identifiants invalides'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#121212' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: '#181818', border: '2px solid #FF6B00' }}>
            <span className="text-2xl font-black" style={{ color: '#FF6B00' }}>L</span>
          </div>
          <p className="text-text-tertiary text-sm">Connexion en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#121212' }}>
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#181818', border: '2px solid #FF6B00' }}>
          <span className="text-4xl font-black" style={{ color: '#FF6B00' }}>L</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Lumina</h1>
        <p className="text-text-tertiary text-sm mt-1">Gestion financière · Temps réel</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {isSignup && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-text-primary text-base outline-none transition-colors focus:ring-2 focus:ring-[#FF6B00]/50"
                style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
              />
            </div>
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-text-primary text-base outline-none transition-colors focus:ring-2 focus:ring-[#FF6B00]/50"
                style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">Adresse email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="utilisateur@mfe-jc.org"
            className="w-full px-4 py-3 rounded-lg text-text-primary text-base outline-none transition-colors focus:ring-2 focus:ring-[#FF6B00]/50"
            style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
          />
        </div>

        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-lg text-text-primary text-base outline-none transition-colors focus:ring-2 focus:ring-[#FF6B00]/50"
            style={{ backgroundColor: '#181818', border: '1px solid #282828' }}
          />
        </div>

        {localError && (
          <p className="text-sm" style={{ color: '#E51332' }}>{localError}</p>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-base text-white transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: '#FF6B00' }}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Chargement...
            </span>
          ) : isSignup ? (
            <><UserPlus className="w-5 h-5" />Créer un compte</>
          ) : (
            <><LogIn className="w-5 h-5" />Se connecter</>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            className="text-sm transition-colors hover:underline"
            style={{ color: '#808080' }}
            onClick={() => { setIsSignup(!isSignup); setLocalError(''); }}
          >
            {isSignup ? 'Déjà un compte ? Se connecter' : 'Créer un compte'}
          </button>
        </div>
      </form>

      {/* Help text */}
      <div className="mt-8 p-4 rounded-lg text-center" style={{ backgroundColor: '#181818', border: '1px solid #282828', maxWidth: '320px' }}>
        <p className="text-text-tertiary text-xs mb-2">🔒 Authentification sécurisée</p>
        <p className="text-text-tertiary text-xs">
          Vos données sont synchronisées en temps réel entre tous les utilisateurs connectés.
        </p>
      </div>

      <p className="text-text-tertiary text-xs mt-6">
        Lumina v2.0 · Église MFE-JC Centrale
      </p>
    </div>
  );
}
