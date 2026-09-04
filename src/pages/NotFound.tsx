import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-5">
      <div className="text-center">
        <p className="text-6xl font-black mb-4" style={{ color: '#FF6B00' }}>404</p>
        <p className="text-text-primary font-bold text-xl mb-2">Page introuvable</p>
        <p className="text-text-tertiary text-sm mb-8">La page que vous recherchez n'existe pas.</p>
        <button onClick={() => navigate('/')} className="px-8 py-3 rounded-full font-semibold text-white" style={{ backgroundColor: '#FF6B00' }}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
