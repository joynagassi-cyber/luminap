import { Bell, Settings, Camera } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';
import { useNavigate } from 'react-router-dom';
import LuminaLogo from './LuminaLogo';
import { useState } from 'react';

export default function TopHeader({ title }: { title?: string }) {
  const { user, appConfig } = useLocalStore();
  const navigate = useNavigate();
  const [showPhotoHint, setShowPhotoHint] = useState(false);

  const pendingCount = 0; // computed from transactions in actual usage

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: 'rgba(18,18,18,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #282828' }}>
      <div className="flex items-center gap-2.5">
        <LuminaLogo size={32} />
        <div>
          <p className="text-text-primary font-bold text-sm leading-none">Lumina</p>
          <p className="text-text-tertiary text-xs mt-0.5">{user.firstName} · {user.role ? user.role.toLowerCase() : ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/notifications')}
          className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ backgroundColor: '#212121' }}
        >
          <Bell className="w-4 h-4 text-text-secondary" />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#E51332', color: '#fff' }}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ backgroundColor: '#212121' }}
        >
          <Settings className="w-4 h-4 text-text-secondary" />
        </button>
      </div>
    </div>
  );
}
