import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Loader2 } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  const { loadInitialData, user } = useLocalStore();

  useEffect(() => {
    loadInitialData().then(() => {
      const storedRole = localStorage.getItem('lumina-role');
      if (storedRole && user.role !== storedRole) {
        navigate('/role-selection');
      } else if (storedRole) {
        navigate('/');
      } else {
        navigate('/login');
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <img src="/lumina-logo.png" alt="Lumina" className="w-16 h-16 mx-auto mb-4 rounded-xl" />
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: '#FF6B00' }} />
        <p className="text-text-tertiary text-sm">Chargement...</p>
      </div>
    </div>
  );
}
