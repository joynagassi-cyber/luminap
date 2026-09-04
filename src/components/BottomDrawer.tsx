import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomDrawer({ open, onClose, children }: Props) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-5 pb-8" style={{ backgroundColor: '#181818' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-primary font-bold text-lg">Menu</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#282828' }}>
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
