import React, { useState, useEffect } from "react";
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

  if (!open) return null;

  const isConfirmDisabled = requiredText ? inputValue !== requiredText : false;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 pb-8"
        style={{ backgroundColor: "#212121" }}
      >
        <div
          className="w-12 h-1 rounded-full bg-surface-active mx-auto mb-4 sm:hidden"
          aria-hidden="true"
        />
        <h3 className="text-lg font-bold text-text-primary mb-2 text-center">
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
                  color: confirmVariant === "danger" ? "#E51332" : "var(--accent-primary)",
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
                backgroundColor: "#121212",
                border: "1px solid #282828",
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
            style={{ backgroundColor: "#282828", color: "#B3B3B3" }}
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
                confirmVariant === "danger" ? "#E51332" : "var(--accent-primary)",
              color: "#FFFFFF",
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
