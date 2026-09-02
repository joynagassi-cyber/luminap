import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Plus, BarChart3, Settings, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import BottomDrawer from './BottomDrawer';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Accueil', icon: Home },
  { path: '/finance', label: 'Finance', icon: BookOpen },
  { path: '/transaction/new', label: 'Ajouter', icon: Plus },
  { path: '/history', label: 'Historique', icon: BarChart3 },
  { path: '/settings', label: 'Réglages', icon: Settings },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 flex items-center justify-around z-50"
        style={{
          backgroundColor: '#212121',
          borderTop: '1px solid #282828',
          minHeight: '64px',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/transaction/new' && location.pathname.startsWith('/transaction/'));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 active:scale-95 transition-transform"
            >
              <Icon
                className="w-5 h-5"
                strokeWidth={isActive ? 2.5 : 2}
                style={{ color: isActive ? '#FF6B00' : '#808080' }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: isActive ? '#FF6B00' : '#808080' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More button → drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-1 px-4 py-2 active:scale-95 transition-transform"
        >
          <MoreHorizontal className="w-5 h-5 text-text-tertiary" />
          <span className="text-xs font-medium text-text-tertiary">Plus</span>
        </button>
      </nav>

      <BottomDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
