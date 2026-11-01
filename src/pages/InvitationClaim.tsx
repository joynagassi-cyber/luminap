/**
 * InvitationClaim — rejoindre une organisation par code d'invitation ou QR.
 *
 * Design inspiré des standards Apple/Google (réf. écrans OTP + scanner QR) :
 * - Barre de section avec deux modes : « Code » / « Scanner QR »
 * - Mode Code : 6 cases individuelles style OTP (image « Code Verification »)
 * - Mode Scanner : cadre de scan avec ligne animée (image téléphone scanner)
 * - Bouton « Rejoindre » vert quand le code est complet et valide
 * - Hiérarchie typographique forte, espacement premium, ombre douce
 * - Tokens CSS `var(--*)` uniquement, interface en français
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, QrCode, ArrowRight, Scan, X, ChevronRight } from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionCard } from "@/design/motion/MotionCard";

type Mode = "code" | "scan";

const CODE_LENGTH = 6;

export default function InvitationClaim() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("code");
  const [codeParts, setCodeParts] = useState<Array<string>>(
    Array(CODE_LENGTH).fill(""),
  );
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");
  const activeIndex = useRef(0);

  const fullCode = `LUMINA-${codeParts.join("").toUpperCase()}`;
  const isComplete = codeParts.every((p) => p.length > 0);
  const isValidFormat = /^LUMINA-[A-Z0-9]{6}$/.test(fullCode);

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const handleScan = () => {
    setError("");
    setMode("scan");
  };

  const handleCloseScanner = () => {
    setMode("code");
  };

  const handleClaim = async () => {
    setError("");
    setValidating(true);

    // Simule la validation du code d'invitation (mode local-only).
    // En production, cette validation passerait par un port DDD vers le backend.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (isValidFormat) {
      setValidating(false);
      navigate("/invitation/success", { replace: true });
    } else {
      setValidating(false);
      setError(
        "Code invalide. Vérifiez le code d’invitation ou scannez le QR code.",
      );
    }
  };

  const handleCodeChange = useCallback(
    (index: number, value: string) => {
      setError("");
      const next = [...codeParts];
      next[index] = value.toUpperCase();
      setCodeParts(next);

      // Auto-focus la case suivante si remplie
      if (value && index < CODE_LENGTH - 1) {
        const nextInput = document.getElementById(`code-input-${index + 1}`);
        nextInput?.focus();
        activeIndex.current = index + 1;
      }
    },
    [codeParts],
  );

  const handleCodeKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !e.currentTarget.value && index > 0) {
      document.getElementById(`code-input-${index - 1}`)?.focus();
      activeIndex.current = index - 1;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = (e.clipboardData?.getData("text") || "").replace(/\D/g, "");
    const cleaned = pasted.slice(0, CODE_LENGTH);
    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < cleaned.length; i++) {
      next[i] = cleaned[i];
    }
    setCodeParts(next);
    if (cleaned.length > 0) {
      const lastFilled = document.getElementById(
        `code-input-${Math.min(cleaned.length - 1, CODE_LENGTH - 1)}`,
      );
      lastFilled?.focus();
      activeIndex.current = Math.min(cleaned.length - 1, CODE_LENGTH - 1);
    }
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
                className="text-center mb-8"
              >
                <h1 className="text-text-primary font-bold text-3xl leading-tight mb-4 tracking-tight">
                  Rejoindre votre<br />
                  organisation
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed max-w-xs mx-auto">
                  Saisissez le code d’invitation à 6 chiffres transmis par
                  l’administrateur, ou scannez le QR code.
                </p>
              </motion.div>

              {/* ── Barre de section : Code / Scanner ── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-10 relative"
              >
                <div
                  className="w-full rounded-2xl bg-surface border border-border p-1 flex"
                >
                  <button
                    onClick={() => handleModeChange("code")}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                      mode === "code"
                        ? "bg-accent-primary text-on-accent shadow-accent"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <QrCode className="w-4 h-4 mr-2" /> Code
                  </button>
                  <button
                    onClick={() => handleModeChange("scan")}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                      mode === "scan"
                        ? "bg-accent-primary text-on-accent shadow-accent"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Scan className="w-4 h-4 mr-2" /> Scanner QR
                  </button>
                </div>
              </motion.div>

              {/* ── MODE CODE ── */}
              <AnimatePresence mode="wait">
                {mode === "code" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`relative mb-10 ${
                      validating ? "opacity-0 pointer-events-none" : ""
                    }`}
                  >
                    <MotionCard variant="flat" className="p-0 overflow-hidden">
                      <div className="p-8">
                        {/* Label */}
                        <div className="flex items-center justify-between mb-8">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                            Code d’invitation
                          </label>
                          <button
                            onClick={handleScan}
                            disabled={validating}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-accent-primary text-[10px] font-bold hover:bg-surface-hover transition-all disabled:opacity-40"
                          >
                            <Scan className="w-3 h-3" /> Scanner le QR
                          </button>
                        </div>

                        {/* 6 cases OTP */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.03 }}
                              className="relative group"
                            >
                              <input
                                id={`code-input-${i}`}
                                type="text"
                                maxLength={1}
                                value={codeParts[i]}
                                onChange={(e) =>
                                  handleCodeChange(i, e.target.value)
                                }
                                onKeyDown={(e) => handleCodeKeyDown(e, i)}
                                onPaste={handlePaste}
                                autoFocus={i === 0}
                                inputMode="text"
                                className="w-11 h-14 rounded-2xl text-center font-mono font-bold text-xl tracking-wider text-text-primary bg-transparent border-2 border-border focus:border-accent-primary focus:ring-0 outline-none transition-all placeholder:text-text-placeholder/30 uppercase"
                                placeholder=""
                                style={{ color: "var(--text-primary)" }}
                              />
                              {/* Indicateur de case active */}
                              <div
                                className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all ${
                                  document.activeElement?.id ===
                                  `code-input-${i}`
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
                          disabled={
                            validating ||
                            !isComplete ||
                            !isValidFormat
                          }
                          className="w-full mt-10 py-5 rounded-2xl font-bold text-sm text-on-accent transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-accent flex items-center justify-center gap-2 uppercase tracking-wider"
                          style={{ backgroundColor: "var(--accent-primary)" }}
                        >
                          {validating ? (
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
                      </div>
                    </MotionCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── MODE SCAN ── */}
              <AnimatePresence mode="wait">
                {mode === "scan" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="mb-10 relative"
                  >
                    <MotionCard variant="flat" className="p-0 overflow-hidden relative" style={{ minHeight: "340px" }}>
                      {/* Fond sombre du scanner */}
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />

                      {/* Cadre de scan centré */}
                      <div className="relative z-10 w-full h-full flex items-center justify-center pt-6 pb-8">
                        <div className="w-[85%] h-[52%] max-w-md max-h-[300px] border-2 border-white/40 rounded-2xl relative overflow-hidden">
                          {/* Corners du cadre de scan */}
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>

                          {/* Ligne de scan animée */}
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
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur text-text-primary text-xs font-semibold hover:bg-white transition-colors active:scale-95 shadow-pop"
                      >
                        <ChevronRight className="w-3.5 h-3.5" /> Saisir le code à la place
                      </button>
                    </MotionCard>

                    {/* Instructions sous le scanner */}
                    <div className="mt-6 text-center">
                      <p className="text-text-secondary text-sm">
                        Scannez le QR code d’invitation depuis l’app mobile
                        Lumina.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── État succès ── */}
              <AnimatePresence mode="wait">
                {mode === "code" && validating === false && isValidFormat && isComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
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

              {/* ── Lien alternatif (quand mode code, pas encore scanné) ── */}
              {mode === "code" && !validating && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="text-center"
                >
                  <button
                    onClick={handleScan}
                    disabled={validating}
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
