import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { HelpCircle, Info, Shield, Database } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function Help() {
  const navigate = useNavigate();
  const { user } = useLocalStore();

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Aide" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <h1 className="text-text-primary font-bold text-xl mb-6">Aide & Informations</h1>

        <div className="space-y-4 mb-8">
          {[
            { icon: Info, title: 'Comment utiliser Lumina', desc: 'Ajoutez des transactions, gérez vos caisses et effectuez des versements entre groupes.' },
            { icon: Shield, title: 'Sécurité des données', desc: 'Vos données sont stockées localement sur votre appareil. Elles ne quittent jamais votre téléphone.' },
            { icon: Database, title: 'Synchronisation', desc: 'Quand vous êtes en ligne, les données sont synchronisées avec le cloud pour accès multi-appareil.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: '#212121' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF6B0020' }}>
                <Icon className="w-5 h-5" style={{ color: '#FF6B00' }} />
              </div>
              <div>
                <p className="text-text-primary font-semibold text-sm">{title}</p>
                <p className="text-text-tertiary text-xs mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#212121' }}>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5" style={{ color: '#FF6B00' }} />
            <span className="text-text-primary font-semibold">Rôles disponibles</span>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { role: 'TREASURIER', desc: 'Accès complet aux transactions et caisses' },
              { role: 'PASTEUR', desc: 'Consultation des finances et validation' },
              { role: 'SECRETAIRE', desc: 'Gestion des événements et groupes' },
              { role: 'COMPTABLE', desc: 'Accès au grand livre et bilans' },
              { role: 'TREASURIER_ADJOINT', desc: 'Assiste le trésorier principal' },
              { role: 'SECRETAIRE_ADJOINT', desc: 'Assiste le secrétaire' },
            ].map(({ role, desc }) => (
              <div key={role} className="flex justify-between">
                <span className="text-text-secondary">{role.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="text-text-tertiary text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-text-tertiary text-xs text-center">Lumina v1.0 · Église MFE-JC Centrale</p>
      </div>
      <BottomNav />
    </div>
  );
}
