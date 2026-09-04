import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Calendar, Plus, Clock } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { FullPageSkeleton, ListSkeleton } from '@/components/Skeleton';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  PLANIFIED: '#3B82F6',
  ONGOING: '#1DB954',
  COMPLETED: '#808080',
  CANCELLED: '#E51332',
};

const STATUS_LABELS: Record<string, string> = {
  PLANIFIED: 'Planifié',
  ONGOING: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export default function Events() {
  const navigate = useNavigate();
  const { events, isLoading } = useLocalStore();

  if (isLoading) return <FullPageSkeleton />;

  const sortedEvents = [...events].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Événements" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-text-primary font-bold text-xl">Événements</h1>
            <p className="text-text-tertiary text-xs mt-0.5">{events.length} événement{events.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => navigate('/event/new')} className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}>
            <Plus className="w-4 h-4" /> Créer
          </button>
        </div>

        {sortedEvents.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Calendar className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
            <p className="text-text-tertiary text-sm mb-2">Aucun événement</p>
            <p className="text-text-tertiary text-xs mb-4">Planifiez vos prochaines célébrations</p>
            <button onClick={() => navigate('/event/new')} className="px-6 py-2.5 rounded-full text-sm font-medium text-white" style={{ backgroundColor: '#FF6B00' }}>
              Créer un événement
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event) => {
              const color = STATUS_COLORS[event.status] || '#808080';
              return (
                <button key={event.id} onClick={() => navigate(`/event/${event.id}`)} className="w-full text-left rounded-xl p-4 transition-all active:scale-95" style={{ backgroundColor: '#212121', border: '1px solid #282828' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                      <span className="text-lg">🎉</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-semibold truncate">{event.name}</p>
                      <p className="text-text-tertiary text-xs mt-0.5">
                        {formatDate(event.startDate)}{event.endDate ? ' → ' + formatDate(event.endDate) : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color, backgroundColor: color + '20' }}>
                          {STATUS_LABELS[event.status] || event.status}
                        </span>
                        {event.budgetItems?.length > 0 && (
                          <span className="text-xs text-text-tertiary">{event.budgetItems.length} poste{event.budgetItems.length > 1 ? 's' : ''}</span>
                        )}
                        {event.shoppingItems?.length > 0 && (
                          <span className="text-xs text-text-tertiary">{event.shoppingItems.length} article{event.shoppingItems.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <Clock className="w-4 h-4 text-text-tertiary flex-shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
