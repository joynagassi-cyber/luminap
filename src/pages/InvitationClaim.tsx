import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, QrCode, ArrowRight, Scan } from "lucide-react";
import { IonPage, IonContent, IonInput } from "@ionic/react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";

export default function InvitationClaim() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState("");

  const handleClaim = async () => {
    setValidating(true);
    setError("");

    // Simule la validation du code d'invitation (mode local-only).
    // En production, cette validation passerait par un port DDD vers le backend.
    await new Promise((resolve) => setTimeout(resolve, 800));

    const trimmed = code.trim().toUpperCase();
    if (/^LUMINA-[A-Z0-9]{6}$/.test(trimmed)) {
      setValidated(true);
      setTimeout(() => {
        navigate("/invitation/success", { replace: true });
      }, 400);
    } else {
      setValidating(false);
      setError(
        "Code invalide. Vérifiez le code d’invitation ou scannez le QR code.",
      );
    }
  };

  const handleScan = () => {
    // Placeholder scan QR (mode local-only). En production, un port DDD
    // ouvrirait l’appareil photo et retournerait le décodage du QR.
    setCode("LUMINA-ABC123");
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
                <Scan className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>
                Lumina
              </span>
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
                    <QrCode className="w-6 h-6 text-on-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent-primary)" }}>
                      Rejoindre une organisation
                    </p>
                    <h1 className="text-text-primary font-bold text-3xl leading-tight mb-2">
                      Saisissez votre invitation
                    </h1>
                  </div>
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-10">
                  Entrez le code d’invitation transmis par l’administrateur, ou
                  scannez le QR code depuis l’app mobile Lumina.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-8"
              >
                <MotionCard variant="flat" className="p-6">
                  <div className="flex flex-col gap-4">
                    <label className="text-sm font-semibold text-text-primary">
                      Code d’invitation
                    </label>
                    <div className="relative">
                      <IonInput
                        inputMode="text"
                        value={code}
                        onIonChange={(e) => setCode(e.detail.value ?? "")}
                        placeholder="LUMINA-……"
                        className="w-full py-3.5 pr-12 pl-4 bg-surface border border-border rounded-xl text-text-primary font-mono text-sm tracking-wider focus:ring-2 focus:ring-accent-primary/40 focus:outline-none"
                        style={{ color: "var(--text-primary)" }}
                        clearInput={true}
                        clearOnEdit={false}
                      />
                      <button
                        onClick={handleScan}
                        disabled={validating || validated}
                        className="absolute right-2 top-2 h-8 w-8 rounded-lg flex items-center justify-center text-accent-primary opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
                        title="Scanner le QR code"
                      >
                        <Scan className="w-4 h-4" />
                      </button>
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 text-xs text-text-error">
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--surface-error)" }}>
                          <span className="text-[10px] font-bold text-on-error">!</span>
                        </span>
                        <span>{error}</span>
                      </div>
                    )}
                    <button
                      onClick={handleClaim}
                      disabled={validating || validated || code.trim().length === 0}
                      className="w-full py-4 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-accent"
                      style={{ backgroundColor: "var(--accent-primary)" }}
                    >
                      {validating ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
                          <span>Validation…</span>
                        </>
                      ) : validated ? (
                        <>
                          <Check className="w-4 h-4" /> <span>Validé</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" /> <span>Rejoindre l’organisation</span>
                        </>
                      )}
                    </button>
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
