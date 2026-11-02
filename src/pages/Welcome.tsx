/**
 * Welcome v2 — Écran d'accueil premium avant authentification.
 *
 * Design : fond sombre, illustration SVG premium, typographie Inter,
 * boutons d'action avec dégradé accent, safe-area aware.
 */

import { useNavigate } from "react-router-dom";
import { IonPage, IonContent } from "@ionic/react";
import { ArrowRight, LogIn } from "lucide-react";

function WelcomeIllustration() {
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="Communauté réunie autour d'un projet commun"
      className="w-full h-auto"
      style={{ maxHeight: 280 }}
    >
      <defs>
        <linearGradient id="welcome-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="welcome-book" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" />
          <stop offset="100%" stopColor="var(--accent-dark)" />
        </linearGradient>
      </defs>

      {/* Halo de fond */}
      <rect x="0" y="0" width="400" height="300" rx="32" fill="url(#welcome-sky)" />

      {/* Soleil / rayonnement */}
      <circle cx="320" cy="70" r="40" fill="var(--accent-primary)" opacity="0.14" />
      <circle cx="320" cy="70" r="24" fill="var(--accent-primary)" opacity="0.26" />

      {/* Collines géométriques */}
      <path
        d="M0 240 Q 100 180 200 220 T 400 210 L 400 300 L 0 300 Z"
        fill="var(--accent-primary)"
        opacity="0.1"
      />
      <path
        d="M0 260 Q 120 200 240 250 T 400 248 L 400 300 L 0 300 Z"
        fill="var(--accent-primary)"
        opacity="0.16"
      />

      {/* Livre ouvert au centre */}
      <g transform="translate(200 190)">
        <path
          d="M-64 8 Q -32 -14 0 2 L 0 52 Q -32 34 -64 56 Z"
          fill="url(#welcome-book)"
        />
        <path
          d="M64 8 Q 32 -14 0 2 L 0 52 Q 32 34 64 56 Z"
          fill="url(#welcome-book)"
          opacity="0.85"
        />
        <path
          d="M0 2 L 0 52"
          stroke="var(--canvas)"
          strokeWidth="2"
          opacity="0.5"
        />
      </g>

      {/* Personnages stylisés */}
      {[
        { x: 96, y: 200, s: 1 },
        { x: 144, y: 210, s: 0.9 },
        { x: 256, y: 210, s: 0.9 },
        { x: 304, y: 200, s: 1 },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          <circle cx="0" cy="-18" r="12" fill="var(--text-primary)" opacity="0.88" />
          <path
            d="M-14 16 Q 0 -2 14 16 Z"
            fill="var(--text-primary)"
            opacity="0.88"
          />
        </g>
      ))}

      {/* Étincelles */}
      {[
        { x: 72, y: 80 },
        { x: 120, y: 60 },
        { x: 340, y: 128 },
        { x: 376, y: 96 },
      ].map((s, i) => (
        <path
          key={i}
          d={`M${s.x} ${s.y - 7} L${s.x + 2.5} ${s.y - 2.5} L${s.x + 7} ${s.y} L${s.x + 2.5} ${s.y + 2.5} L${s.x} ${s.y + 7} L${s.x - 2.5} ${s.y + 2.5} L${s.x - 7} ${s.y} L${s.x - 2.5} ${s.y - 2.5} Z`}
          fill="var(--accent-primary)"
          opacity="0.6"
        />
      ))}
    </svg>
  );
}

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div
          data-screen-state="ready"
          className="min-h-dvh flex flex-col"
          style={{ backgroundColor: "var(--canvas)" }}
        >
          {/* Demi-page supérieure : illustration + message */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-safe text-center">
            <div className="w-full max-w-sm mx-auto">
              <WelcomeIllustration />
            </div>

            <h1 className="mt-8 text-text-primary font-bold text-3xl tracking-tight leading-snug">
              Votre organisation,<br />
              enfin à portée de main.
            </h1>
            <p className="mt-4 text-text-tertiary text-sm max-w-sm mx-auto leading-relaxed">
              Gérez vos membres, vos finances et vos événements en toute
              simplicité — même hors connexion. Commencez en quelques secondes.
            </p>
          </div>

          {/* Zone d'action bas d'écran */}
          <div className="px-6 pb-safe-calc pt-8">
            <button
              type="button"
              onClick={() => navigate("/auth", { replace: true })}
              className="w-full py-5 rounded-2xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-accent"
              style={{
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                color: "var(--on-accent)",
              }}
              aria-label="Commencer — accéder à la connexion"
            >
              Commencer
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/auth", { replace: true })}
              className="mt-4 w-full py-4 rounded-2xl font-medium text-sm transition-all active:scale-[0.97]"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
              }}
              aria-label="J'ai déjà un compte — se connecter"
            >
              <LogIn className="w-4 h-4 mr-2" /> J'ai déjà un compte
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
