/**
 * InvitationClaim — rejoindre une organisation par code d'invitation ou QR.
 *
 * Design Apple/Google polissé : minimaliste, généreux en espacement,
 * typo hiérarchisée, cartes en surface avec ombres douces, accents
 * couleur dégradés. Interface en français, tokens CSS `var(--*)` uniquement.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, QrCode, ArrowRight, Scan, X } from "lucide-react";
import { IonPage, IonContent, IonInput } from "@ionic/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MotionCard } from "@/design/motion/MotionCard";

type Mode = "input" | "scanning" | "validating" | "success";

export default function InvitationClaim() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("input");
  const [error, setError] = useState("");

  const handleScan = () => {
    setError("");
    setMode("scanning");
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
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const trimmed = code.trim().toUpperCase();
    if (/^LUMINA-[A-Z0-9]{6}$/.test(trimmed)) {
      setMode("success");
      setTimeout(() => {
        navigate("/invitation/success", { replace: true });
      }, 900);
    } else {
      setMode("input");
      setError(
        "Code invalide. Vérifiez le code d’invitation ou scannez le QR code.",
      );
    }
  };

  const isValidFormat = /^LUMINA-[A-Z0-9]{6}$/.test(code.trim().toUpperCase());
  const canValidate = code.trim().length > 0;

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh flex flex-col">
          {/* ── Header avec logo Lumina ── */}
          <div className="flex items-center justify-between px-6 py-6">
            <img
              src="/lumina-logo-version-monochrome.png"
              alt="Lumina"
              className="w-10 h-10 object-contain"
            />
            <button
              onClick={() => navigate("/onboarding/choice", { replace: true })}
              className="text-text-tertiary text-sm font-medium"
            >
              Annuler
            </button>
          </div>

          <div className="flex-1 px-6 pt-2 pb-4 overflow-y-auto">
            <div className="max-w-md mx-auto">
              {/* ── En-tête de section ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center justify-center gap-2.5 px-4 py-2 rounded-2xl bg-surface border border-border mb-6">
                  <QrCode className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>
                    Rejoindre une organisation
                  </span>
                </div>
                <h1 className="text-text-primary font-bold text-4xl leading-tight mb-4 tracking-tight">
                  Saisissez votre<br />
                  invitation
                </h1>
                <p className="text-text-secondary text-lg leading-relaxed max-w-sm mx-auto">
                  Entrez le code d’invitation transmis par l’administrateur,
                  ou scannez le QR code depuis l’app mobile Lumina.
                </p>
              </motion.div>

              {/* ── Zone de scan QR (plein écran dans la carte) ── */}
              <AnimatePresence mode="wait">
                {mode === "scanning" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="mb-10 relative"
                  >
                    <MotionCard variant="flat" className="p-0 overflow-hidden relative" style={{ minHeight: "320px" }}>
                      {/* Fond sombre du scanner */}
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
                      {/* Cadre de scan centré */}
                      <div className="relative z-10 w-full h-full flex items-center justify-center">
                        <div className="w-[85%] h-[55%] max-w-md max-h-[280px] border-2 border-white/40 rounded-2xl relative overflow-hidden">
                          {/* Corners animés */}
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>

                          {/* Ligne de scan */}
                          <motion.div
                            initial={{ y: "0%" }}
                            animate={{ y: ["0%", "100%"], loop: Infinity }}
                            transition={{ duration: 2, ease: "linear" }}
                            className="absolute left-0 right-0 h-[2px] bg-accent-primary shadow-[0_0_15px_color-mix(in_srgb,var(--accent-primary)_60%_transparent)]"
                          />

                          {/* Icône QR centrale */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <QrCode className="w-20 h-20 text-white/30" />
                            <p className="mt-5 text-white text-sm font-medium uppercase tracking-wider">
                              Positionnez le QR code
                            </p>
                            <p className="text-[10px] text-white/50 leading-none">
                              dans le cadre ci-dessus
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bouton fermer scanner */}
                      <button
                        onClick={handleCloseScanner}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur text-text-primary text-xs font-semibold hover:bg-white transition-colors active:scale-95 shadow-pop"
                      >
                        <X className="w-3.5 h-3.5" /> Utiliser le code à la place
                      </button>
                    </MotionCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Zone de saisie du code ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={`mb-10 ${mode === "validating" || mode === "success" ? "opacity-0 pointer-events-none" : ""}`}
              >
                <MotionCard variant="flat" className="p-0 overflow-hidden">
                  <div className="p-7">
                    <div className="flex items-center justify-between mb-5">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                        Code d’invitation
                      </label>
                      <button
                        onClick={handleScan}
                        disabled={mode === "validating" || mode === "success"}
                        className="text-xs font-bold text-accent-primary hover:opacity-80 transition-opacity disabled:opacity-30 flex items-center gap-1.5 uppercase tracking-wider"
                      >
                        <Scan className="w-3.5 h-3.5" /> Scanner QR
                      </button>
                    </div>
                    <div className="relative">
                      <IonInput
                        inputMode="text"
                        value={code}
                        onIonChange={(e) => {
                          setCode((e.detail.value ?? "").toUpperCase());
                          setError("");
                        }}
                        placeholder="LUMINA-……"
                        maxLength={13}
                        className="w-full py-5 pr-12 pl-5 bg-transparent border-b-2 border-border font-mono text-xl tracking-widest uppercase text-text-primary focus:border-accent-primary focus:ring-0 outline-none transition-colors placeholder:text-text-placeholder/40"
                        style={{ color: "var(--text-primary)" }}
                        clearInput={true}
                        clearOnEdit={false}
                      />
                      <button
                        onClick={handleScan}
                        disabled={mode === "validating" || mode === "success"}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-accent-primary/60 hover:text-accent-primary transition-all disabled:opacity-30"
                        title="Scanner le QR code"
                      >
                        <Scan className="w-3 h-3" />
                      </button>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 flex items-center gap-2.5"
                      >
                        <div className="w-2.5 h-2.5 rounded-full flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--data-alert) 25%, transparent)" }}>
                          <X className="w-2 h-2" style={{ color: "var(--data-alert)" }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: "var(--data-alert)" }}>
                          {error}
                        </span>
                      </motion.div>
                    )}

                    <button
                      onClick={handleClaim}
                      disabled={mode === "validating" || mode === "success" || !canValidate || !isValidFormat}
                      className="w-full mt-8 py-5 rounded-2xl font-bold text-sm text-on-accent transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none shadow-accent flex items-center justify-center gap-2 uppercase tracking-wider"
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
                          <span>Validé</span>
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

              {/* État validation en cours */}
              <AnimatePresence mode="wait">
                {mode === "validating" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="mb-10 text-center"
                  >
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-full border-3 border-t-transparent border-accent-primary animate-spin" />
                    </div>
                    <p className="text-text-primary font-medium text-lg mb-2">
                      Validation de l’invitation…
                    </p>
                    <p className="text-text-secondary text-sm">
                      Veuillez patienter, nous vérifions votre code.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* État succès */}
              <AnimatePresence mode="wait">
                {mode === "success" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="mb-10 text-center"
                  >
                    <div className="w-18 h-18 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "color-mix(in srgb, var(--data-success) 15%, transparent)" }}>
                      <Check className="w-9 h-9" style={{ color: "var(--data-success)" }} />
                    </div>
                    <h2 className="text-text-primary font-bold text-2xl mb-3">
                      Invitation validée
                    </h2>
                    <p className="text-text-secondary text-sm max-w-xs mx-auto leading-relaxed">
                      Redirection vers votre organisation en cours…
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Lien alternatif scan */}
              {mode === "input" && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="text-center"
                >
                  <button
                    onClick={handleScan}
                    disabled={mode === "validating" || mode === "success"}
                    className="inline-flex items-center gap-2 text-xs font-medium text-text-tertiary hover:text-accent-primary transition-colors uppercase tracking-wider"
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
