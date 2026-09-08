import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { useEvents, useCotisations, useMembers } from '@/lib/dataLayer';
import { formatCurrencyCompact, formatDate } from '@/lib/utils';
import { calculerStatsCulte } from '@/lib/cotisation-logic';
import { COTISATION_STATUT_COLORS, COTISATION_STATUT_LABELS } from '@/lib/cotisation-logic';
import type { CotisationStatut } from '@/lib/cotisation-logic';
import { ArrowLeft, Users, CheckCircle, Clock } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import ConfirmModal from '@/components/ConfirmModal';
import { IonPage, IonHeader, IonContent, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/react';

export default function CulteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateCotisation } = useLocalStore();
  const { data: psEvents } = useEvents();
  const { data: psCotisations } = useCotisations();
  const { data: psMembers } = useMembers();

  const events = psEvents ?? [];
  const cotisations = psCotisations ?? [];
  const members = psMembers ?? [];

  const culte = events.find((e: any) => e.id === id);

  if (!culte) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/cotisations" />
            </IonButtons>
            <IonTitle>Détail du Culte</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
        <div className="min-h-screen bg-[#121212]" style={{ paddingTop: 64 }}>
          <TopHeader />
          <div className="p-4 text-center text-text-tertiary">
            <p className="font-semibold mb-2">Culte introuvable</p>
            <button
              onClick={() => navigate('/cotisations')}
              className="text-sm"
              style={{ color: '#FF6B00' }}
            >
              Retour aux cultes
            </button>
          </div>
          <BottomNav />
        </div>
        </IonContent>
      </IonPage>
    );
  }

  const stats = calculerStatsCulte({
    cotisations: cotisations.map((c: any) => ({
      ...c,
      culteId: c.culte_id,
      membreId: c.membre_id,
    })),
    culteId: id!,
  });

  const cotisationsForCulte = cotisations.filter(
    (c: any) => c.culte_id === id
  );

  const cotisationsWithMember = cotisationsForCulte.map((cot: any) => {
    const member = members.find((m: any) => m.id === cot.membre_id);
    return {
      ...cot,
      memberName: member ? (((member as any).last_name || '') + ' ' + ((member as any).first_name || '')).trim() || 'Inconnu' : 'Inconnu',
    };
  });

  const culteDate = (culte as any).start_date || (culte as any).startDate;
  const isVerouille = culteDate
    ? new Date().getTime() - new Date(culteDate).getTime() > 30 * 24 * 60 * 60 * 1000
    : false;

  const handlePaye = async (cotId: string, montantPaye: number) => {
    const now = new Date().toISOString();
    const statut: CotisationStatut = 'PAYE';
    await updateCotisation(cotId, { statut, montantPaye, datePaiement: now });
  };

  const handleAbsent = async (cotId: string) => {
    await updateCotisation(cotId, { statut: 'ABSENT' });
  };

  const [showMassPay, setShowMassPay] = useState(false);

  const handleMassPay = async () => {
    for (const cot of cotisationsWithMember) {
      if (cot.statut === 'NON_PAYE' || cot.statut === 'ABSENT') {
        await updateCotisation(cot.id, {
          statut: 'PAYE',
          montantPaye: cot.montantObligatoire || 0,
          datePaiement: new Date().toISOString(),
        });
      }
    }
    setShowMassPay(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/cotisations" />
          </IonButtons>
          <IonTitle>Détail du Culte</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
      <div className="min-h-screen bg-[#121212]" style={{ paddingTop: 64, paddingBottom: 72 }}>
        <TopHeader title="Détail du Culte" />

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-[#282828]">
        <button
          onClick={() => navigate('/cotisations')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ backgroundColor: '#212121' }}
        >
          <ArrowLeft className="w-4 h-4 text-text-secondary" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-text-primary font-bold text-base truncate">{culte.name}</h1>
          {culteDate && (
            <p className="text-text-tertiary text-xs mt-0.5">{formatDate(culteDate)}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-text-tertiary" />
            <span className="text-text-tertiary text-xs">Total membres</span>
          </div>
          <p className="text-text-primary font-bold text-lg">{stats.total}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-[#10B981]" />
            <span className="text-text-tertiary text-xs">Payés</span>
          </div>
          <p className="text-[#10B981] font-bold text-lg">{stats.paye}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[#808080]" />
            <span className="text-text-tertiary text-xs">Absents</span>
          </div>
          <p className="text-[#808080] font-bold text-lg">{stats.absent}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-[#EF4444]" />
            <span className="text-text-tertiary text-xs">Non payés</span>
          </div>
          <p className="text-[#EF4444] font-bold text-lg">{stats.nonPaye}</p>
        </div>
        <div className="col-span-2 rounded-xl p-3" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-text-tertiary text-xs">Total collecté</span>
          </div>
          <p className="text-text-primary font-bold text-xl">{formatCurrencyCompact(stats.totalCollecte)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 flex gap-2">
        <button
          onClick={() => setShowMassPay(true)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ backgroundColor: '#FF6B00', color: '#fff' }}
        >
          Paiement massif
        </button>
        <button
          onClick={() => navigate(`/saisie-rapide/${id}`)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ backgroundColor: '#212121', color: '#FF6B00', border: '1px solid #FF6B00' }}
        >
          Saisie rapide
        </button>
      </div>

      {/* Cotisations list */}
      <div className="px-4 py-2 space-y-2">
        <p className="text-text-tertiary text-xs font-semibold uppercase tracking-wide">
          Cotisations ({cotisationsWithMember.length})
        </p>
        {cotisationsWithMember.map((cot: any) => (
          <div
            key={cot.id}
            className="rounded-xl p-3 flex items-center gap-3"
            style={{ backgroundColor: '#212121' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: '#2a2a2a', color: COTISATION_STATUT_COLORS[cot.statut as CotisationStatut] || '#808080' }}
            >
              {(cot.memberName || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary font-semibold text-sm truncate">{cot.memberName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{ color: COTISATION_STATUT_COLORS[cot.statut as CotisationStatut] || '#808080' }}
                >
                  {COTISATION_STATUT_LABELS[cot.statut as CotisationStatut] || cot.statut}
                </span>
                {cot.montantPaye > 0 && (
                  <span className="text-text-tertiary text-xs">
                    {formatCurrencyCompact(cot.montantPaye)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              {(cot.statut === 'NON_PAYE' || cot.statut === 'ABSENT') && (
                <button
                  onClick={async () => {
                    await handlePaye(cot.id, cot.montantObligatoire || 0);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                  style={{ backgroundColor: '#10B981', color: '#fff' }}
                >
                  Payé
                </button>
              )}
              {cot.statut === 'NON_PAYE' && !isVerouille && (
                <button
                  onClick={async () => {
                    await handleAbsent(cot.id);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                  style={{ backgroundColor: '#2a2a2a', color: '#808080', border: '1px solid #3a3a3a' }}
                >
                  Absent
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mass payment dialog */}
      <ConfirmModal
        open={showMassPay}
        onClose={() => setShowMassPay(false)}
        onConfirm={handleMassPay}
        title="Paiement massif"
        description={`Payer tous les ${stats.nonPaye + stats.absent} membres non-payés ou absents pour ce culte ?`}
        confirmLabel="Payer tout"
        confirmVariant="primary"
      />

      <BottomNav />
      </div>
      </IonContent>
    </IonPage>
  );
}
