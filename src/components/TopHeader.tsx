import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';

interface TopHeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export default function TopHeader({ title, showBack = false, rightAction }: TopHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, getUnreadCount } = useLocalStore();
  const unreadCount = getUnreadCount();
  const isHome = location.pathname === '/';

  return (
    <div
      className="flex items-center justify-between px-5 py-3.5 mb-4"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backgroundColor: '#121212',
        borderBottom: '1px solid #282828',
        marginLeft: '-20px',
        marginRight: '-20px',
      }}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#212121' }}
          >
            <ArrowLeft className="w-4 h-4 text-text-primary" />
          </button>
        )}
        {!isHome && !showBack && (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#212121' }}
          >
            <ArrowLeft className="w-4 h-4 text-text-primary" />
          </button>
        )}
        <h1 className="text-base font-bold text-text-primary">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {rightAction}
        <button
          onClick={() => navigate('/notifications')}
          className="w-9 h-9 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: '#212121' }}
        >
          <Bell className="w-4 h-4 text-text-secondary" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
