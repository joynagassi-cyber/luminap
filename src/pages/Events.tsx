import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Calendar, Plus } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function Events() {
  const navigate = useNavigate();
  const { events } = useLocalStore();

  const statusColors: Record<string, string> = {
    PLANIFIED: '#3B82F6',
    ONGOING: '#1DB954',
    COMPLETED: '#808080',
    CANCELLED: '#E51332',
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Événements" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-text-primary font-bold text-xl">Événements</h1>
          <button onClick={() => navigate('/event/new')} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B00' }}>
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Calendar className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-50" />
            <p className="text-text-tertiary text-sm mb-4">Aucun événement</p>
            <button onClick={() => navigate('/event/new')} className="px-6 py-2.5 rounded-full text-sm font-medium" style={{ backgroundColor: '#FF6B00', color: '#fff' }}>
              Créer un événement
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <button key={event.id} onClick={() => navigate(`/event/${event.id}`)} className="w-full text-left rounded-xl p-4 transition-all active:scale-95" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (statusColors[event.status] || '#808080') + '20' }}>
                    <span className="text-lg">📅</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-semibold truncate">{event.name}</p>
                    <p className="text-text-tertiary text-xs mt-0.5">{event.startDate.split('T')[0]}{event.endDate ? ' → ' + event.endDate.split('T')[0] : ''}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: statusColors[event.status], backgroundColor: (statusColors[event.status] || '#808080') + '20' }}>
                    {event.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
