import { useNavigate, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Building2, Settings, MoreHorizontal, Calendar } from 'lucide-react';
import { useState } from 'react';
import BottomDrawer from './BottomDrawer';
import { useState as useStateReact } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Accueil', icon: Home },
  { path: '/finance', label: 'Finance', icon: TrendingUp },
  { path: '/groups', label: 'Groupes', icon: Building2 },
  { path: '/settings', label: 'Réglages', icon: Settings },
];

// Extra features that go into the "Plus" drawer
const EXTRA_FEATURES: { path: string; label: string; icon: typeof Calendar; color: string }[] = [
  { path: '/events', label: 'Événements', icon: Calendar, color: '#FF6B00' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useStateReact(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          backgroundColor: '#212121',
          borderTop: '1px solid #282828',
          minHeight: '64px',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 active:scale-95 transition-transform"
            >
              <div className="relative">
                <Icon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{ color: isActive ? '#FF6B00' : '#808080' }}
                />
              </div>
              <span
                className="text-xs font-medium"
                style={{ color: isActive ? '#FF6B00' : '#808080' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 active:scale-95 transition-transform"
        >
          <MoreHorizontal className="w-5 h-5" style={{ color: location.pathname.startsWith('/events') ? '#FF6B00' : '#808080' }} />
          <span className="text-xs font-medium" style={{ color: location.pathname.startsWith('/events') ? '#FF6B00' : '#808080' }}>Plus</span>
        </button>
      </nav>

      {/* Floating "+" button */}
      <button
        onClick={() => navigate('/transaction/new')}
        className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform hover:scale-105"
        style={{
          bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#FF6B00',
          color: '#FFFFFF',
        }}
        aria-label="Nouvelle transaction"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <BottomDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} extraFeatures={EXTRA_FEATURES} />
    </>
  );
}
