import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Copy,
  QrCode,
  Share2,
  Users,
  Clock,
} from "lucide-react";
import {
  IonPage,
  IonContent,
} from "@ionic/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";

export default function OnboardingMembers() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("LUMINA-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [copied, setCopied] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateQr = () => {
    setQrGenerated(true);
  };

  const handleSkip = () => {
    navigate("/dashboard", { replace: true });
  };

  const handleDone = () => {
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
          <div className="flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-primary)" }}>
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>Lumina</span>
            </div>
            <button
              onClick={handleSkip}
              className="text-text-tertiary text-sm font-medium"
            >
              Je le ferai plus tard
            </button>
          </div>

          <div className="flex-1 px-6 pt-6 pb-4">
            <div className="max-w-md mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Équipe de gestion
                </p>
                <h1 className="text-text-primary font-bold text-3xl leading-tight mb-4">
                  Ajoutez les membres de votre équipe
                </h1>
                <p className="text-text-secondary text-lg leading-relaxed">
                  Générez une invitation pour faire rejoindre votre organisation
                  à vos collaborateurs. Ils pourront l’accepter avec ce code ou
                  le QR code.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mb-8"
              >
                <MotionCard variant="flat" className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-text-primary">
                        Code d’invitation
                      </p>
                      <button
                        onClick={handleCopy}
                        className="text-xs font-medium text-accent-primary transition-colors hover:underline"
                      >
                        {copied ? "Copié !" : "Copier"}
                      </button>
                    </div>
                    <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-4">
                      <span className="font-mono text-sm font-bold text-text-primary tracking-wider">
                        {inviteCode}
                      </span>
                    </div>
                    <button
                      onClick={handleGenerateQr}
                      disabled={qrGenerated}
                      className="w-full py-3 rounded-xl text-sm font-medium text-accent-primary transition-all active:scale-95 disabled:opacity-50 border border-accent-primary/30"
                    >
                      {qrGenerated ? "QR code généré" : "Générer le QR code"}
                    </button>
                  </div>
                </MotionCard>

                {qrGenerated && (
                  <MotionCard variant="flat" className="p-6">
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-sm font-semibold text-text-primary">
                        QR code d’invitation
                      </p>
                      <div className="w-32 h-32 rounded-lg border border-border bg-surface flex items-center justify-center">
                        <QrCode className="w-28 h-28" />
                      </div>
                      <p className="text-xs text-text-tertiary text-center">
                        Scannez ce QR code avec l’app mobile Lumina pour rejoindre l’organisation.
                      </p>
                    </div>
                  </MotionCard>
                )}
              </motion.div>
            </div>
          </div>

          <div className="px-6 pb-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex gap-3 mt-8"
            >
              <button
                onClick={handleSkip}
                className="flex-1 py-4.5 rounded-full font-semibold text-sm transition-all active:scale-95"
                style={{
                  backgroundColor: "var(--surface)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Ignorer pour l’instant
              </button>
              <button
                onClick={handleDone}
                className="flex-1 py-4.5 rounded-full font-semibold text-sm text-on-accent transition-all active:scale-95 flex items-center justify-center gap-2 shadow-accent"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                Terminer
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
