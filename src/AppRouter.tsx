import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '@/lib/auth';
import { oneSignalService } from '@/lib/authOneSignal';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/finance',
  '/transaction',
  '/groups',
  '/events',
  '/versement',
  '/members',
  '/archives',
  '/reports',
  '/forms',
  '/custom-fields',
  '/report-builder',
  '/cotisations',
  '/saisie-rapide',
  '/culte',
  '/membres-en-avance',
  '/membre',
  '/trace',
  '/history',
  '/help',
  '/settings',
  '/notifications',
];

// Auth routes
const AUTH_ROUTES = ['/auth', '/auth/callback'];

export default function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize OneSignal
    oneSignalService.initialize();

    // Check authentication status
    const checkAuth = async () => {
      const session = await authService.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);

      // If no session and not on auth page, redirect to auth
      if (!session && !AUTH_ROUTES.includes(location.pathname)) {
        navigate('/auth', { replace: true });
      }
    };

    checkAuth();

    // Listen to auth state changes
    const unsubscribe = authService.subscribe(() => {
      const state = authService.getState();
      setIsAuthenticated(!!state.session);

      // If user logs out, redirect to auth
      if (!state.session && !AUTH_ROUTES.includes(location.pathname)) {
        navigate('/auth', { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  // Navigate logic
  useEffect(() => {
    if (isLoading) return;

    const isProtected = PROTECTED_ROUTES.some(route =>
      location.pathname.startsWith(route)
    );

    // If on auth page but already authenticated, redirect to dashboard
    if (AUTH_ROUTES.includes(location.pathname) && isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // If on protected route but not authenticated, redirect to auth
    if (isProtected && !isAuthenticated) {
      navigate('/auth', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location.pathname]);

  return null;
}
