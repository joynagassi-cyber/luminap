import { useNavigate, useLocation } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Groups() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgUnits } = useStore();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-text-primary mb-5">Groupes</h1>

        {orgUnits.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
            <p className="text-text-tertiary text-sm">Les groupes sont créés par l'administrateur.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6 pb-20">
            {orgUnits.map((unit) => (
              <button key={unit.id} onClick={() => navigate('/finance')} className="w-full flex items-center gap-3 p-4 bg-surface hover:bg-surface-hover rounded-lg transition-colors text-left" style={{ minHeight: '56px' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                  <Building2 className="w-5 h-5" style={{ color: '#FF6B00' }} />
                </div>
                <div className="flex-1">
                  <p className="text-text-primary font-semibold text-base">{unit.name}</p>
                  <p className="text-text-tertiary text-sm capitalize">{unit.type}</p>
                </div>
                <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around" style={{ backgroundColor: '#181818', borderTop: '1px solid #282828', minHeight: '64px', zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { path: '/', label: 'Accueil', icon: '🏠' },
          { path: '/finance', label: 'Finance', icon: '📊' },
          { path: '/transaction/new', label: 'Ajouter', icon: '➕' },
          { path: '/groups', label: 'Groupes', icon: '👥' },
          { path: '/settings', label: 'Réglages', icon: '⚙️' },
        ].map((tab) => (
          <button key={tab.path} onClick={() => navigate(tab.path)} className="flex flex-col items-center justify-center gap-1 px-4" style={{ minHeight: '44px' }}>
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-medium" style={{ color: location.pathname === tab.path ? '#FF6B00' : '#808080' }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
