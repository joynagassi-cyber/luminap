import { useNavigate } from 'react-router-dom';
import { LogOut, User, Bell, Shield } from 'lucide-react';
import { useStore } from '@/store/useStore';
import BottomNav from '@/components/BottomNav';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useStore();

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 pt-6 pb-4">
        {/* Header */}
        <h1 className="text-xl font-bold text-text-primary mb-6">Paramètres</h1>

        {/* Profile Card */}
        <div className="rounded-xl p-4 mb-5 flex items-center gap-4" style={{ backgroundColor: '#181818' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-semibold text-lg truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-text-tertiary text-sm truncate">{user?.email}</p>
            <p className="text-text-tertiary text-xs mt-1 capitalize">{user?.role?.toLowerCase()}</p>
          </div>
        </div>

        {/* Menu Items */}
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">Compte</p>
        <div className="space-y-2 mb-5">
          {[
            { icon: User, label: 'Profil', desc: 'Modifier vos informations' },
            { icon: Bell, label: 'Notifications', desc: 'Gérer les alertes' },
            { icon: Shield, label: 'Sécurité', desc: 'Mot de passe et authentification' },
          ].map((item) => (
            <button key={item.label} className="w-full flex items-center gap-4 p-4 rounded-lg transition-colors text-left active:bg-surface-active" style={{ backgroundColor: '#181818' }}>
              <item.icon className="w-5 h-5 text-text-tertiary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-text-primary font-medium text-base">{item.label}</p>
                <p className="text-text-tertiary text-sm">{item.desc}</p>
              </div>
              <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Organization */}
        <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2">Organisation</p>
        <div className="rounded-lg p-4 mb-5" style={{ backgroundColor: '#181818' }}>
          <p className="text-text-primary font-semibold">{user?.org.name}</p>
          <p className="text-text-tertiary text-sm mt-1 capitalize">{user?.org.type}</p>
        </div>

        {/* Logout */}
        <button onClick={async () => { logout(); navigate('/login'); }} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-semibold transition-all active:scale-95" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
          <LogOut className="w-5 h-5" />Se déconnecter
        </button>

        <p className="text-text-tertiary text-xs text-center mt-6 pb-6">Lumina v1.0 · Église MFE-JC Centrale</p>
      </div>

      <BottomNav />
    </div>
  );
}
