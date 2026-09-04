import { useNavigate } from 'react-router-dom';
import { useLocalStore } from '@/store/useLocalStore';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import TransactionCard from '@/components/TransactionCard';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';

export default function History() {
  const navigate = useNavigate();
  const { transactions } = useLocalStore();

  const recentTxs = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Historique" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <h1 className="text-text-primary font-bold text-xl mb-5">Historique</h1>

        {recentTxs.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: '#212121' }}>
            <p className="text-text-tertiary text-sm">Aucun historique</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTxs.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} onPress={(id) => navigate(`/transaction/${id}`)} />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
