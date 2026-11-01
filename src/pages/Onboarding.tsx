import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ArrowRight,
  Wallet,
  Calendar,
  BarChart3,
  Users,
  Building,
  Heart,
} from "lucide-react";
import {
  IonPage,
  IonContent,
} from "@ionic/react";
import {
  loadOnboardingState,
  saveOnboardingState,
  completeOnboarding,
  type OnboardingState,
} from "@/lib/onboardingState";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";

/**
 * Illustration vectorielle premium — écran de bienvenue
 */
function WelcomeIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ maxHeight: 280 }}
    >
      <defs>
        <linearGradient id="welcomeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.05" />
        </linearGradient>
        <filter id="welcomeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <rect x="0" y="0" width="400" height="300" fill="url(#welcomeGrad)" />

      <circle cx="280" cy="60" r="70" fill="var(--accent-primary)" opacity="0.15" filter="url(#welcomeGlow)" />
      <circle cx="320" cy="90" r="40" fill="var(--accent-primary)" opacity="0.1" filter="url(#welcomeGlow)" />

      <rect x="60" y="120" width="140" height="110" rx="16" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="85" y="135" width="90" height="10" rx="4" fill="var(--surface-hover)" />
      <rect x="85" y="155" width="70" height="8" rx="3" fill="var(--surface-hover)" />
      <rect x="85" y="173" width="50" height="8" rx="3" fill="var(--surface-hover)" />
      <rect x="115" y="185" width="30" height="25" rx="6" fill="var(--accent-primary)" />
      <rect x="80" y="145" width="18" height="18" rx="4" fill="color-mix(in srgb, var(--accent-primary) 20%, transparent)" />
      <rect x="120" y="145" width="18" height="18" rx="4" fill="color-mix(in srgb, var(--accent-primary) 20%, transparent)" />

      <path d="M 300 250 Q 280 220 260 250" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <path d="M 310 260 Q 290 230 270 260" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" opacity="0.2" />

      {[20, 80, 150, 220, 350].map((x, i) => (
        <path
          key={i}
          d={`M${x} ${40 + i * 10} l2 4 l4 -1 l-4 -1 l-2 4 z`}
          fill="var(--accent-primary)"
          opacity={0.6 + (i % 3) * 0.1}
        />
      ))}
    </svg>
  );
}

/**
 * Illustration vectorielle premium — Tableau de bord
 */
function DashboardIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ maxHeight: 280 }}
    >
      <defs>
        <linearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--data-planified)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--data-planified)" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height="300" fill="url(#dashGrad)" />

      <rect x="40" y="80" width="120" height="90" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="55" y="95" width="90" height="8" rx="3" fill="var(--surface-hover)" />
      <rect x="55" y="115" width="110" height="28" rx="6" fill="color-mix(in srgb, var(--in) 15%, transparent)" />
      <rect x="60" y="125" width="30" height="14" rx="4" fill="var(--in)" />
      <rect x="95" y="125" width="20" height="14" rx="4" fill="var(--surface-hover)" />

      <rect x="240" y="80" width="120" height="90" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="255" y="95" width="90" height="8" rx="3" fill="var(--surface-hover)" />
      <rect x="255" y="115" width="100" height="28" rx="6" fill="color-mix(in srgb, var(--out) 15%, transparent)" />
      <rect x="260" y="125" width="30" height="14" rx="4" fill="var(--out)" />
      <rect x="295" y="125" width="20" height="14" rx="4" fill="var(--surface-hover)" />

      <rect x="40" y="200" width="320" height="70" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <polyline points="50,240 90,210 140,235 190,195 240,225 290,200 340,180" stroke="var(--accent-primary)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="240" r="4" fill="var(--accent-primary)" />
      <circle cx="90" cy="210" r="4" fill="var(--accent-primary)" />
      <circle cx="140" cy="235" r="4" fill="var(--accent-primary)" />
      <circle cx="190" cy="195" r="4" fill="var(--accent-primary)" />
      <circle cx="240" cy="225" r="4" fill="var(--accent-primary)" />
      <circle cx="290" cy="200" r="4" fill="var(--accent-primary)" />
      <circle cx="340" cy="180" r="4" fill="var(--accent-primary)" />

      <circle cx="360" cy="40" r="6" fill="var(--accent-primary)" opacity="0.4" />
      <circle cx="380" cy="260" r="5" fill="var(--data-planified)" opacity="0.3" />
    </svg>
  );
}

