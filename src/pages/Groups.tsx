import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Users } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function Groups() {
  const navigate = useNavigate();
  const { orgUnits, caisses } = useLocalStore();

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Groupes" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <h1 className="text-text-primary font-bold text-xl mb-5">Groupes organisationnels</h1>
        <div className="space-y-3">
          {orgUnits.map((ou) => {
            const caisse = caisses.find(c => c.id === ou.id);
            const approvedTxs = caisse ? caisses.map(c => c.id === ou.id ? [] : []).flat() : [];
            return (
              <button
                key={ou.id}
                onClick={() => navigate(`/groups/${ou.id}`)}
                className="w-full text-left rounded-xl p-4 flex items-center gap-4 transition-all active:scale-95"
                style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (caisse?.color || '#808080') + '20' }}>
                  <span className="text-lg">{caisse?.color === '#3B82F6' ? '👔' : caisse?.color === '#8B5CF6' ? '👦' : caisse?.color === '#EC4899' ? '👩' : caisse?.color === '#14B8A6' ? '👨' : caisse?.color === '#F59E0B' ? '🎵' : '👥'}</span>
                </div>
                <div className="flex-1">
                  <p className="text-text-primary font-semibold">{ou.name}</p>
                  <p className="text-text-tertiary text-xs mt-0.5">{caisse ? `${caisse.name} · ${caisse.description}` : ou.description}</p>
                </div>
                <Users className="w-4 h-4 text-text-tertiary" />
              </button>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
