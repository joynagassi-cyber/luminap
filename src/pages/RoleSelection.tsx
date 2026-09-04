import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ChevronLeft, Wallet, Church, ClipboardList, BarChart3, Banknote, PenTool } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import LuminaLogo from '@/components/LuminaLogo';

export default function RoleSelection() {
  const navigate = useNavigate();
  const { user, selectRole, appConfig } = useLocalStore();
  const [loading, setLoading] = useState<string | null>(null);
  const churchName = appConfig.churchName || 'Église MFE-JC Centrale';

  const roles = [
    { id: 'TREASURIER', label: 'Trésorier', desc: 'Gestion complète des finances', icon: Wallet, iconColor: '#1DB954' },
    { id: 'PASTEUR', label: 'Pasteur', desc: 'Vue d\'ensemble et validation', icon: Church, iconColor: '#FF6B00' },
    { id: 'SECRETAIRE', label: 'Secrétaire', desc: 'Gestion des événements', icon: ClipboardList, iconColor: '#8B5CF6' },
    { id: 'COMPTABLE', label: 'Comptable', desc: 'Bilans et grand livre', icon: BarChart3, iconColor: '#3B82F6' },
    { id: 'TREASURIER_ADJOINT', label: 'Trésorier Adjoint', desc: 'Assistance trésorerie', icon: Banknote, iconColor: '#14B8A6' },
    { id: 'SECRETAIRE_ADJOINT', label: 'Secrétaire Adjoint', desc: 'Assistance secrétariat', icon: PenTool, iconColor: '#EC4899' },
  ];

  const handleSelect = async (roleId: string) => {
    setLoading(roleId);
    try {
      await selectRole(roleId as any);
      navigate('/');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header with logo */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-24">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)', boxShadow: '0 8px 24px rgba(255,107,0,0.3)' }}>
                <LuminaLogo size={48} />
              </div>
            </div>
            <h1 className="text-text-primary text-2xl font-bold mb-1">Lumina</h1>
            <p className="text-text-tertiary text-sm">{churchName}</p>
            <p className="text-text-tertiary text-xs mt-1">Gestion financière de l'église</p>
          </div>

          <h2 className="text-text-primary font-bold text-xl mb-2 text-center">Choisissez votre rôle</h2>
          <p className="text-text-tertiary text-sm text-center mb-8">Cela déterminera vos permissions dans l'application.</p>

          <div className="space-y-3">
            {roles.map(({ id, label, desc, icon: Icon, iconColor }) => (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                disabled={loading !== null && loading !== id}
                className="w-full text-left rounded-xl p-4 transition-all active:scale-95 flex items-center gap-4"
                style={{ backgroundColor: '#212121', border: user.role === id ? '1px solid #FF6B00' : '1px solid #282828' }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: user.role === id ? iconColor + '20' : '#282828' }}>
                  {loading === id ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#FF6B00] border-t-transparent" style={{ animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <Icon className="w-6 h-6" style={{ color: user.role === id ? iconColor : '#808080' }} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-text-primary font-semibold">{label}</p>
                  <p className="text-text-tertiary text-xs">{desc}</p>
                </div>
                {user.role === id && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>Actif</span>}
              </button>
            ))}
          </div>

          <p className="text-text-tertiary text-xs text-center mt-8">
            Accès direct — aucune authentification requise
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
