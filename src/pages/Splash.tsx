import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';

const SPLASH_DURATION = 2200; // ms — must exceed Capacitor splash launchShowDuration (2000)

export default function Splash() {
  const navigate = useNavigate();
  const { loadInitialData, user } = useLocalStore();
  const [phase, setPhase] = useState<'initializing' | 'loading'>('initializing');

  useEffect(() => {
    let cancelled = false;
    let splashTimer: ReturnType<typeof setTimeout>;
    let loadingTimer: ReturnType<typeof setTimeout>;

    async function init() {
      // Show splash immediately
      setPhase('initializing');

      // Wait for native splash to finish (Capacitor auto-hides after 2000ms)
      splashTimer = setTimeout(async () => {
        if (cancelled) return;
        setPhase('loading');

        // Load data from IndexedDB + check auth state
        try {
          await loadInitialData();
        } catch (e) {
          console.error('[Splash] loadInitialData failed', e);
        }

        if (cancelled) return;

        const storedRole = localStorage.getItem('lumina-role');
        const storedOnboarded = localStorage.getItem('lumina-onboarded');

        if (storedRole && storedOnboarded === 'true') {
          // Registered user with role → go to dashboard
          navigate('/', { replace: true });
        } else {
          // First time or no role → go to onboarding
          navigate('/onboarding', { replace: true });
        }
      }, SPLASH_DURATION);
    }

    init();

    return () => {
      cancelled = true;
      clearTimeout(splashTimer);
      clearTimeout(loadingTimer);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: '#121212' }}
    >
      {/* Logo */}
      <div className="mb-6">
        <img
          src="/lumina-logo.png"
          alt="Lumina"
          className="w-20 h-20 object-contain"
        />
      </div>

      {/* App name */}
      <h1
        className="text-white font-bold text-3xl tracking-wide mb-2"
        style={{ color: '#FF6B00' }}
      >
        Lumina
      </h1>

      {/* Tagline */}
      <p className="text-[#808080] text-sm mb-10">
        Gestion financière des églises
      </p>

      {/* Loading indicator */}
      {phase === 'loading' && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#FF6B00] border-t-transparent animate-spin" />
          <p className="text-[#808080] text-xs">Chargement en cours…</p>
        </div>
      )}

      {/* Version */}
      <p className="absolute bottom-8 text-[#535353] text-xs">
        Lumina v2.0
      </p>
    </div>
  );
}
