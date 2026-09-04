import { Settings, User, LogOut } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';
import { useNavigate } from 'react-router-dom';

export default function TopHeader() {
  const { user } = useLocalStore();
  const navigate = useNavigate();
  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-5 py-3 flex items-center justify-between" style={{ backgroundColor: 'rgba(18,18,18,0.95)', backdropFilter: 'blur(10px)' }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B00' }}>
          <span className="text-white text-sm font-bold">L</span>
        </div>
        <div>
          <p className="text-text-primary font-bold text-sm leading-none">Lumina</p>
          <p className="text-text-tertiary text-xs mt-0.5">{user.firstName} · {user.role ? user.role.toLowerCase() : ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/notifications')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
          <span className="text-text-primary text-sm">🔔</span>
        </button>
        <button onClick={() => navigate('/settings')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
          <Settings className="w-4 h-4 text-text-secondary" />
        </button>
      </div>
    </div>
  );
}
