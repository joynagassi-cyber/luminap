import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Cloud } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';

type SyncState = 'online' | 'offline' | 'syncing';

export default function SyncIndicator() {
  const { isOnline } = useLocalStore();
  const [state, setState] = useState<SyncState>(isOnline ? 'online' : 'offline');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const newState: SyncState = isOnline ? 'online' : 'offline';
    setState(newState);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timer);
  }, [isOnline]);

  if (!visible) return null;

  const config = {
    online:  { icon: Wifi,   color: '#1DB954', bg: 'rgba(29,185,84,0.15)', label: 'Connecté' },
    offline: { icon: WifiOff, color: '#FFB800', bg: 'rgba(255,184,0,0.15)', label: 'Hors ligne' },
  }[state];

  const Icon = config.icon;

  return (
    <div data-testid="sync-indicator"
      className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-medium transition-opacity duration-200"
      style={{ backgroundColor: config.bg, color: config.color, opacity: visible ? 1 : 0 }}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
}
