import { Home, Landmark, Users, CalendarPlus, MoreVertical, Settings, FileText, BookOpen, History, ClipboardList, Tag, BarChart3, Archive, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

const NAV_ITEMS = [
  { icon: Home, label: 'Accueil', path: '/' },
  { icon: Landmark, label: 'Finances', path: '/finance' },
  { icon: Users, label: 'Groupes', path: '/groups' },
  { icon: CalendarPlus, label: 'Événements', path: '/events' },
];

const MORE_ACTIONS = [
  { icon: Users, label: 'Membres', path: '/members' },
  { icon: ClipboardList, label: 'Formulaires', path: '/forms' },
  { icon: Tag, label: 'Champs perso.', path: '/custom-fields' },
  { icon: BarChart3, label: 'Rapports', path: '/reports' },
  { icon: Archive, label: 'Archives', path: '/archives' },
  { icon: FileText, label: 'Bilan', path: '/balance' },
  { icon: History, label: 'Historique', path: '/history' },
  { icon: BookOpen, label: 'Tutoriel', path: '/tutoriel' },
  { icon: Settings, label: 'Paramètres', path: '/settings' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
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
          {/* More button (three dots) */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0"
            >
              <MoreVertical className="w-5 h-5" style={{ color: showMore ? '#FF6B00' : '#808080' }} />
              <span className="text-xs font-medium" style={{ color: showMore ? '#FF6B00' : '#808080' }}>Plus</span>
            </button>

            {/* More menu */}
            {showMore && (
              <div className="absolute bottom-12 right-0 w-48 rounded-2xl overflow-hidden z-50" style={{ backgroundColor: '#181818', border: '1px solid #282828', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                <div className="p-2">
                  {MORE_ACTIONS.map(({ icon: Icon, label, path }) => (
                    <button
                      key={path}
                      onClick={() => { navigate(path); setShowMore(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-95"
                      style={{ color: '#B3B3B3' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#282828')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#808080' }} />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
