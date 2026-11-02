/**
 * Settings v2 — Hub de paramètres, redesign premium.
 *
 * Design : fond sombre, sections bien délimitées, cartes d'options avec
 * icônes colorées, typographie cohérente.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 */

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
  Activity,
  ShieldCheck,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { Section, InfoCard, ListItem } from "@/design/components/PageShell";

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
        id: "roles",
        label: "Accès & rôles",
        description: "Rôles des membres et capacités accordées dans l'organisation",
        icon: ShieldCheck,
        to: "/admin/roles",
      },
      {
        id: "transfer-ownership",
        label: "Transférer la propriété",
        description: "Désigner un autre administrateur de l'organisation",
        icon: Crown,
        to: "/admin/transfer-ownership",
      },
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
      {
        id: "health",
        label: "État du système",
        description: "Diagnostic : version, synchronisation, erreurs récentes",
        icon: Activity,
        to: "/settings/health",
      },
    ],
  },
];

function SettingsOptionCard({ option }: { option: SettingsOption }) {
  const navigate = useNavigate();
  const Icon = option.icon;
  return (
    <ListItem
      key={option.id}
      icon={
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
          }}
        >
          <Icon className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
        </div>
      }
      title={option.label}
      subtitle={option.description}
      onClick={() => navigate(option.to)}
    />
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh flex flex-col">
          <TopHeader title="Paramètres" subtitle="Configuration de l'organisation" />
          <div className="flex-1 px-6 pt-2 pb-safe-calc">
            <div className="max-w-lg mx-auto">
              <h1 className="text-text-primary font-bold text-3xl tracking-tight mb-6">
                Paramètres
              </h1>

              {GROUPS.map((group) => (
                <Section key={group.title} title={group.title}>
                  <div className="space-y-2">
                    {group.options.map((o) => (
                      <SettingsOptionCard key={o.id} option={o} />
                    ))}
                  </div>
                </Section>
              ))}
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}


