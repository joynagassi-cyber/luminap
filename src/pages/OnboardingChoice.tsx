/**
 * OnboardingChoice v2 — Choix du parcours créateur/membre, redesign premium.
 *
 * Design : fond sombre, deux cartes d'action claires avec icônes,
 * typographie Inter, espacement cohérent.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 */

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
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { ActionCard } from "@/design/components/PageShell";

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
    }, 200);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh flex flex-col">
          <TopHeader
            title="Votre parcours"
            subtitle="Deux portes d'entrée pour démarrer avec Lumina"
          />
          <div className="flex-1 px-6 pt-2 pb-safe-calc">
            <div className="max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: "var(--accent-primary)" }}
                  >
                    <Info className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent-primary)" }}>
                      Votre parcours
                    </p>
                    <h1 className="text-text-primary font-bold text-3xl leading-tight mb-2">
                      Comment démarrer ?
                    </h1>
                  </div>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-10">
                  Deux portes d'entrée. Le premier créateur fonde son organisation ;
                  les autres la rejoignent par invitation.
                </p>
              </motion.div>

              {/* Creator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-5"
              >
                <ActionCard
                  tone="primary"
                  onPress={() => handleBranchChoice("creator")}
                  className="p-6"
                  style={{
                    border: branchLoading === "creator" ? "2px solid var(--accent-primary)" : "1px solid var(--surface-hover)",
                  }}
                  aria-label="Je crée mon organisation"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "color-mix(in srgb, var(--accent-primary) 20%, transparent)" }}
                    >
                      <ShieldCheck className="w-6 h-6" style={{ color: "var(--accent-primary)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-text-primary font-semibold">Je crée mon organisation</p>
                      <p className="text-text-tertiary text-xs mt-1.5 leading-relaxed">
                        Administrateur — vous fondez l'organisation : nom, type, thème et modules.
                      </p>
                    </div>
                    {branchLoading === "creator" && (
                      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
                    )}
                  </div>
                </ActionCard>
              </motion.div>

              {/* Member */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-10"
              >
                <ActionCard
                  tone="primary"
                  onPress={() => handleBranchChoice("member")}
                  className="p-6"
                  style={{
                    border: branchLoading === "member" ? "2px solid var(--accent-primary)" : "1px solid var(--surface-hover)",
                  }}
                  aria-label="Je rejoins par invitation"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "color-mix(in srgb, var(--accent-primary) 20%, transparent)" }}
                    >
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
                </ActionCard>
              </motion.div>
            </div>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
