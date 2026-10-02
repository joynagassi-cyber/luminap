// GoogleButton — bouton « Continuer avec Google » : SVG officiel 4 couleurs
// (marque Google, hex hardcodés volontairement — pas un design token Lumina),
// style blanc-invariant dans les deux modes (M19 : extrait du JSX de AuthPage
// pour un point de test/montage stable, réutilisable par un futur flow "Ou…").
import React from "react";

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H28v8h7.6c-1.7 4.7-6.1 7.9-11.6 7.9-6.8 0-12.3-5.5-12.3-12.3S17.1 13.3 24 13.3c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.3 24 4.3 12.9 4.3 3.9 13.3 3.9 24.5S12.9 45 24 45s20.1-9 20.1-20.1c0-1.6-.3-3.1-.5-4.8z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 11.9 24 11.9c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.5 4.3 24 4.3 16.7 4.3 10.2 8.7 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.5 0 10.4-2.2 14.1-5.6l-6.5-5.6c-2.1 1.6-4.8 2.6-7.6 2.6-5.5 0-10.2-3.6-11.8-8.5l-6.3 5C10.2 40.3 16.5 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H28v8h7.6c-.9 2.2-2.3 4-4 5.5l6.5 5.6C42.7 35.4 45 30.1 45 24.5 45 22.8 44.5 21.2 43.6 20.1z"
      />
    </svg>
  );
}

interface GoogleButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function GoogleButton({ onClick, disabled }: GoogleButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3.5 rounded-full font-medium text-sm flex items-center justify-center gap-3 mb-4 transition-all active:scale-95 disabled:opacity-50"
      style={{
        // Bouton Google : blanc fixe dans les deux modes (contraste
        // préservé sur canvas clair comme sombre) — couleurs de marque.
        backgroundColor: "var(--surface)",
        color: "var(--text-secondary)",
        border: "1px solid var(--border)",
      }}
      aria-label="Continuer avec Google"
    >
      <GoogleIcon className="w-5 h-5" />
      Continuer avec Google
    </button>
  );
}
