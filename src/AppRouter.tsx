import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * On initial load at '/', redirects to /splash so the splash screen
 * always runs first. Uses a one-time sessionStorage flag to prevent
 * redirect loops when navigating between pages.
 */
export default function AppRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/' && !sessionStorage.getItem('lumina-visited')) {
      sessionStorage.setItem('lumina-visited', '1');
      navigate('/splash', { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
