import { useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardList,
  Tag,
  Archive,
  BarChart3,
  CreditCard,
  BookOpen,
  Clock,
  RefreshCw,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import SettingsShell from "@/components/SettingsShell";
import { useCurrentUser } from "@/lib/dataLayer";
import { useLocalStore } from "@/store/useLocalStore";

interface ActionItem {
  label: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  to: string;
}

const SHORTCUTS: ActionItem[] = [
  {
    label: "Formulaires",
    hint: "Créer & gérer",
    icon: ClipboardList,
    color: "var(--accent-primary)",
    to: "/forms",
  },
  {
    label: "Mes comptes",
    hint: "Session & reconnexion",
    icon: KeyRound,
    color: "#14B8A6",
    to: "/sessions",
  },
  {
    label: "Champs pers.",
    hint: "Customiser",
    icon: Tag,
    color: "#8B5CF6",
    to: "/custom-fields",
  },
  {
    label: "Archives",
    hint: "Gérer les archives",
    icon: Archive,
    color: "#3B82F6",
    to: "/archives",
  },
  {
    label: "Rapports",
    hint: "Bilans & stats",
    icon: BarChart3,
    color: "#1DB954",
    to: "/reports",
  },
];

const ACTIONS: ActionItem[] = [
  {
    label: "Bilan financier",
    hint: "Voir le rapport par période",
    icon: CreditCard,
    color: "#1DB954",
    to: "/balance",
  },
  {
    label: "Historique financier",
    hint: "Graphiques et statistiques",
    icon: BarChart3,
    color: "#FFB800",
    to: "/history",
  },
  {
    label: "Trace d'activité",
    hint: "Journal de toutes les opérations",
    icon: Clock,
    color: "#3B82F6",
    to: "/trace",
  },
  {
    label: "Versement",
    hint: "Transférer vers la caisse principale",
    icon: CreditCard,
    color: "#FFB800",
    to: "/versement",
  },
  {
    label: "Tutoriel & Aide",
    hint: "Guide complet d'utilisation",
    icon: BookOpen,
    color: "#8B5CF6",
    to: "/tutoriel",
  },
];

export default function SettingsGestion() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const loadInitialData = useLocalStore((s) => s.loadInitialData);
  const isCentralAdmin = user?.role === "CENTRAL_ADMIN";

  return (
    <SettingsShell
      title="Gérer"
      subtitle="Raccourcis pratiques et actions sur vos données"
    >
      {isCentralAdmin && (
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="w-full p-4 rounded-xl text-left active:scale-[0.99] transition-transform mb-4"
          style={{
            backgroundColor: "#1a130f",
            border: "1px solid #3a2a1a",
          }}
          aria-label="Administration centrale multi-organisation"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
              }}
            >
              <Building2
                className="w-5 h-5"
                style={{ color: "var(--accent-primary)" }}
              />
            </div>
            <div>
              <p className="text-text-primary text-sm font-semibold">
                Administration centrale
              </p>
              <p className="text-text-tertiary text-xs mt-0.5">
                Gérer plusieurs organisations · cycle de vie · grants d'admin
              </p>
            </div>
          </div>
        </button>
      )}

      <p className="text-text-secondary text-xs font-medium mb-2">Raccourcis</p>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {SHORTCUTS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.to}
              type="button"
              onClick={() => navigate(a.to)}
              className="p-4 rounded-xl text-left active:scale-95 transition-transform w-full"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
              aria-label={a.label}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{
                  backgroundColor: `color-mix(in srgb, ${a.color} 15%, transparent)`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: a.color }} />
              </div>
              <p className="text-text-primary text-sm font-semibold">{a.label}</p>
              <p className="text-text-tertiary text-xs mt-0.5">{a.hint}</p>
            </button>
          );
        })}
      </div>

      <p className="text-text-secondary text-xs font-medium mb-2">Actions & données</p>
      <div className="space-y-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.to}
              type="button"
              onClick={() => navigate(a.to)}
              className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
              aria-label={a.label}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `color-mix(in srgb, ${a.color} 15%, transparent)`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color: a.color }} />
              </div>
              <div>
                <p className="text-text-primary text-sm font-semibold">{a.label}</p>
                <p className="text-text-tertiary text-xs mt-0.5">{a.hint}</p>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => void loadInitialData()}
          className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-95 transition-transform text-left"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
          aria-label="Actualiser les données"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
            }}
          >
            <RefreshCw
              className="w-5 h-5"
              style={{ color: "var(--accent-primary)" }}
            />
          </div>
          <div>
            <p className="text-text-primary text-sm font-semibold">
              Actualiser les données
            </p>
            <p className="text-text-tertiary text-xs mt-0.5">
              Recharger depuis la base locale
            </p>
          </div>
        </button>
      </div>
    </SettingsShell>
  );
}
