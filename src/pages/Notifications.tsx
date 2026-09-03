import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { useLocalStore } from '@/store/useLocalStore';
import BottomNav from '@/components/BottomNav';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useLocalStore();

  const sorted = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid #282828', position: 'sticky', top: 0, backgroundColor: '#121212', zIndex: 30 }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
          <ArrowLeft className="w-4 h-4 text-text-primary" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-text-primary">Notifications</h1>
          {unreadCount > 0 && <p className="text-text-tertiary text-xs mt-0.5">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllNotificationsRead()} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FF6B00', color: '#FFFFFF' }}>
            Tout lire
          </button>
        )}
      </div>

      <div className="max-w-lg mx-auto px-5 pb-24">
        <div className="space-y-2 mt-4">
          {sorted.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-40" />
              <p className="text-text-tertiary text-sm">Aucune notification</p>
            </div>
          ) : (
            sorted.map((n) => (
              <button
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-opacity"
                style={{
                  backgroundColor: n.isRead ? '#212121' : '#282828',
                  border: '1px solid #282828',
                  opacity: n.isRead ? 0.6 : 1,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                  style={{ backgroundColor: n.isRead ? '#282828' : '#FF6B0020' }}
                >
                  {!n.isRead && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF6B00' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium">{n.title}</p>
                  <p className="text-text-tertiary text-xs mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-text-tertiary text-xs mt-1 opacity-60">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
