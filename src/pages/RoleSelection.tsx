import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ChevronLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function RoleSelection() {
  const navigate = useNavigate();
  const { user, selectRole } = useLocalStore();

  const roles = [
    { id: 'TREASURIER', label: 'Trésorier', desc: 'Gestion complète des finances' },
    { id: 'PASTEUR', label: 'Pasteur', desc: 'Vue d\'ensemble et validation' },
    { id: 'SECRETAIRE', label: 'Secrétaire', desc: 'Gestion des événements' },
    { id: 'COMPTABLE', label: 'Comptable', desc: 'Bilans et grand livre' },
    { id: 'TREASURIER_ADJOINT', label: 'Trésorier Adjoint', desc: 'Assistance trésorerie' },
    { id: 'SECRETAIRE_ADJOINT', label: 'Secrétaire Adjoint', desc: 'Assistance secrétariat' },
  ];

  const handleSelect = async (roleId: string) => {
    await selectRole(roleId as any);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Rôle" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-text-secondary text-sm mb-6">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>

        <h1 className="text-text-primary font-bold text-2xl mb-2">Choisissez votre rôle</h1>
        <p className="text-text-tertiary text-sm mb-8">Cela déterminera vos permissions dans l'application.</p>

        <div className="space-y-3">
          {roles.map(({ id, label, desc }) => (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className="w-full text-left rounded-xl p-4 transition-all active:scale-95 flex items-center gap-4"
              style={{ backgroundColor: '#212121', border: user.role === id ? '1px solid #FF6B00' : '1px solid #282828' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: user.role === id ? '#FF6B0020' : '#282828' }}>
                <span className="text-xl">{id === 'TREASURIER' ? '💰' : id === 'PASTEUR' ? '✝️' : id === 'SECRETAIRE' ? '📋' : id === 'COMPTABLE' ? '📊' : id === 'TREASURIER_ADJOINT' ? '💵' : '📝'}</span>
              </div>
              <div>
                <p className="text-text-primary font-semibold">{label}</p>
                <p className="text-text-tertiary text-xs">{desc}</p>
              </div>
              {user.role === id && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>Actif</span>}
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
