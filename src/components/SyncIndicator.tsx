import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';

export default function SyncIndicator() {
  const { isOnline } = useLocalStore();
  return (
    <div className="fixed top-14 right-4 z-40 px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium"
      style={{ backgroundColor: isOnline ? 'rgba(29,185,84,0.15)' : 'rgba(255,184,0,0.15)', color: isOnline ? '#1DB954' : '#FFB800' }}>
      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
    </div>
  );
}
