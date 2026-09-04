import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { formatDate } from '@/lib/utils';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events } = useLocalStore();
  const event = events.find(e => e.id === id);

  if (!event) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-text-tertiary">Événement introuvable</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title={event.name} />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="rounded-xl p-5 mb-6 text-center" style={{ backgroundColor: '#212121' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#FF6B0020' }}>
            <span className="text-3xl">🎉</span>
          </div>
          <h1 className="text-text-primary font-bold text-xl mb-1">{event.name}</h1>
          <p className="text-text-tertiary text-sm">{event.description || 'Pas de description'}</p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Calendar className="w-5 h-5 text-text-tertiary flex-shrink-0" />
            <div>
              <p className="text-text-tertiary text-xs">Début</p>
              <p className="text-text-primary text-sm font-medium">{formatDate(event.startDate)}</p>
            </div>
          </div>
          {event.endDate && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#212121' }}>
              <Clock className="w-5 h-5 text-text-tertiary flex-shrink-0" />
              <div>
                <p className="text-text-tertiary text-xs">Fin</p>
                <p className="text-text-primary text-sm font-medium">{formatDate(event.endDate)}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Tag className="w-5 h-5 text-text-tertiary flex-shrink-0" />
            <div>
              <p className="text-text-tertiary text-xs">Budget</p>
              <p className="text-text-primary text-sm font-medium">{event.budget > 0 ? `${event.budget.toLocaleString()} FCFA` : 'Non défini'}</p>
            </div>
          </div>
        </div>

        <button onClick={() => navigate(-1)} className="w-full py-3 rounded-full font-medium text-sm" style={{ backgroundColor: '#212121', color: '#B3B3B3' }}>
          Fermer
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
