/**
 * HomeIndicator — indicateur d'accueil au-dessus de la barre de navigation.
 *
 * Composé de deux parties :
 * 1. Une « pastille » blanche centrée (comportement natif iOS) : apparaît
 *    au montage puis s'estompe. En la toucher (clic ou début de glissade)
 *    ouvre la modale des raccourcis.
 * 2. Une modale (sheet) qui encapsule quelques features utiles : on peut
 *    la fermer en glissant le handle vers le bas (drag-to-dismiss, avec
 *    suivi du doigt + seuil d'activation) ou via le bouton de fermeture.
 */
import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Users,
  CalendarPlus,
  FileText,
  Ticket,
  BarChart3,
  X,
} from "lucide-react";
import { FEATURES } from "@/lib/features";
import { tint } from "@/lib/utils";

type Shortcut = {
  key: string;
  label: string;
  desc: string;
  icon: any;
  color: string;
  route: string;
};

/** Features utiles regroupées dans la capsule — une sélection courte et
    déterministe (6 items, toutes des routes stables du registre FEATURES). */
const SHORTCUT_FEATURES: Shortcut[] = [
  { key: "finance", label: "Finances", desc: "Entrées & sorties", icon: Wallet, color: "#1DB954", route: "/finance" },
  { key: "membres", label: "Membres", desc: "Liste du groupe", icon: Users, color: "#3B82F6", route: "/members" },
  { key: "events", label: "Événements", desc: "Cultes & budgets", icon: CalendarPlus, color: "#FF6B00", route: "/events" },
  { key: "giving", label: "Dons", desc: "Campagnes en cours", icon: Ticket, color: "#8B5CF6", route: "/giving" },
  { key: "formulaires", label: "Formulaires", desc: "Collecter des infos", icon: FileText, color: "#14B8A6", route: "/forms" },
  { key: "rapports", label: "Rapports", desc: "Bilan & états", icon: BarChart3, color: "#F59E0B", route: "/reports" },
];

const SHEET_MAX_DRAG = 140; // px de glisse avant fermeture
const SHEET_TRIGGER_RATIO = 0.35; // fraction du drag max pour activer la fermeture

export default function HomeIndicator() {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Estompage de la pastille après apparition.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // ── Drag-to-dismiss du sheet ─────────────────────────────────────────────
  const dragRef = useRef<{ startY: number; dy: number } | null>(null);
  const [dragDy, setDragDy] = useState(0);

  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, dy: 0 };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dy = Math.max(0, e.clientY - dragRef.current.startY); // vers le bas seulement
    dragRef.current.dy = dy;
    setDragDy(dy);
  };
  const onDragEnd = () => {
    if (dragRef.current && dragRef.current.dy > SHEET_MAX_DRAG * SHEET_TRIGGER_RATIO) {
      setSheetOpen(false);
    }
    dragRef.current = null;
    setDragDy(0);
  };

  const shortcuts = useMemo(() => {
    // Sécurité : si le réglage utilisateur a masqué une feature, on ne l'offre
    // pas dans la capsule (le registre porte les routes, le réglage la visibilité).
    const visible = FEATURES;
    return SHORTCUT_FEATURES.filter((s) => visible.some((f) => f.id === s.key));
  }, []);

  const go = (route: string) => {
    setSheetOpen(false);
    navigate(route);
  };

  const sheetTranslate = sheetOpen ? `translateY(${dragDy}px)` : "translateY(100%)";

  return (
    <>
      {/* ── Modale (sheet) des raccourcis utiles ── */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[70]"
          role="dialog"
          aria-modal="true"
          aria-label="Raccourcis utiles"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.45)" }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 rounded-t-2xl overflow-hidden"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderBottom: "none",
              boxShadow: "0 -12px 40px rgba(0,0,0,0.18)",
              transform: sheetTranslate,
              transition: dragDy
                ? "none"
                : "transform 260ms cubic-bezier(0.2,0.8,0.2,1)",
              willChange: "transform",
              touchAction: "none",
              maxHeight: "62vh",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle de glisse */}
            <div
              className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
              style={{ background: "var(--surface)" }}
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
              aria-label="Glisser vers le bas pour fermer"
            >
              <div
                className="w-10 h-1.5 rounded-full"
                style={{ background: "var(--border)" }}
              />
              <p
                className="ml-3 text-[11px] font-medium"
                style={{ color: "var(--text-tertiary)" }}
              >
                Glisser pour fermer
              </p>
            </div>

            {/* Contenu défilable des features utiles */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="font-bold text-base"
                  style={{ color: "var(--text-primary)" }}
                >
                  Raccourcis utiles
                </h2>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "var(--surface)" }}
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {shortcuts.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => go(s.route)}
                      className="flex items-start gap-3 p-3 rounded-xl text-left transition-[transform] active:scale-[0.97]"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: tint(s.color, 16) }}
                      >
                        <Icon className="w-4 h-4" style={{ color: s.color }} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {s.label}
                        </p>
                        <p
                          className="text-[11px] truncate"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {s.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pastille d'accueil (au-dessus de la nav) ── */}
      <button
        type="button"
        onClick={() => setSheetOpen((o) => !o)}
        aria-label={sheetOpen ? "Masquer les raccourcis" : "Voir les raccourcis utiles"}
        style={{
          position: "fixed",
          left: "50%",
          bottom: 66,
          transform: "translateX(-50%)",
          zIndex: 60,
          width: 120,
          height: 6,
          borderRadius: 999,
          border: "none",
          padding: 0,
          cursor: "pointer",
          background: settled ? "rgba(120,120,120,0.55)" : "rgba(255,255,255,0.95)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          opacity: sheetOpen ? 0.5 : 1,
          transition:
            "background 600ms ease, opacity 300ms ease, box-shadow 300ms ease",
        }}
      />
    </>
  );
}
