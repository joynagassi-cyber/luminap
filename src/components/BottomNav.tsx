import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, BarChart3, Settings, Bell } from 'lucide-react';
import { useState as useStateReact } from 'react';
import BottomDrawer from './BottomDrawer';
import { useLocalStore } from '@/store/useLocalStore';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}

const NAV_ITEMS: Omit<NavItem, 'badge'>[] = [
  { path: '/', label: 'Accueil', icon: Home },
  { path: '/finance', label: 'Finance', icon: BookOpen },
  { path: '/history', label: 'Historique', icon: BarChart3 },
  { path: '/settings', label: 'Réglages', icon: Settings },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useStateReact(false);
  const { notifications, getUnreadCount } = useLocalStore();
  const unreadCount = getUnreadCount();

  const navItems = NAV_ITEMS.map(item => ({
    ...item,
    badge: item.path === '/finance' ? 0 : 0,
  }));

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
        {navItems.map((item) => {
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

        {/* Notifications button */}
        <button
          onClick={() => navigate('/notifications')}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 active:scale-95 transition-transform relative"
        >
          <div className="relative">
            <Bell className="w-5 h-5" style={{ color: '#808080' }} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-medium" style={{ color: '#808080' }}>Alertes</span>
        </button>

        {/* More button → drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 active:scale-95 transition-transform"
        >
          <svg className="w-5 h-5 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span className="text-xs font-medium text-text-tertiary">Plus</span>
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

      <BottomDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
