import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useLocalStore } from '@/store/useLocalStore';
import BottomNav from '@/components/BottomNav';

const ACTION_COLORS: Record<string, string> = {
  TRANSACTION_SUBMITTED: '#FFB800',
  TRANSACTION_DRAFT: '#808080',
  TRANSACTION_APPROVED: '#1DB954',
  TRANSACTION_REJECTED: '#E51332',
  TRANSACTION_DELETED: '#808080',
  TRANSACTION_UPDATED: '#2196F3',
};

const ACTION_LABELS: Record<string, string> = {
  TRANSACTION_SUBMITTED: 'Soumise',
  TRANSACTION_DRAFT: 'Brouillon',
  TRANSACTION_APPROVED: 'Approuvée',
  TRANSACTION_REJECTED: 'Rejetée',
  TRANSACTION_DELETED: 'Supprimée',
  TRANSACTION_UPDATED: 'Modifiée',
};

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useLocalStore();

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
  }

  async function handleMarkAll() {
    await markAllNotificationsRead();
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#121212' }}>
      <div className="max-w-lg mx-auto px-5 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#212121' }}>
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs" style={{ color: '#FF6B00' }}>
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#FF6B0020', color: '#FF6B00' }}
            >
              <Check className="w-3.5 h-3.5" />Tout lire
            </button>
          )}
        </div>

        {/* List */}
        <div className="space-y-2 mb-6 pb-20">
          {notifications.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#181818', border: '1px solid #282828' }}>
              <Bell className="w-10 h-10 mx-auto mb-3 text-[#535353]" />
              <p className="text-[#808080] text-sm">Aucune notification</p>
              <p className="text-[#535353] text-xs mt-1">Les actions seront affichées ici</p>
            </div>
          ) : (
            notifications.map((n) => {
              const color = ACTION_COLORS[n.actionType] ?? '#808080';
              const label = ACTION_LABELS[n.actionType] ?? 'Activité';
              return (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-all active:scale-95"
                  style={{
                    backgroundColor: n.isRead ? '#181818' : '#212121',
                    border: '1px solid #282828',
                    opacity: n.isRead ? 0.65 : 1,
                  }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '20' }}>
                    <Bell className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-semibold">{n.title}</p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#FF6B00' }} />
                      )}
                    </div>
                    <p className="text-[#B3B3B3] text-sm mt-0.5 truncate">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Clock className="w-3 h-3" style={{ color: '#535353' }} />
                      <span className="text-[#535353] text-xs">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                      <span className="text-[#535353] text-xs" style={{ color }}>{label}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
