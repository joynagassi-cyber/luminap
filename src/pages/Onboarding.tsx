/**
 * Onboarding v2 — Parcours de bienvenue premium, redesign.
 *
 * Design : fond sombre, illustrations vectorielles, typographie Inter,
 * cartes de fonctionnalités avec icônes, progression claire.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : état d'onboarding, complétion, navigation.
 */

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
  CheckCircle2,
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
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { Section, InfoCard, ActionCard, ListItem } from "@/design/components/PageShell";

const SCREENS = [
  {
    id: "welcome",
    title: "Bienvenue sur Lumina",
    subtitle: "Découvrez comment gérer votre organisation en toute simplicité.",
    icon: Building,
    features: [
      "Gestion des membres et des groupes",
      "Suivi des finances et des cotisations",
      "Organisation des événements et cultes",
      "Rapports et tableaux de bord",
    ],
  },
  {
    id: "finance",
    title: "Gestion financière simplifiée",
    subtitle: "Enregistrez vos entrées et sorties en quelques clics.",
    icon: Wallet,
    features: [
      "Saisie rapide des transactions",
      "Suivi des budgets par caisse",
      "Rapports financiers détaillés",
      "Mode hors ligne inclus",
    ],
  },
  {
    id: "members",
    title: "Votre communauté",
    subtitle: "Ajoutez et gérez vos membres facilement.",
    icon: Users,
    features: [
      "Profils détaillés avec photo",
      "Suivi des cotisations",
      "Rôles et permissions",
      "Communication simplifiée",
    ],
  },
  {
    id: "events",
    title: "Événements et cultes",
    subtitle: "Organisez vos rassemblements en toute sérénité.",
    icon: Calendar,
    features: [
      "Calendrier des événements",
      "Gestion du budget par événement",
      "Inscriptions et présences",
      "Rappels automatiques",
    ],
  },
  {
    id: "reports",
    title: "Rapports et insights",
    subtitle: "Visualisez la santé de votre organisation d'un coup d'œil.",
    icon: BarChart3,
    features: [
      "Tableaux de bord en temps réel",
      "Rapports d'activité mensuels",
      "Analyse des tendances",
      "Export PDF et CSV",
    ],
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [screenIndex, setScreenIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const state = loadOnboardingState();
  const current = SCREENS[screenIndex];
  const isLast = screenIndex === SCREENS.length - 1;

  const handleNext = () => {
    if (isLast) {
      setCompleted(true);
      completeOnboarding({ ...state, completed: true });
      navigate("/dashboard", { replace: true });
    } else {
      setScreenIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    setCompleted(true);
    completeOnboarding({ ...state, completed: true });
    navigate("/dashboard", { replace: true });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh flex flex-col">
          <TopHeader
            title="Bienvenue"
            subtitle={isLast ? "Dernière étape" : `Étape ${screenIndex + 1} sur ${SCREENS.length}`}
            onBack={() => navigate(-1)}
          />
          <div className="flex-1 px-6 pt-2 pb-safe-calc">
            <div className="max-w-md mx-auto">
              {/* Progression */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-tertiary text-xs font-medium uppercase tracking-wide">
                    Progression
                  </span>
                  <span className="text-text-primary text-xs font-medium">
                    {screenIndex + 1} / {SCREENS.length}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-hover overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((screenIndex + 1) / SCREENS.length) * 100}%` }}
                    transition={{ duration: 0.4 }}
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, var(--accent-primary), var(--accent-dark))",
                    }}
                  />
                </div>
              </div>

              {/* Contenu de l'écran actuel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                    boxShadow: "var(--shadow-accent)",
                  }}
                >
                  {current.icon && <current.icon className="w-10 h-10 text-white" />}
                </div>

                <h2 className="text-text-primary font-bold text-3xl tracking-tight mb-4">
                  {current.title}
                </h2>
                <p className="text-text-tertiary text-lg leading-relaxed mb-8">
                  {current.subtitle}
                </p>

                <Section title="Ce que vous allez pouvoir faire">
                  <div className="space-y-3">
                    {current.features.map((feature, i) => (
                      <ListItem
                        key={i}
                        icon={
                          <CheckCircle2
                            className="w-4 h-4"
                            style={{ color: "var(--in)" }}
                          />
                        }
                        title={feature}
                        chevron={false}
                      />
                    ))}
                  </div>
                </Section>
              </motion.div>

              {/* Boutons de navigation */}
              <div className="mt-10 flex gap-3">
                {!isLast && (
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-4 rounded-xl font-medium text-sm transition-all"
                    style={{
                      backgroundColor: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Passer
                  </button>
                )}
                <ActionCard
                  tone="primary"
                  onClick={handleNext}
                  aria-label={isLast ? "Terminer l'onboarding" : "Suivant"}
                >
                  {isLast ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Commencer</span>
                    </>
                  ) : (
                    <>
                      Suivant <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </ActionCard>
              </div>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
