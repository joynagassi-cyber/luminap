import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useCotisations, useEvents } from '@/lib/dataLayer';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { Calendar, CheckCircle, Clock, Plus, Users } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { IonPage, IonHeader, IonContent, IonTitle, IonToolbar } from '@ionic/react';

interface CulteStat {
  culteId: string;
  name: string;
  startDate: string;
  totalMembers: number;
  paid: number;
  absent: number;
  unpaid: number;
  inAdvance: number;
  totalCollected: number;
  expectedTotal: number;
}

export default function Cotisations() {
  const navigate = useNavigate();
  const { members, isLoading: storeLoading } = useLocalStore();
  const { data: psEvents } = useEvents();
  const { data: psCotisations } = useCotisations();

  const events = psEvents ?? [];
  const cotisations = psCotisations ?? [];

  const culteStats = useMemo(() => {
    const culteEvents = events.filter((e: any) => e.type === 'CULTE');

    return culteEvents.map((culte: any) => {
      const culteCotisations = cotisations.filter((c: any) => c.culte_id === culte.id);
      const totalMembers = culteCotisations.length;
      const paid = culteCotisations.filter((c: any) => c.statut === 'PAYE').length;
      const absent = culteCotisations.filter((c: any) => c.statut === 'ABSENT').length;
      const unpaid = culteCotisations.filter((c: any) => c.statut === 'NON_PAYE').length;
      const inAdvance = culteCotisations.filter((c: any) => c.statut === 'EN_AVANCE').length;
      const totalCollected = culteCotisations.reduce((s: number, c: any) => s + (c.montantPaye || 0), 0);
      const expectedTotal = culteCotisations.reduce((s: number, c: any) => s + (c.montantObligatoire || 0), 0);

      return {
        culteId: culte.id,
        name: culte.name,
        startDate: culte.start_date,
        totalMembers,
        paid,
        absent,
        unpaid,
        inAdvance,
        totalCollected,
        expectedTotal,
      };
    });
  }, [events, cotisations]);

  if (storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#121212' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Cotisations</IonTitle></IonToolbar></IonHeader>
      <IonContent className="bg-canvas">
    <div className="min-h-screen" style={{ background: '#121212' }}>
      <TopHeader title="Cotisations" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-bold text-xl" style={{ color: '#FFFFFF' }}>Cotisations</h1>
            <p className="text-xs mt-0.5" style={{ color: '#888888' }}>
              {culteStats.length} culte{culteStats.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/event/new', { state: { defaultType: 'CULTE' } })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', boxShadow: '0 4px 12px rgba(255,107,0,0.3)' }}
          >
            <Plus className="w-4 h-4" />
            Nouveau culte
          </button>
        </div>

        {culteStats.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ background: '#212121' }}>
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" style={{ color: '#888888' }} />
            <p className="text-sm mb-2" style={{ color: '#888888' }}>Aucun culte</p>
            <p className="text-xs mb-4" style={{ color: '#666666' }}>
              Créez votre premier culte pour suivre les cotisations
            </p>
            <button
              onClick={() => navigate('/event/new', { state: { defaultType: 'CULTE' } })}
              className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
              style={{ background: '#FF6B00' }}
            >
              Créer un culte
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {culteStats.map((stat) => {
              const progress = stat.expectedTotal > 0 ? (stat.totalCollected / stat.expectedTotal) * 100 : 0;
              return (
                <button
                  key={stat.culteId}
                  onClick={() => navigate(`/saisie-rapide/${stat.culteId}`)}
                  className="w-full text-left rounded-xl p-4 transition-all active:scale-95"
                  style={{ background: '#212121', border: '1px solid #282828' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,107,0,0.15)' }}>
                      <Calendar className="w-5 h-5" style={{ color: '#FF6B00' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#FFFFFF' }}>{stat.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#888888' }}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDate(stat.startDate)}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="flex items-center gap-1" style={{ color: '#1DB954' }}>
                          <CheckCircle className="w-3 h-3" />
                          {stat.paid}/{stat.totalMembers}
                        </span>
                        {stat.unpaid > 0 && (
                          <span style={{ color: '#FF6B00' }}>{stat.unpaid} impayés</span>
                        )}
                        {stat.absent > 0 && (
                          <span style={{ color: '#808080' }}>{stat.absent} absent</span>
                        )}
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span style={{ color: '#888888' }}>Collecté</span>
                          <span className="font-semibold" style={{ color: '#1DB954' }}>
                            {formatCurrencyCompact(stat.totalCollected)} F
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#333333' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(progress, 100)}%`,
                              background: progress >= 100 ? '#1DB954' : '#FF6B00',
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span style={{ color: '#666666' }}>Objectif</span>
                          <span style={{ color: '#666666' }}>{formatCurrencyCompact(stat.expectedTotal)} F</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
      </IonContent>
    </IonPage>
  );
}
