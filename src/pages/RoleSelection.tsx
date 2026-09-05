import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Wallet, Church, ClipboardList, BarChart3, Banknote, PenTool } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function RoleSelection() {
  const navigate = useNavigate();
  const { user, selectRole, appConfig, loadInitialData } = useLocalStore();
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
      localStorage.setItem('lumina-onboarded', 'true');
      await loadInitialData();
      navigate('/', { replace: true });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      {/* Top header bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <img src="/lumina-logo.png" alt="Lumina" className="w-10 h-10 object-contain" />
        <div className="text-right">
          <p className="text-white text-sm font-semibold">{churchName}</p>
          <p className="text-[#808080] text-xs">Gestion financière</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-24 pt-2">
        <div className="max-w-sm mx-auto">
          <h1 className="text-white font-bold text-xl mb-1">Choisissez votre rôle</h1>
          <p className="text-[#808080] text-sm mb-6">Cela déterminera vos permissions dans l&apos;application.</p>

          <div className="space-y-2">
            {roles.map(({ id, label, desc, icon: Icon, iconColor }) => (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                disabled={loading !== null && loading !== id}
                className="w-full text-left rounded-xl p-4 transition-all active:scale-95 flex items-center gap-4"
                style={{ backgroundColor: '#181818', border: user.role === id ? '1px solid #FF6B00' : '1px solid #282828' }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: user.role === id ? iconColor + '20' : '#212121' }}>
                  {loading === id ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#FF6B00] border-t-transparent animate-spin" />
                  ) : (
                    <Icon className="w-5 h-5" style={{ color: user.role === id ? iconColor : '#808080' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-[#808080] text-xs truncate">{desc}</p>
                </div>
                {user.role === id && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}>
                    Actif
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="text-[#808080] text-xs text-center mt-8">
            Accès direct — aucune authentification requise
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
