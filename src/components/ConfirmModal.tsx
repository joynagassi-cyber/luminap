import React, { useState, useEffect, useRef } from "react";
import { IonButton, IonInput } from "@ionic/react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  requiredText?: string;
  onTextConfirm?: (text: string) => void;
  children?: React.ReactNode;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmer",
  confirmVariant = "danger",
  requiredText,
  onTextConfirm,
  children,
}: ModalProps) {
  const [inputValue, setInputValue] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) setInputValue("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Focus : porte le focus dans le dialog à l'ouverture, le piège (Tab /
  // Maj+Tab) pendant qu'il est ouvert, et le restitue à la fermeture.
  useEffect(() => {
    if (!open) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea"
      );
      first?.focus();
    }, 0);
    return () => {
      clearTimeout(timer);
      lastFocused.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [open]);

  if (!open) return null;

  const isConfirmDisabled = requiredText ? inputValue !== requiredText : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 pb-8 outline-none"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div
          className="w-12 h-1 rounded-full bg-surface-active mx-auto mb-4 sm:hidden"
          aria-hidden="true"
        />
        <h3
          id="confirm-modal-title"
          className="text-lg font-bold text-text-primary mb-2 text-center"
        >
          {title}
        </h3>
        <p className="text-text-tertiary text-sm text-center mb-4">
          {description}
        </p>

        {requiredText && (
          <div className="mb-4">
            <p className="text-text-secondary text-xs mb-2 text-center">
              Tapez{" "}
              <span
                className="font-bold"
                style={{
                  color: confirmVariant === "danger" ? "var(--data-expense)" : "var(--accent-primary)",
                }}
              >
                "{requiredText}"
              </span>{" "}
              pour confirmer
            </p>
            <IonInput
              type="text"
              value={inputValue}
              onIonChange={(e) => setInputValue(e.detail.value!)}
              className="w-full px-4 py-3 rounded-lg text-text-primary text-sm text-center"
              style={{
                backgroundColor: "var(--canvas)",
                border: "1px solid var(--border)",
              }}
              autoFocus
            />
          </div>
        )}

        {children}

        <div className="flex gap-3 mt-4">
          <IonButton
            onClick={onClose}
            expand="block"
            className="!rounded-full !min-height:auto text-sm font-semibold"
            style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" }}
            aria-label="Annuler"
          >
            Annuler
          </IonButton>
          <IonButton
            onClick={() => {
              if (requiredText && onTextConfirm) {
                onTextConfirm(inputValue);
              } else {
                onConfirm();
              }
            }}
            expand="block"
            disabled={isConfirmDisabled}
            className="!rounded-full !min-height:auto text-sm font-semibold !opacity-100 disabled:!opacity-40 disabled:!cursor-not-allowed active:scale-95 transition-transform"
            style={{
              backgroundColor:
                confirmVariant === "danger" ? "var(--data-expense)" : "var(--accent-primary)",
              color: "var(--text-primary)",
            }}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </IonButton>
        </div>
      </div>
    </div>
  );
}
