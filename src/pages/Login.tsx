import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { LogIn, Lock } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60_000; // 1 minute

export default function Login() {
  const navigate = useNavigate();
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const attemptCount = useRef(0);
  const lockoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer on unmount
  useState(() => () => {
    if (lockoutTimer.current) clearTimeout(lockoutTimer.current);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Trop de tentatives. Réessayez dans ${remaining}s`);
      return;
    }

    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        attemptCount.current = 0;
        navigate('/');
      } else {
        attemptCount.current += 1;
        if (attemptCount.current >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_DURATION;
          setLockedUntil(until);
          lockoutTimer.current = setTimeout(() => setLockedUntil(null), LOCKOUT_DURATION);
          setError(`Compte verrouillé. Réessayez dans ${LOCKOUT_DURATION / 1000}s`);
        } else {
          setError(`Identifiants invalides (${MAX_ATTEMPTS - attemptCount.current} tentative${MAX_ATTEMPTS - attemptCount.current > 1 ? 's' : ''} restante${MAX_ATTEMPTS - attemptCount.current > 1 ? 's' : ''})`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#121212' }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: '#181818', border: '2px solid #FF6B00' }}
        >
          <span className="text-4xl font-black" style={{ color: '#FF6B00' }}>L</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Lumina</h1>
        <p className="text-text-tertiary text-sm mt-1">Gestion financière des organisations</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Adresse email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@mfe-jc.org"
            className="w-full px-4 py-3 rounded-lg text-text-primary text-base outline-none transition-all"
            style={{
              backgroundColor: '#181818',
              border: '1px solid #282828',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#FF6B00')}
            onBlur={(e) => (e.target.style.borderColor = '#282828')}
          />
        </div>

        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-lg text-text-primary text-base outline-none transition-all"
            style={{
              backgroundColor: '#181818',
              border: '1px solid #282828',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#FF6B00')}
            onBlur={(e) => (e.target.style.borderColor = '#282828')}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: '#E51332' }}>{error}</p>
        )}

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-base text-white transition-all active:scale-95"
          style={{ backgroundColor: '#FF6B00' }}
          disabled={loading}
        >
          <LogIn className="w-5 h-5" />
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <div className="text-center">
          <button
            type="button"
            className="text-sm"
            style={{ color: '#808080' }}
            onClick={() => navigate('/')}
          >
            Mot de passe oublié ?
          </button>
        </div>
      </form>

      <p className="text-text-tertiary text-xs mt-8 text-center">
        Version 1.0 · Église MFE-JC Centrale
      </p>
    </div>
  );
}
