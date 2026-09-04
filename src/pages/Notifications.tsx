import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { Bell, Check } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function Notifications() {
  const navigate = useNavigate();
  const { transactions } = useLocalStore();
  const pendingCount = transactions.filter(t => t.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Notifications" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-text-primary font-bold text-xl">Notifications</h1>
          {pendingCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: '#FFB80020', color: '#FFB800' }}>
              {pendingCount} en attente
            </span>
          )}
        </div>

        {pendingCount === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <Bell className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-50" />
            <p className="text-text-tertiary text-sm">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.filter(t => t.status === 'PENDING')
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map((tx) => (
                <button key={tx.id} onClick={() => navigate(`/transaction/${tx.id}`)} className="w-full text-left rounded-xl p-4 flex items-center gap-3 transition-all active:scale-95" style={{ backgroundColor: '#212121', border: '1px solid #FFB80030' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFB80020' }}>
                    <Bell className="w-5 h-5" style={{ color: '#FFB800' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-semibold truncate">{tx.description || 'Transaction en attente'}</p>
                    <p className="text-text-tertiary text-xs mt-0.5">{tx.amount / 100} FCFA · {tx.date.split('T')[0]}</p>
                  </div>
                  <Check className="w-4 h-4 text-text-tertiary" />
                </button>
              ))
            }
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
