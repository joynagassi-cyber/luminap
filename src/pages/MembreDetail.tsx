import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useEvents, useCotisations } from '@/lib/dataLayer';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { calculerNombreRetards } from '@/lib/cotisation-logic';
import { ArrowLeft, CheckCircle, Clock, User } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { Progress } from '@/components/ui/progress';
import type { Member, Cotisation } from '@/types';

const COTISATION_STATUT_LABEL: Record<string, string> = {
  NON_PAYE: 'Non paye',
  PAYE: 'Paye',
  ABSENT: 'Absent',
  EN_AVANCE: 'En avance',
};

const COTISATION_STATUT_COLOR: Record<string, string> = {
  NON_PAYE: '#EF4444',
  PAYE: '#10B981',
  ABSENT: '#808080',
  EN_AVANCE: '#3B82F6',
};

export default function MembreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useLocalStore();
  const { data: psEvents } = useEvents();
  const { data: psCotisations } = useCotisations();

  const allMembers = store.members;
  const events = psEvents ?? store.events;
  const cotisations = psCotisations ?? store.cotisations;

  const member = allMembers.find((m: Member) => m.id === id) ?? null;

  if (!member) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#121212' }}>
        <TopHeader title="" />
        <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
          <button onClick={() => navigate('/members')} className="flex items-center gap-2 mb-5" style={{ color: '#B3B3B3' }}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="text-center py-10 rounded-xl" style={{ backgroundColor: '#1e1e1e' }}>
            <User className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-30" />
            <p className="text-text-tertiary text-sm">Membre introuvable</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const fullName = `${member.firstName || ''} ${member.lastName || ''}`.trim();
  const memberCotisations = cotisations.filter(c => c.membreId === member.id);
  const memberEvents = events.filter(e => e.type === 'CULTE');

  const payeCount = memberCotisations.filter(c => c.statut === 'PAYE' || c.statut === 'EN_AVANCE').length;
  const absentCount = memberCotisations.filter(c => c.statut === 'ABSENT').length;
  const totalDons = member.totalDons || 0;
  const nombreRetards = calculerNombreRetards({
    cultes: memberEvents,
    cotisations: memberCotisations,
    dateAdhesion: member.joinedAt,
  });
  const totalCultes = memberEvents.length;
  const cadence = totalCultes > 0 ? Math.round((payeCount / totalCultes) * 100) : 0;

  const historique = store.getMembreHistorique(member.id);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#121212' }}>
      <TopHeader title="Membre" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
        {/* Back button */}
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 mb-5"
          style={{ color: '#B3B3B3' }}
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Header gradient card */}
        <div
          className="rounded-2xl p-5 mb-5 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #121212 60%)',
            border: '1px solid #282828',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #FF8533)' }}
            >
              <span className="text-white text-base font-bold">
                {(member.firstName || '').charAt(0)}{(member.lastName || '').charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{fullName}</p>
              {member.phone && (
                <p className="text-text-tertiary text-xs">{member.phone}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: '#10B98115' }}>
              <CheckCircle className="w-4 h-4 mx-auto mb-1" style={{ color: '#10B981' }} />
              <p className="text-white font-bold text-sm">{payeCount}</p>
              <p className="text-text-tertiary text-xs">Cultes</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: '#EF444415' }}>
              <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: '#EF4444' }} />
              <p className="text-white font-bold text-sm">{nombreRetards}</p>
              <p className="text-text-tertiary text-xs">Retards</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: '#80808015' }}>
              <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: '#808080' }} />
              <p className="text-white font-bold text-sm">{absentCount}</p>
              <p className="text-text-tertiary text-xs">Absences</p>
            </div>
            <div className="text-center p-2 rounded-xl" style={{ backgroundColor: '#FF6B0015' }}>
              <p className="text-white font-bold text-sm">{formatCurrencyCompact(totalDons)}</p>
              <p className="text-text-tertiary text-xs">Dons</p>
            </div>
          </div>

          {/* Cadence progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-text-tertiary text-xs">Cadence</span>
              <span className="text-white text-xs font-bold">{cadence}%</span>
            </div>
            <Progress value={cadence} className="h-2" />
          </div>
        </div>

        {/* Cotisations history */}
        <div className="mb-4">
          <h2 className="text-text-primary font-bold text-sm mb-3">Historique des cotisations</h2>
          {historique.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: '#1e1e1e' }}>
              <Clock className="w-8 h-8 mx-auto mb-2 text-text-tertiary opacity-30" />
              <p className="text-text-tertiary text-sm">Aucune cotisation</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historique.map(({ cotisation, culte }) => (
                <div
                  key={cotisation.id}
                  className="rounded-xl p-3.5 flex items-center gap-3"
                  style={{ backgroundColor: '#1e1e1e', border: '1px solid #282828' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (COTISATION_STATUT_COLOR[cotisation.statut] || '#808080') + '20' }}
                  >
                    {cotisation.statut === 'PAYE' || cotisation.statut === 'EN_AVANCE' ? (
                      <CheckCircle className="w-4 h-4" style={{ color: COTISATION_STATUT_COLOR[cotisation.statut] }} />
                    ) : (
                      <Clock className="w-4 h-4" style={{ color: COTISATION_STATUT_COLOR[cotisation.statut] }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-text-primary text-sm font-medium truncate">
                        {culte?.name || 'Culte'}
                      </p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: (COTISATION_STATUT_COLOR[cotisation.statut] || '#808080') + '20',
                          color: COTISATION_STATUT_COLOR[cotisation.statut] || '#808080',
                        }}
                      >
                        {COTISATION_STATUT_LABEL[cotisation.statut] || cotisation.statut}
                      </span>
                    </div>
                    <p className="text-text-tertiary text-xs">{formatDate(culte?.startDate || cotisation.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-text-primary text-sm font-bold">
                      {formatCurrencyCompact(cotisation.montantPaye)} F
                    </p>
                    {cotisation.montantPaye > cotisation.montantObligatoire && (
                      <p className="text-xs" style={{ color: '#FF6B00' }}>
                        +{formatCurrencyCompact(cotisation.montantPaye - cotisation.montantObligatoire)} don
                      </p>
                    )}
                    {cotisation.montantPaye < cotisation.montantObligatoire && cotisation.statut === 'NON_PAYE' && (
                      <p className="text-xs text-text-tertiary">
                        Due: {formatCurrencyCompact(cotisation.montantObligatoire)} F
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
