import { useNavigate } from "react-router-dom";
import {
  UserCircle,
  Palette,
  Building2,
  Puzzle,
  Bell,
  Settings as SettingsIcon,
  Info,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";

interface SettingsOption {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  to: string;
}

interface SettingsGroup {
  title: string;
  options: SettingsOption[];
}

const GROUPS: SettingsGroup[] = [
  {
    title: "Profil",
    options: [
      {
        id: "profil",
        label: "Profil",
        description: "Photo, nom, rôle et détails de votre compte",
        icon: UserCircle,
        to: "/settings/profil",
      },
    ],
  },
  {
    title: "Apparence & personnalisation",
    options: [
      {
        id: "theme",
        label: "Thème & apparence",
        description: "Mode clair/sombre, couleur de marque, animations",
        icon: Palette,
        to: "/settings/theme",
      },
      {
        id: "personnalisation",
        label: "Personnalisation de l'organisation",
        description: "Nom de l'église, logo et identification",
        icon: Building2,
        to: "/settings/personnalisation",
      },
    ],
  },
  {
    title: "Organisation",
    options: [
      {
        id: "features",
        label: "Features & navigation",
        description: "Composants, menu « Plus » et barre de navigation",
        icon: Puzzle,
        to: "/settings/features",
      },
      {
        id: "notifications",
        label: "Notifications",
        description: "Préférences, marquage lu et gestion",
        icon: Bell,
        to: "/settings/notifications",
      },
      {
        id: "gestion",
        label: "Gérer",
        description: "Raccourcis pratiques et actions sur les données",
        icon: SettingsIcon,
        to: "/settings/gestion",
      },
    ],
  },
  {
    title: "À propos",
    options: [
      {
        id: "about",
        label: "À propos",
        description: "Version, données et informations",
        icon: Info,
        to: "/settings/about",
      },
    ],
  },
];

function SettingsOptionCard({ option }: { option: SettingsOption }) {
  const navigate = useNavigate();
  const Icon = option.icon;
  return (
    <button
      type="button"
      onClick={() => navigate(option.to)}
      className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-[transform,background-color] active:scale-[0.99]"
      style={{
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      data-testid={`settings-opt-${option.id}`}
      aria-label={`Ouvrir ${option.label}`}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
        }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-semibold">{option.label}</p>
        <p className="text-text-tertiary text-xs mt-0.5 truncate">
          {option.description}
        </p>
      </div>
      <ChevronRight
        className="w-4 h-4 text-text-tertiary flex-shrink-0"
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * Hub de Paramètres : une liste de sections ; chaque option mène à SA propre
 * page (/settings/<section>) où l'on « entre » et configure le détail.
 */
export default function SettingsPage() {
  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Paramètres" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            <h1 className="text-text-primary font-bold text-xl mb-1">
              Paramètres
            </h1>
            <p className="text-text-tertiary text-xs mb-5">
              Chaque option ouvre sa propre page de configuration.
            </p>

            {GROUPS.map((group) => (
              <div key={group.title} className="mb-6">
                <p className="text-text-tertiary text-xs font-medium uppercase tracking-wide mb-2 px-1">
                  {group.title}
                </p>
                <div className="space-y-2">
                  {group.options.map((o) => (
                    <SettingsOptionCard key={o.id} option={o} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
