import { Landmark, Home, Users, CalendarPlus, MoreVertical, Wallet, BarChart3, LineChart, ClipboardList, History, Settings, Plus, Check, ArrowRightLeft, FileText, Archive, HelpCircle, ListChecks } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useMemo } from 'react';
import { IonButton, IonTabBar, IonTabButton } from '@ionic/react';

const NAV_ITEMS = [
  { icon: Home, label: 'Accueil', path: '/' },
  { icon: Landmark, label: 'Finances', path: '/finance' },
  { icon: Users, label: 'Groupes', path: '/groups' },
  { icon: CalendarPlus, label: 'Cultes', path: '/cotisations' },
];

const MORE_ACTIONS = [
  { icon: Wallet, label: 'Versement', path: '/versement' },
  { icon: BarChart3, label: 'Rapports', path: '/reports' },
  { icon: LineChart, label: 'Bilan', path: '/balance' },
  { icon: ClipboardList, label: 'Membres', path: '/members' },
  { icon: CalendarPlus, label: 'Membres en avance', path: '/membres-en-avance' },
  { icon: History, label: 'Historique', path: '/history' },
  { icon: Archive, label: 'Archives', path: '/archives' },
  { icon: ListChecks, label: 'Trace', path: '/trace' },
  { icon: FileText, label: 'Formulaires', path: '/forms' },
  { icon: Settings, label: 'Parametres', path: '/settings' },
  { icon: HelpCircle, label: 'Aide', path: '/help' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const fabAction = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/transaction/') && !path.endsWith('/edit')) {
      return { icon: Check, label: 'Valider', action: () => {}, color: '#1DB954' };
    }
    if (path.startsWith('/event')) {
      return { icon: Plus, label: 'Nouveau', action: () => navigate('/event/new'), color: '#8B5CF6' };
    }
    if (path.startsWith('/groups/')) {
      return { icon: ArrowRightLeft, label: 'Verser', action: () => navigate('/versement'), color: '#FF6B00' };
    }
    return { icon: Plus, label: 'Transaction', action: () => navigate('/transaction/new'), color: '#FF6B00' };
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <>
      {/* FAB — Contextual action button */}
      <IonButton
        onClick={fabAction.action}
        className="fixed bottom-20 right-5 z-40 !w-14 !h-14 !rounded-full !p-0 !shadow-lg !min-height:auto"
        style={{
          background: `linear-gradient(135deg, ${fabAction.color}dd, ${fabAction.color})`,
          boxShadow: `0 4px 16px ${fabAction.color}60`,
        }}
        aria-label={fabAction.label}
      >
        {fabAction.icon === Check ? (
          <Check className="w-7 h-7 text-white" />
        ) : fabAction.icon === ArrowRightLeft ? (
          <ArrowRightLeft className="w-7 h-7 text-white" />
        ) : (
          <Plus className="w-7 h-7 text-white" />
        )}
      </IonButton>

      {/* Ionic TabBar — dark theme, replaces div-based nav */}
      <IonTabBar
        className="fixed bottom-0 left-0 right-0 z-50 px-2 pb-2 pt-1"
        style={{
          backgroundColor: 'rgba(18,18,18,0.97)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #282828',
        }}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => (
            <IonTabButton
              key={path}
              tab={path}
              onClick={() => navigate(path)}
              className="!min-height:auto !p-0 flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl transition-all min-w-0"
            >
              <Icon
                className="w-5 h-5"
                style={{ color: isActive(path) ? '#FF6B00' : '#B3B3B3', opacity: isActive(path) ? 1 : 0.7 }}
              />
              <span className="text-xs font-medium" style={{ color: isActive(path) ? '#FF6B00' : '#B3B3B3' }}>
                {label}
              </span>
            </IonTabButton>
          ))}

          {/* More button */}
          <div className="relative" ref={moreRef}>
            <IonButton
              fill="clear"
              onClick={() => setShowMore(!showMore)}
              className="!min-height:auto !p-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0"
            >
              <MoreVertical className="w-5 h-5" style={{ color: showMore ? '#FF6B00' : '#B3B3B3' }} />
              <span className="text-xs font-medium" style={{ color: showMore ? '#FF6B00' : '#B3B3B3' }}>Plus</span>
            </IonButton>

            {/* More menu */}
            {showMore && (
              <div className="absolute bottom-12 right-0 w-48 rounded-2xl overflow-hidden z-50" style={{ backgroundColor: '#181818', border: '1px solid #282828', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                <div className="p-2">
                  {MORE_ACTIONS.map(({ icon: Icon, label, path }) => (
                    <IonButton
                      key={path}
                      fill="clear"
                      expand="block"
                      onClick={() => { navigate(path); setShowMore(false); }}
                      className="w-full !min-height:auto !p-0 flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-95"
                      style={{ color: '#B3B3B3' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#282828')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#B3B3B3' }} />
                      <span className="text-sm font-medium">{label}</span>
                    </IonButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </IonTabBar>
    </>
  );
}
