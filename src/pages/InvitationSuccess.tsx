import { useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, Building2 } from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";

export default function InvitationSuccess() {
  const navigate = useNavigate();

  const handleGoDashboard = () => {
    navigate("/dashboard", { replace: true });
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
          <div className="px-6 py-6">
            <button
              onClick={handleGoDashboard}
              className="text-text-tertiary text-sm font-medium"
            >
              Ignorer
            </button>
          </div>

          <div className="flex-1 px-6 pt-6 pb-4">
            <div className="max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10 flex items-center justify-center"
              >
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--accent-success) 15%, transparent)" }}>
                  <CheckCircle className="w-10 h-10" style={{ color: "var(--accent-success)" }} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-8 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "var(--surface)" }}>
                    <Building2 className="w-5 h-5 text-text-primary" />
                  </div>
                  <span className="font-semibold text-text-primary">Lumina</span>
                </div>
                <h1 className="text-text-primary font-bold text-3xl leading-tight mb-4">
                  Vous avez rejoint l’organisation
                </h1>
                <p className="text-text-secondary text-lg leading-relaxed">
                  Félicitations ! Votre compte est maintenant lié à l’organisation.
                  Vous pouvez accéder au dashboard et commencer à gérer les
                  transactions.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mb-8"
              >
                <MotionCard variant="flat" className="p-6">
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Votre rôle
                    </p>
                    <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--accent-primary) 15%, transparent)" }}>
                        <Building2 className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                      </span>
                      <span className="text-text-secondary text-sm">Membre — invité par l’administrateur</span>
                    </div>
                    <p className="text-xs text-text-tertiary text-center max-w-md">
                      Vous recevrez les notifications de l’organisation et pourrez
                      consulter ses activités depuis le dashboard.
                    </p>
                  </div>
                </MotionCard>
              </motion.div>
            </div>
          </div>

          <div className="px-6 pb-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={handleGoDashboard}
                className="w-full py-4.5 rounded-full font-semibold text-sm text-on-accent transition-all active:scale-95 shadow-accent"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                Aller au dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </motion.div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
