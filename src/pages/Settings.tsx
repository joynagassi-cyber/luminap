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
import { motion } from "framer-motion";
import { MotionCard } from "@/design/motion/MotionCard";

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

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

function SettingsOptionCard({ option }: { option: SettingsOption }) {
  const navigate = useNavigate();
  const Icon = option.icon;
  return (
    <MotionCard
      variant="flat"
      onClick={() => navigate(option.to)}
      className="flex items-center gap-3 p-4"
      data-testid={`settings-opt-${option.id}`}
      aria-label={`Ouvrir ${option.label}`}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
        }}
      >
        <Icon className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-semibold">
          {option.label}
        </p>
        <p className="text-text-tertiary text-xs mt-0.5 truncate">
          {option.description}
        </p>
      </div>
      <ChevronRight
        className="w-4 h-4 text-text-tertiary flex-shrink-0"
        aria-hidden="true"
      />
    </MotionCard>
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
        <div data-screen-state="ready" className="min-h-dvh">
          <TopHeader title="Paramètres" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={CARD_VARIANTS}
              className="text-text-primary font-bold text-2xl tracking-tight mb-1"
            >
              Paramètres
            </motion.h1>
            <motion.p
              initial="hidden"
              animate="visible"
              variants={CARD_VARIANTS}
              transition={{ delay: 0.1 }}
              className="text-text-tertiary text-xs mb-6"
            >
              Chaque option ouvre sa propre page de configuration.
            </motion.p>

            {GROUPS.map((group, gi) => (
              <motion.div
                key={group.title}
                initial="hidden"
                animate="visible"
                variants={CARD_VARIANTS}
                transition={{ delay: 0.15 + gi * 0.08 }}
                className="mb-6"
              >
                <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider mb-2 px-1">
                  {group.title}
                </p>
                <div className="space-y-2">
                  {group.options.map((o) => (
                    <SettingsOptionCard key={o.id} option={o} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