/**
 * Illustration vectorielle premium — Transactions
 */
function TransactionIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ maxHeight: 280 }}
    >
      <defs>
        <linearGradient id="txGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--data-success)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--data-success)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height="300" fill="url(#txGrad)" />

      <rect x="130" y="70" width="140" height="200" rx="24" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="150" y="95" width="100" height="40" rx="20" fill="var(--surface-hover)" />
      <rect x="160" y="105" width="80" height="20" rx="10" fill="var(--border)" />

      <rect x="150" y="155" width="100" height="14" rx="6" fill="color-mix(in srgb, var(--in) 15%, transparent)" />
      <rect x="155" y="163" width="40" height="6" rx="2" fill="var(--in)" />
      <rect x="150" y="180" width="100" height="14" rx="6" fill="var(--surface-hover)" />
      <rect x="155" y="188" width="45" height="6" rx="2" fill="var(--text-tertiary)" />
      <rect x="150" y="205" width="100" height="14" rx="6" fill="color-mix(in srgb, var(--out) 15%, transparent)" />
      <rect x="155" y="213" width="42" height="6" rx="2" fill="var(--out)" />

      <rect x="260" y="140" width="50" height="32" rx="6" fill="var(--accent-primary)" />
      <rect x="270" y="150" width="30" height="4" rx="1" fill="white" opacity="0.8" />
      <rect x="270" y="158" width="20" height="4" rx="1" fill="white" opacity="0.6" />

      <path d="M 90 180 L 110 160 L 100 160 L 110 140 L 120 160" stroke="var(--in)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 90 220 L 110 200 L 100 200 L 110 180 L 120 200" stroke="var(--out)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="320" cy="100" r="3" fill="var(--accent-primary)" opacity="0.7" />
      <circle cx="340" cy="80" r="2" fill="var(--accent-primary)" opacity="0.5" />
      <circle cx="300" cy="70" r="3" fill="var(--accent-primary)" opacity="0.6" />
    </svg>
  );
}

/**
 * Illustration vectorielle premium — Caisses & Groupes
 */
function CaisseIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ maxHeight: 280 }}
    >
      <defs>
        <linearGradient id="caisseGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--in)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--in)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height="300" fill="url(#caisseGrad)" />

      <rect x="50" y="110" width="80" height="110" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="65" y="125" width="50" height="10" rx="4" fill="var(--surface-hover)" />
      <rect x="65" y="145" width="40" height="8" rx="3" fill="var(--surface-hover)" />
      <rect x="65" y="163" width="30" height="8" rx="3" fill="color-mix(in srgb, var(--in) 20%, transparent)" />
      <rect x="70" y="171" width="20" height="10" rx="3" fill="var(--in)" />

      <rect x="160" y="70" width="80" height="150" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="175" y="85" width="50" height="10" rx="4" fill="var(--surface-hover)" />
      <rect x="175" y="105" width="55" height="8" rx="3" fill="var(--surface-hover)" />
      <rect x="175" y="123" width="45" height="8" rx="3" fill="color-mix(in srgb, var(--in) 20%, transparent)" />
      <rect x="180" y="131" width="25" height="10" rx="3" fill="var(--in)" />

      <rect x="270" y="130" width="80" height="90" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="285" y="145" width="50" height="10" rx="4" fill="var(--surface-hover)" />
      <rect x="285" y="165" width="40" height="8" rx="3" fill="var(--surface-hover)" />

      <path d="M 130 165 L 160 145" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M 240 145 L 270 175" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

      <path d="M 145 158 L 155 148 L 150 148 L 155 138 L 160 148" stroke="var(--accent-primary)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <path d="M 255 168 L 265 158 L 260 158 L 265 148 L 270 158" stroke="var(--accent-primary)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />

      <circle cx="350" cy="40" r="5" fill="var(--in)" opacity="0.5" />
      <circle cx="370" cy="250" r="4" fill="var(--in)" opacity="0.4" />
      <circle cx="330" cy="220" r="6" fill="var(--in)" opacity="0.3" />
    </svg>
  );
}

