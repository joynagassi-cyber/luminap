/**
 * InvitationClaim — rejoindre une organisation par code d'invitation ou QR.
 *
 * Design Apple/Google polissé :
 * - Zone de scan QR dédiée avec cadre animé (coin supérieur/inférieur)
 * - Champ de saisie du code d'invitation (format LUMINA-XXXXXX)
 * - Validation avec état de chargement et gestion d'erreur
 * - Tokens CSS `var(--*)` uniquement, interface en français
 * - Animations framer-motion entre les états
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Check, QrCode, ArrowRight, Scan, X } from "lucide-react";
import { IonPage, IonContent, IonInput } from "@ionic/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";

type Mode = "input" | "scanning" | "validating" | "success";

const SCANNER_VARIANTS = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

const CORNER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, delay: 0.1 },
  },
};

export default function InvitationClaim() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("input");
  const [error, setError] = useState("");

  const handleScan = () => {
    setError("");
    setMode("scanning");
  };

  const handleScanResult = (scannedCode: string) => {
    setCode(scannedCode);
    setMode("input");
    setMode("validating");
  };

  const handleCloseScanner = () => {
    setMode("input");
    setError("");
  };

  const handleClaim = async () => {
    setError("");
    setMode("validating");

    // Simule la validation du code d'invitation (mode local-only).
    // En production, cette validation passerait par un port DDD vers le backend.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const trimmed = code.trim().toUpperCase();
    if (/^LUMINA-[A-Z0-9]{6}$/.test(trimmed)) {
      setMode("success");
      setTimeout(() => {
        navigate("/invitation/success", { replace: true });
      }, 800);
    } else {
      setMode("input");
      setError(
        "Code invalide. Vérifiez le code d’invitation ou scannez le QR code.",
      );
    }
  };

  const handleUseCodeInstead = () => {
    setMode("input");
    setError("");
  };

  const isValidFormat = /^LUMINA-[A-Z0-9]{6}$/.test(code.trim().toUpperCase());
  const canValidate = code.trim().length > 0;

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh flex flex-col">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-primary)" }}>
                <Scan className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight" style={{ color: "var(--text-primary)" }}>
                Lumina
              </span>
            </div>
            <button
              onClick={() => navigate("/onboarding/choice", { replace: true })}
              className="text-text-tertiary text-sm font-medium"
            >
              Annuler
            </button>
          </div>

          <div className="flex-1 px-6 pt-6 pb-4 overflow-y-auto">
            <div className="max-w-md mx-auto">
              {/* ── En-tête de section ── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-10 text-center"
              >
                <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border mb-4">
                  <QrCode className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent-primary)" }}>
                    Rejoindre une organisation
                  </span>
                </div>
                <h1 className="text-text-primary font-bold text-3xl leading-tight mb-3">
                  Saisissez votre invitation
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Entrez le code d’invitation transmis par l’administrateur, ou
                  scannez le QR code depuis l’app mobile Lumina.
                </p>
              </motion.div>

              {/* ── Zone de scan QR (quand mode scanning) ── */}
              <AnimatePresence mode="wait">
                {mode === "scanning" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="mb-8 relative"
                  >
                    <MotionCard variant="flat" className="p-0 overflow-hidden relative" style={{ minHeight: "260px" }}>
                      {/* Cadre de scan */}
                      <div className="relative w-full h-full flex items-center justify-center bg-black/5 backdrop-blur-sm">
                        <div className="w-[80%] h-[60%] max-w-xs max-h-[260px] border border-white/30 rounded-xl relative overflow-hidden">
                          {/* Corners du cadre de scan */}
                          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white"></div>
                          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white"></div>
                          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white"></div>
                          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white"></div>

                          {/* Ligne de scan animée */}
                          <motion.div
                            initial={{ y: "0%" }}
                            animate={{
                              y: ["0%", "100%"],
                              loop: Infinity,
                            }}
                            transition={{
                              duration: 2,
                              ease: "linear",
                            }}
                            className="absolute left-0 right-0 h-px bg-accent-primary/60 shadow-[0_0_10px_var(--accent-primary)]"
                          />

                          {/* Icône QR au centre */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <QrCode className="w-16 h-16 text-white/40" />
                            <p className="mt-4 text-xs font-medium text-white/80 uppercase tracking-wider">
                              Positionnez le QR code
                            </p>
                            <p className="text-[10px] text-white/50">
                              dans le cadre ci-dessus
                            </p>
                          </div>
                        </div>

                        {/* Boutons en dessous du cadre */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                          <button
                            onClick={handleCloseScanner}
                            className="px-4 py-2.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-medium hover:bg-white/20 transition-colors active:scale-95"
                          >
                            Utiliser le code
                          </button>
                        </div>
                      </div>

                      {/* Overlay instructif */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="bg-black/40 backdrop-blur px-6 py-3 rounded-full border border-white/10">
                          <Scan className="w-4 h-4 text-white mr-2" />
                          <span className="text-white text-sm font-medium">Scanner le QR code d’invitation</span>
                        </div>
                      </div>
                    </MotionCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Zone de saisie du code ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`mb-8 ${mode === "validating" || mode === "success" ? "opacity-0 pointer-events-none" : ""}`}
              >
                <MotionCard variant="flat" className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-text-primary">
                        Code d’invitation
                      </label>
                      <button
                        onClick={handleScan}
                        disabled={mode === "validating" || mode === "success"}
                        className="text-xs font-medium text-accent-primary hover:opacity-80 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <Scan className="w-3.5 h-3.5" /> Scanner QR
                      </button>
                    </div>
                    <div className="relative group">
                      <IonInput
                        inputMode="text"
                        value={code}
                        onIonChange={(e) => {
                          setCode(e.detail.value?.toUpperCase() ?? "");
                          setError("");
                        }}
                        placeholder="LUMINA-……"
                        maxLength={13}
                        className="w-full py-4 pr-12 pl-5 bg-surface border border-border rounded-2xl text-text-primary font-mono text-sm tracking-widest uppercase focus:ring-2 focus:ring-accent-primary/40 focus:outline-none focus:border-accent-primary transition-all"
                        style={{ color: "var(--text-primary)" }}
                        clearInput={true}
                        clearOnEdit={false}
                      />
                      <button
                        onClick={handleScan}
                        disabled={mode === "validating" || mode === "success"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center text-accent-primary/70 group-hover:text-accent-primary transition-all disabled:opacity-40"
                        title="Scanner le QR code"
                      >
                        <Scan className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--data-alert) 20%, transparent)" }}>
                          <X className="w-2.5 h-2.5" style={{ color: "var(--data-alert)" }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: "var(--data-alert)" }}>{error}</span>
                      </div>
                    )}

                    <button
                      onClick={handleClaim}
                      disabled={
                        mode === "validating" ||
                        mode === "success" ||
                        !canValidate ||
                        !isValidFormat
                      }
                      className="w-full py-4.5 rounded-2xl font-semibold text-sm text-on-accent transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-accent flex items-center justify-center gap-2"
                      style={{ backgroundColor: "var(--accent-primary)" }}
                    >
                      {mode === "validating" ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Validation…</span>
                        </>
                      ) : mode === "success" ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Validé — redirection…</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          <span>Rejoindre l’organisation</span>
                        </>
                      )}
                    </button>
                  </div>
                </MotionCard>
              </motion.div>

              {/* État de validation en cours */}
              <AnimatePresence mode="wait">
                {mode === "validating" && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="mb-8 text-center"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-accent-primary animate-spin" />
                      <span className="text-sm font-medium text-text-secondary">
                        Validation de l’invitation…
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-text-tertiary">
                      Veuillez patienter, nous vérifions votre code.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* État de succès */}
              <AnimatePresence mode="wait">
                {mode === "success" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    className="mb-8 text-center"
                  >
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "color-mix(in srgb, var(--data-success) 15%, transparent)" }}>
                      <Check className="w-8 h-8" style={{ color: "var(--data-success)" }} />
                    </div>
                    <p className="text-text-primary font-bold text-lg mb-2">
                      Invitation validée
                    </p>
                    <p className="text-text-secondary text-sm">
                      Redirection vers votre organisation…
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Lien alternatif */}
              {mode === "input" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="mt-8 text-center"
                >
                  <button
                    onClick={handleScan}
                    disabled={mode === "validating" || mode === "success"}
                    className="text-xs font-medium text-text-tertiary hover:text-accent-primary transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Scan className="w-3 h-3" />
                    Vous avez un QR code ? Scannez-le
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
