import { Home, Landmark, Users, CalendarPlus, HelpCircle, BookOpen, History, Send, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { icon: Home, label: 'Accueil', path: '/' },
  { icon: Landmark, label: 'Finances', path: '/finance' },
  { icon: Users, label: 'Groupes', path: '/groups' },
  { icon: CalendarPlus, label: 'Événements', path: '/events' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 pt-1" style={{ backgroundColor: 'rgba(18,18,18,0.97)', backdropFilter: 'blur(10px)', borderTop: '1px solid #282828' }}>
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <button key={path} onClick={() => navigate(path)} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0">
              <Icon className={`w-5 h-5 ${isActive ? '' : 'opacity-60'}`} style={isActive ? { color: '#FF6B00' } : { color: '#808080' }} />
              <span className="text-xs font-medium" style={isActive ? { color: '#FF6B00' } : { color: '#808080' }}>{label}</span>
            </button>
          );
        })}
        {/* Plus button */}
        <button
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0"
        >
          <div className="relative" style={{ opacity: location.pathname.startsWith('/settings') || location.pathname === '/tutoriel' ? 1 : 0.6 }}>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center -mt-3 mx-auto"
              style={{
                background: 'linear-gradient(135deg, #FF8533 0%, #FF6B00 50%, #CC5500 100%)',
                boxShadow: '0 4px 12px rgba(255,107,0,0.3)',
              }}
            >
              <span className="text-white text-lg font-bold">+</span>
            </div>
          </div>
          <span className="text-xs font-medium" style={{ color: location.pathname.startsWith('/settings') ? '#FF6B00' : '#808080' }}>Plus</span>
        </button>
      </div>
    </div>
  );
}