/**
 * Illustration vectorielle premium — Événements & Budgets
 */
function EventIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ maxHeight: 280 }}
    >
      <defs>
        <linearGradient id="evtGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--data-advance)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--data-advance)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height="300" fill="url(#evtGrad)" />

      <rect x="60" y="80" width="110" height="140" rx="16" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="75" y="95" width="80" height="14" rx="6" fill="var(--surface-hover)" />
      <rect x="80" y="115" width="30" height="6" rx="2" fill="var(--text-tertiary)" />
      <rect x="80" y="127" width="24" height="6" rx="2" fill="var(--text-tertiary)" />
      <circle cx="90" cy="160" r="12" fill="color-mix(in srgb, var(--data-advance) 20%, transparent)" />
      <rect x="84" y="154" width="4" height="4" rx="1" fill="var(--data-advance)" />
      <circle cx="125" cy="160" r="8" fill="var(--surface-hover)" />
      <rect x="120" y="155" width="3" height="3" rx="1" fill="var(--text-tertiary)" />
      <circle cx="95" cy="195" r="8" fill="var(--surface-hover)" />
      <rect x="90" y="190" width="3" height="3" rx="1" fill="var(--text-tertiary)" />

      <rect x="210" y="130" width="140" height="110" rx="14" fill="color-mix(in srgb, var(--data-advance) 15%, transparent)" stroke="var(--data-advance)" strokeWidth="1" />
      <rect x="225" y="145" width="110" height="10" rx="4" fill="var(--surface-hover)" />
      <rect x="225" y="165" width="100" height="8" rx="3" fill="var(--surface-hover)" />
      <rect x="225" y="183" width="80" height="8" rx="3" fill="color-mix(in srgb, var(--data-advance) 20%, transparent)" />
      <rect x="230" y="191" width="35" height="10" rx="3" fill="var(--data-advance)" />

      <circle cx="300" cy="80" r="16" fill="var(--accent-primary)" />
      <path d="M 292 74 L 300 66 L 308 74 L 300 78 Z" fill="white" />
      <path d="M 296 84 L 300 88 L 304 84" stroke="white" strokeWidth="2" strokeLinecap="round" />

      <circle cx="340" cy="110" r="3" fill="var(--accent-primary)" opacity="0.8" />
      <circle cx="360" cy="125" r="2" fill="var(--data-advance)" opacity="0.7" />
      <circle cx="320" cy="140" r="3" fill="var(--accent-primary)" opacity="0.6" />
    </svg>
  );
}

/**
 * Illustration vectorielle premium — Rapports & Bilans
 */
function ReportIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ maxHeight: 280 }}
    >
      <defs>
        <linearGradient id="rptGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--data-planified)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--data-planified)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height="300" fill="url(#rptGrad)" />

      <rect x="60" y="60" width="130" height="190" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="75" y="75" width="100" height="12" rx="5" fill="var(--surface-hover)" />
      <rect x="75" y="97" width="80" height="8" rx="3" fill="var(--surface-hover)" />
      <rect x="75" y="113" width="60" height="8" rx="3" fill="var(--surface-hover)" />
      <path d="M 75 145 Q 110 135 140 145" stroke="var(--data-planified)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      <rect x="75" y="165" width="40" height="6" rx="2" fill="var(--text-tertiary)" />
      <rect x="75" y="179" width="30" height="6" rx="2" fill="var(--text-tertiary)" />
      <circle cx="120" cy="195" r="14" fill="color-mix(in srgb, var(--data-planified) 15%, transparent)" stroke="var(--data-planified)" strokeWidth="1.5" />
      <rect x="116" y="191" width="2" height="8" rx="1" fill="var(--data-planified)" />
      <rect x="118" y="193" width="8" height="2" rx="1" fill="var(--data-planified)" />

      <rect x="230" y="70" width="110" height="170" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="245" y="85" width="80" height="10" rx="4" fill="var(--surface-hover)" />
      <rect x="250" y="180" width="20" height="60" rx="4" fill="color-mix(in srgb, var(--data-planified) 20%, transparent)" />
      <rect x="280" y="140" width="20" height="100" rx="4" fill="var(--data-planified)" />
      <rect x="310" y="160" width="20" height="80" rx="4" fill="color-mix(in srgb, var(--data-planified) 40%, transparent)" />

      <circle cx="260" cy="140" r="4" fill="var(--data-planified)" />
      <circle cx="290" cy="160" r="4" fill="var(--data-planified)" />
      <circle cx="320" cy="140" r="4" fill="var(--data-planified)" />

      <path d="M 250 250 L 260 240 L 270 250" stroke="var(--data-planified)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Illustration vectorielle premium — Organisation & Marque
 */
function OrgIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ maxHeight: 280 }}
    >
      <defs>
        <linearGradient id="orgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="400" height="300" fill="url(#orgGrad)" />

      <circle cx="200" cy="110" r="45" fill="var(--accent-primary)" />
      <path d="M 190 105 L 210 105 L 200 125 Z" fill="white" />
      <circle cx="200" cy="110" r="8" fill="white" opacity="0.3" />

      <rect x="80" y="180" width="60" height="70" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="90" y="190" width="40" height="10" rx="4" fill="var(--surface-hover)" />
      <rect x="90" y="210" width="30" height="8" rx="3" fill="var(--surface-hover)" />

      <rect x="260" y="170" width="60" height="80" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="1" />
      <rect x="270" y="185" width="40" height="10" rx="4" fill="var(--surface-hover)" />
      <rect x="270" y="205" width="35" height="8" rx="3" fill="var(--surface-hover)" />

      <path d="M 140 250 Q 200 220 260 250" stroke="var(--accent-primary)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.5" />
      <circle cx="140" cy="250" r="6" fill="var(--accent-primary)" />
      <circle cx="260" cy="250" r="6" fill="var(--accent-primary)" />
      <circle cx="200" cy="220" r="6" fill="var(--accent-primary)" opacity="0.7" />

      <circle cx="60" cy="220" r="12" fill="var(--accent-primary)" />
      <circle cx="90" cy="220" r="12" fill="color-mix(in srgb, var(--accent-primary) 80%, var(--data-planified))" />
      <circle cx="120" cy="220" r="12" fill="var(--data-planified)" />
      <circle cx="150" cy="220" r="12" fill="var(--in)" />
      <circle cx="180" cy="220" r="12" fill="var(--out)" />

      <circle cx="340" cy="60" r="4" fill="var(--accent-primary)" opacity="0.6" />
      <circle cx="360" cy="200" r="5" fill="var(--accent-primary)" opacity="0.4" />
    </svg>
  );
}

/** Mapping écran → illustration */
const ILLUSTRATIONS: Record<string, React.ComponentType> = {
  welcome: WelcomeIllustration,
  dashboard: DashboardIllustration,
  transactions: TransactionIllustration,
  caisses: CaisseIllustration,
  events: EventIllustration,
  reports: ReportIllustration,
  org: OrgIllustration,
};

