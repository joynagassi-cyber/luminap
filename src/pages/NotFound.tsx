import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-5">
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
        <h1 className="text-xl font-bold text-text-primary mb-2">Page introuvable</h1>
        <p className="text-text-tertiary text-sm mb-6">La page que vous recherchez n'existe pas.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-full text-sm font-semibold"
          style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
