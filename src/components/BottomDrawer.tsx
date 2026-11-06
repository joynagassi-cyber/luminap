import { X } from "lucide-react";

import { useHardwareBack } from "@/hooks/useHardwareBack";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomDrawer({ open, onClose, children }: Props) {
  // Retour matériel Android : ferme la feuille (sinon l'app se ferme).
  useHardwareBack(open, onClose);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-overlay bg-scrim" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="fixed bottom-0 left-0 right-0 z-overlay rounded-t-2xl p-5 pb-8"
        style={{ backgroundColor: "var(--card)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-primary font-bold text-lg">Menu</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--surface-hover)" }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