const SCREENS = [
  {
    id: "welcome",
    badge: "Bienvenue",
    title: "Gérez vos finances simplement",
    description:
      "Suivez vos revenus, vos dépenses et vos versements — hors ligne, sécurisé, accessible à tous.",
  },
  {
    id: "dashboard",
    badge: "Tableau de bord",
    title: "Vue d’ensemble en un coup d’œil",
    description:
      "Consultez le solde de chaque caisse, les transactions récentes et les événements à venir.",
  },
  {
    id: "transactions",
    badge: "Transactions",
    title: "Enregistrez chaque mouvement",
    description:
      "Quelques touches suffisent pour saisir une dépense ou une entrée. Tout reste traçable.",
  },
  {
    id: "caisses",
    badge: "Caisses & Groupes",
    title: "Organisez vos fonds",
    description:
      "Chaque groupe possède sa caisse. Faites des versements entre caisses en toute simplicité.",
  },
  {
    id: "events",
    badge: "Événements",
    title: "Planifiez chaque célébration",
    description:
      "Créez un événement avec un budget, suivez les dépenses en temps réel.",
  },
  {
    id: "reports",
    badge: "Rapports",
    title: "Bilans et exports professionnels",
    description:
      "Générez des bilans financiers signés au nom de votre organisation, à tout moment.",
  },
  {
    id: "org",
    badge: "Votre organisation",
    title: "Nom, marque et thème",
    description:
      "Donnez une identité à votre organisation : nom, sigle, type et couleurs. Elle habille chaque écran.",
  },
];

const TOTAL_STEPS = SCREENS.length;

export default function Onboarding() {
  const navigate = useNavigate();
  const [initial] = useState<OnboardingState>(loadOnboardingState);
  const [current, setCurrent] = useState(initial.screen);

  const isPresentation = current < SCREENS.length;
  const screen = SCREENS[current];
  const Illustration = ILLUSTRATIONS[screen.id];

  const persist = (step: number) => {
    saveOnboardingState({ ...loadOnboardingState(), screen: step });
  };

  const handleNext = () => {
    if (current >= SCREENS.length - 1) {
      // Dernière page de l'onboarding → ajout membres
      completeOnboarding(loadOnboardingState());
      navigate("/onboarding/members", { replace: true });
      return;
    }
    setCurrent((c) => c + 1);
    persist(current + 1);
  };

  const handleBack = () => {
    if (current > 0) {
      setCurrent((c) => c - 1);
      persist(current - 1);
    } else {
      completeOnboarding(loadOnboardingState());
      navigate("/dashboard", { replace: true });
    }
  };

  const CARD_VARIANTS = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    },
  };

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-primary)" }}>
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>Lumina</span>
            </div>
            {current > 0 ? (
              <button onClick={handleBack} className="text-text-tertiary text-sm font-medium">
                Précédent
              </button>
            ) : (
              <button onClick={handleBack} className="text-text-tertiary text-sm font-medium">
                Ignorer
              </button>
            )}
          </div>

          <div className="flex-1 px-6 pt-6 pb-4">
            <div className="max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-4"
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {screen.badge}
                </p>
                <h1 className="text-text-primary font-bold text-3xl leading-tight mb-4">
                  {screen.title}
                </h1>
                <p className="text-text-secondary text-lg leading-relaxed mb-8">
                  {screen.description}
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                <Illustration />
              </motion.div>
            </div>
          </div>

          <div className="px-6 pb-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex justify-center gap-2"
            >
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? "32px" : "10px",
                    height: "10px",
                    backgroundColor:
                      i === current ? "var(--accent-primary)" : "var(--surface-hover)",
                  }}
                />
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex gap-3 mt-10"
            >
              <button
                onClick={handleBack}
                className="flex-1 py-4.5 rounded-full font-semibold text-sm transition-all active:scale-95"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {current > 0 ? "Précédent" : "Ignorer"}
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-4.5 rounded-full font-semibold text-sm text-on-accent transition-all active:scale-95 flex items-center justify-center gap-2 shadow-accent"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                {current === SCREENS.length - 1 ? "Terminer" : "Suivant"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
