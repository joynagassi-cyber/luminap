import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Redirects to /splash on every app load to ensure the splash screen
 * always runs first and handles routing logic.
 */
export default function AppEntrypoint() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we're at the root path (initial app load)
    if (location.pathname === '/') {
      navigate('/splash', { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
