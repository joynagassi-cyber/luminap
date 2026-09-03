import { useState, useRef, useEffect } from 'react';
import { X, TrendingUp, BarChart3, PieChart, Download, FileText, HelpCircle, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToCSV, exportToPDF, exportToExcel } from '@/lib/utils';
import { useLocalStore } from '@/store/useLocalStore';

interface DrawerItem {
  icon: typeof TrendingUp;
  label: string;
  desc: string;
  action: () => void;
  color: string;
}

export default function BottomDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { transactions } = useLocalStore();
  const drawerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (!open) return;
    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      currentY.current = e.touches[0].clientY;
    };
    const handleTouchEnd = () => {
      const diff = startY.current - currentY.current;
      if (diff > 100) onClose();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [open, onClose]);

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    const approved = transactions.filter(t => t.status === 'APPROVED');
    const filename = `lumina-export-${new Date().toISOString().slice(0, 10)}`;
    if (format === 'csv') exportToCSV(approved, filename);
    else if (format === 'pdf') exportToPDF(approved, filename);
    else exportToExcel(approved, filename);
  };

  const features: DrawerItem[] = [
    {
      icon: TrendingUp,
      label: 'Bilan financier',
      desc: 'Entrées, sorties, net',
      action: () => { onClose(); navigate('/balance'); },
      color: '#FF6B00',
    },
    {
      icon: BarChart3,
      label: 'Graphiques & tendances',
      desc: 'Courbes, camemberts',
      action: () => { onClose(); navigate('/history'); },
      color: '#1DB954',
    },
    {
      icon: PieChart,
      label: 'Répartition par catégorie',
      desc: 'Analyse détaillée',
      action: () => { onClose(); navigate('/balance'); },
      color: '#E51332',
    },
    {
      icon: Building2,
      label: 'Groupes organisationnels',
      desc: 'Diacres, jeunesse…',
      action: () => { onClose(); navigate('/groups'); },
      color: '#2196F3',
    },
    {
      icon: Download,
      label: 'Exporter les données',
      desc: 'CSV / PDF / Excel',
      action: () => { onClose(); handleExport('csv'); },
      color: '#FFB800',
    },
    {
      icon: HelpCircle,
      label: 'Aide & FAQ',
      desc: 'Guide d\'utilisation',
      action: () => { onClose(); navigate('/help'); },
      color: '#808080',
    },
  ];

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
        style={{
          backgroundColor: '#212121',
          borderTop: '1px solid #282828',
          maxHeight: '80vh',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#535353' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3" style={{ borderBottom: '1px solid #282828' }}>
          <h2 className="text-base font-bold text-text-primary">Plus d'outils</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Features — single column, functional */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(80vh - 80px)' }}>
          <div className="space-y-2">
            {features.map((feat, i) => (
              <button
                key={i}
                onClick={feat.action}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left active:scale-98 transition-transform"
                style={{ backgroundColor: '#282828' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: feat.color + '20' }}
                >
                  <feat.icon className="w-5 h-5" style={{ color: feat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-semibold">{feat.label}</p>
                  <p className="text-text-tertiary text-xs mt-0.5">{feat.desc}</p>
                </div>
                <svg className="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
