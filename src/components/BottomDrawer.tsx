import { useState, useRef, useEffect } from 'react';
import { X, TrendingUp, BarChart3, PieChart, Download, FileText, HelpCircle } from 'lucide-react';

const EXTRA_FEATURES = [
  { icon: TrendingUp, label: 'Rapport mensuel', desc: 'PDF détaillé', action: () => {} },
  { icon: BarChart3, label: 'Comparaison périodes', desc: 'Trimestre par trimestre', action: () => {} },
  { icon: PieChart, label: 'Répartition par catégorie', desc: 'Analyse en détails', action: () => {} },
  { icon: FileText, label: 'Rapport d\'activité', desc: 'Bilan de l\'année', action: () => {} },
  { icon: Download, label: 'Exporter les données', desc: 'CSV / Excel', action: () => {} },
  { icon: HelpCircle, label: 'Aide & Documentation', desc: 'Guide d\'utilisation', action: () => {} },
];

interface BottomDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function BottomDrawer({ open, onClose }: BottomDrawerProps) {
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
          backgroundColor: '#181818',
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
        <div className="flex items-center justify-between px-5 pb-3 border-b" style={{ borderBottomColor: '#282828' }}>
          <h2 className="text-base font-bold text-text-primary">Plus d'outils</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Features */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(80vh - 80px)' }}>
          <div className="grid grid-cols-2 gap-3">
            {EXTRA_FEATURES.map((feat, i) => (
              <button
                key={i}
                onClick={feat.action}
                className="flex flex-col items-center gap-2 p-4 rounded-xl text-center active:scale-95 transition-transform"
                style={{ backgroundColor: '#282828' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FF6B0020' }}>
                  <feat.icon className="w-5 h-5" style={{ color: '#FF6B00' }} />
                </div>
                <div>
                  <p className="text-text-primary text-sm font-semibold">{feat.label}</p>
                  <p className="text-text-tertiary text-xs mt-0.5">{feat.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
