import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import BottomNav from '@/components/BottomNav';

export default function Groups() {
  const navigate = useNavigate();
  const { orgUnits } = useStore();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
            <Building2 className="w-5 h-5 text-text-primary" />
          </button>
          <h1 className="text-xl font-bold text-text-primary">Groupes organisationnels</h1>
        </div>

        {orgUnits.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
            <p className="text-text-tertiary text-sm">Les groupes sont créés par l'administrateur.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6 pb-20">
            {orgUnits.map((unit) => (
              <button key={unit.id} onClick={() => navigate('/finance')} className="w-full flex items-center gap-3 p-4 rounded-lg transition-colors text-left active:bg-surface-active" style={{ backgroundColor: '#212121', minHeight: '56px' }}>
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

      <BottomNav />
    </div>
  );
}
