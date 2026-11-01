/**
 * InvitationClaim — rejoindre une organisation par code d'invitation ou QR.
 *
 * Design inspiré des standards Apple/Google (Dribbble/Pinterest aesthetic) :
 * - Hiérarchie typographique forte (titre grand, sous-titre gris, labels minimal)
 * - Espacement généreux et respirant
 * - Carte centrale avec ombre douce et bordure subtile
 * - Champ de code style "OTP" avec 6 cases individuelles (esthétique premium)
 * - Élément graphique décoratif (QR code stylisé en arrière-plan)
 * - Bouton CTA accent avec dégradé subtil et effet de pression
 * - Tokens CSS `var(--*)` uniquement, interface en français
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, QrCode, ArrowRight, Scan, X } from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionCard } from "@/design/motion/MotionCard";

type Mode = "input" | "scanning" | "validating" | "success";

const CODE_LENGTH = 6;

export default function InvitationClaim() {
  const navigate = useNavigate();
  const [codeParts, setCodeParts] = useState<Array<string>>(
    Array(CODE_LENGTH).fill(""),
  );
  const [mode, setMode] = useState<Mode>("input");
  const [error, setError] = useState("");

  const fullCode = codeParts.join("").toUpperCase();
  const isComplete = codeParts.every((p) => p.length > 0);
  const isValidFormat = /^LUMINA-[A-Z0-9]{6}$/.test(fullCode);

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
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (isValidFormat) {
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

  const handleCodeChange = (index: number, value: string) => {
    setError("");
    const next = [...codeParts];
    next[index] = value;
    setCodeParts(next);

    // Auto-focus la case suivante si remplie
    if (value && index < CODE_LENGTH - 1) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCodeKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !e.currentTarget.value && index > 0) {
      document.getElementById(`code-input-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = (e.clipboardData?.getData("text") || "").replace(/\D/g, "");
    const cleaned = pasted.replace(/LUMINA-/gi, "").slice(0, CODE_LENGTH);
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < cleaned.length; i++) {
      next[i] = cleaned[i];
    }
    setCodeParts(next);
  };

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
                transition={{ duration: 0.7 }}
                className="text-center mb-10"
              >
                <span className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border mb-6">
                  <QrCode className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--accent-primary)" }}>
                    Rejoindre une organisation
                  </span>
                </span>
                <h1 className="text-text-primary font-bold text-4xl leading-tight mb-4 tracking-tight">
                  Saisissez votre<br />
                  invitation
                </h1>
                <p className="text-text-secondary text-lg leading-relaxed max-w-sm mx-auto">
                  Entrez le code d’invitation transmis par l’administrateur,
                  ou scannez le QR code depuis l’app mobile Lumina.
                </p>
              </motion.div>

              {/* ── Carte principale ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className={`mb-10 relative ${mode === "validating" || mode === "success" ? "opacity-0 pointer-events-none" : ""}`}
              >
                {/* Décor QR code en arrière-plan (subtil) */}
                <div className="absolute -inset-1 bg-surface/30 rounded-3xl blur-2xl -z-10" />

                <MotionCard variant="flat" className="p-8 relative overflow-hidden">
                  {/* Label */}
                  <div className="flex items-center justify-between mb-8">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                      Code d’invitation
                    </label>
                    <button
                      onClick={handleScan}
                      disabled={mode === "validating" || mode === "success"}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-accent-primary text-[10px] font-bold hover:bg-surface-hover transition-all disabled:opacity-40"
                    >
                      <Scan className="w-3 h-3" /> QR
                    </button>
                  </div>

                  {/* 6 cases de code OTP */}
                  <div className="flex items-center justify-center gap-2 mb-8">
                    {codeParts.map((part, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.04 }}
                        className="relative group"
                      >
                        <input
                          id={`code-input-${index}`}
                          type="text"
                          maxLength={1}
                          value={part}
                          onChange={(e) => handleCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleCodeKeyDown(e, index)}
                          onPaste={handlePaste}
                          autoFocus={index === 0}
                          inputMode="numeric"
                          pattern="[A-Z0-9]*"
                          className="w-10 h-12 rounded-2xl text-center font-mono font-bold text-xl tracking-wider text-text-primary bg-transparent border-2 border-border focus:border-accent-primary focus:ring-0 outline-none transition-all placeholder:text-text-placeholder/30 uppercase"
                          placeholder="-"
                          style={{ color: "var(--text-primary)" }}
                        />
                        {/* Indicateur de case active */}
                        <div
                          className={`absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all ${
                            document.activeElement?.id === `code-input-${index}`
                              ? "bg-accent-primary scale-100"
                              : "bg-transparent scale-0"
                          }`}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--data-alert) 25%, transparent)" }}>
                        <X className="w-1.5 h-1.5" style={{ color: "var(--data-alert)" }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: "var(--data-alert)" }}>
                        {error}
                      </span>
                    </motion.div>
                  )}

                  <button
                    onClick={handleClaim}
                    disabled={mode === "validating" || mode === "success" || !isComplete || !isValidFormat}
                    className="w-full mt-10 py-5 rounded-2xl font-bold text-sm text-on-accent transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-accent flex items-center justify-center gap-2 uppercase tracking-wider"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    {mode === "validating" ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Validation…</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <span>Rejoindre l’organisation</span>
                      </>
                    )}
                  </button>
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
                    <div className="flex items-center justify-center gap-3 mb-5">
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

              {/* Lien alternatif scan QR */}
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
