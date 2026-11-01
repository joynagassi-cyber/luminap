import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  UserPlus,
  Info,
  ArrowRight,
} from "lucide-react";
import {
  IonPage,
  IonContent,
} from "@ionic/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";

export default function OnboardingChoice() {
  const navigate = useNavigate();
  const [branchLoading, setBranchLoading] = useState<"creator" | "member" | null>(null);

  const handleBranchChoice = (choice: "creator" | "member") => {
    setBranchLoading(choice);
    setTimeout(() => {
      if (choice === "creator") {
        navigate("/org-setup", { replace: true });
      } else {
        navigate("/invitation/claim", { replace: true });
      }
    }, 150);
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
                <UsersIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>Lumina</span>
            </div>
          </div>

          <div className="flex-1 px-6 pt-6 pb-4">
            <div className="max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-primary)" }}>
                    <Info className="w-6 h-6 text-on-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent-primary)" }}>Votre parcours</p>
                    <h1 className="text-text-primary font-bold text-3xl leading-tight mb-2">Comment démarrer ?</h1>
                  </div>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-10">
                  Deux portes d’entrée. Le premier créateur fonde son organisation&nbsp;; les autres la rejoignent par invitation.
                </p>
              </motion.div>

              {/* Creator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-5"
              >
                <MotionCard
                  variant="flat"
                  onPress={() => handleBranchChoice("creator")}
                  className="p-6"
                  style={{
                    border: branchLoading === "creator" ? "2px solid var(--accent-primary)" : "1px solid var(--surface-hover)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--accent-primary) 20%, transparent)" }}>
                      <ShieldCheck className="w-6 h-6" style={{ color: "var(--accent-primary)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary font-semibold">Je crée mon organisation</p>
                      <p className="text-text-tertiary text-xs mt-1.5 leading-relaxed">
                        Administrateur — vous fondez l’organisation&nbsp;: nom, type, thème et modules.
                      </p>
                    </div>
                    {branchLoading === "creator" && (
                      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
                    )}
                  </div>
                </MotionCard>
              </motion.div>

              {/* Member */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-10"
              >
                <MotionCard
                  variant="flat"
                  onPress={() => handleBranchChoice("member")}
                  className="p-6"
                  style={{
                    border: branchLoading === "member" ? "2px solid var(--accent-primary)" : "1px solid var(--surface-hover)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in srgb, var(--accent-primary) 20%, transparent)" }}>
                      <UserPlus className="w-6 h-6" style={{ color: "var(--accent-primary)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary font-semibold">Je rejoins par invitation</p>
                      <p className="text-text-tertiary text-xs mt-1.5 leading-relaxed">
                        Membre — code, QR, fichier ou proximité. Vous êtes intégré au rôle qui vous a été attribué.
                      </p>
                    </div>
                    {branchLoading === "member" && (
                      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
                    )}
                  </div>
                </MotionCard>
              </motion.div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

// Petite icône Users inline pour éviter une import supplémentaire
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.47" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
