import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Bell, Check, Clock, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function getNotifIcon(actionType: string) {
  switch (actionType) {
    case 'TRANSACTION_PENDING': return <Bell className="w-4 h-4" style={{ color: '#FFB800' }} />;
    case 'TRANSACTION_APPROVED': return <CheckCircle className="w-4 h-4" style={{ color: '#1DB954' }} />;
    default: return <Bell className="w-4 h-4" style={{ color: '#808080' }} />;
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead } = useLocalStore();

  const sorted = [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Notifications" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-text-primary font-bold text-xl">Notifications</h1>
          {unread > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
              {unread} non lu{unread > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Bell className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-50" />
            <p className="text-text-tertiary text-sm">Aucune notification</p>
            <p className="text-text-tertiary text-xs mt-1">Les notifications apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((notif) => (
              <button
                key={notif.id}
                onClick={async () => {
                  if (!notif.isRead) await markNotificationRead(notif.id);
                  if (notif.sourceTransactionId) navigate(`/transaction/${notif.sourceTransactionId}`);
                }}
                className="w-full text-left rounded-xl p-4 flex items-start gap-3 transition-all active:scale-95"
                style={{
                  backgroundColor: notif.isRead ? '#212121' : '#282828',
                  border: notif.isRead ? '1px solid #282828' : '1px solid #282828',
                }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getNotifIcon(notif.actionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${notif.isRead ? 'text-text-secondary' : 'text-text-primary'}`}>{notif.title}</p>
                    {!notif.isRead && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: '#FF6B00' }} />}
                  </div>
                  <p className="text-text-tertiary text-xs mt-0.5 line-clamp-2">{notif.message}</p>
                  <p className="text-text-tertiary text-xs mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
