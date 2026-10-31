/**
 * Welcome — écran d'ONBOARDING MOBILE, avant /auth (connexion / inscription).
 *
 * ⚠️ Ce n'est PAS une landing page web : c'est un écran natif Ionic, plein
 * écran, mobile-first, qui occupe une demi-page de message inspirant et une
 * zone d'action en bas (safe-area aware). Pas de texte légal de pied de page,
 * pas de sections marketing — juste l'accueil + un passage clair vers /auth.
 *
 * Choix d'implémentation :
 *   - Route PUBLIQUE `/welcome` : atteignable sans session.
 *   - Illustration SVG inline (aucune image externe à charger → pas d'écran
 *     noir si le réseau est lent, rendu net à toute densité).
 *   - Respecte les tokens de thème (var(--canvas), var(--accent-primary), …) :
 *     s'adapte aux modes clair et sombre comme le reste de l'app.
 */
import { useNavigate } from "react-router-dom";
import { IonPage, IonContent } from "@ionic/react";
import { ArrowRight } from "lucide-react";

/**
 * Illustration « Tyler » : composition d'aplats doux + formes arrondies
 * évoquant une communauté qui se rassemble autour d'un livre (l'organisation).
 * `currentColor`/tokens de thème pour rester cohérent clair/sombre.
 */
function WelcomeIllustration() {
  return (
    <svg
      viewBox="0 0 320 240"
      role="img"
      aria-label="Une communauté rassemblée autour d'un projet commun"
      className="w-full h-auto"
      style={{ maxHeight: 260 }}
    >
      <defs>
        <linearGradient id="lumina-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lumina-book" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-primary)" />
          <stop offset="100%" stopColor="var(--accent-secondary, var(--accent-primary))" />
        </linearGradient>
      </defs>

      {/* Fond : halo doux */}
      <rect x="0" y="0" width="320" height="240" rx="28" fill="url(#lumina-sky)" />

      {/* Soleil / rayonnement */}
      <circle cx="250" cy="62" r="34" fill="var(--accent-primary)" opacity="0.16" />
      <circle cx="250" cy="62" r="20" fill="var(--accent-primary)" opacity="0.28" />

      {/* Collines (aplats géométriques, style Tyler) */}
      <path
        d="M0 190 Q 80 140 160 178 T 320 168 L 320 240 L 0 240 Z"
        fill="var(--accent-primary)"
        opacity="0.12"
      />
      <path
        d="M0 208 Q 96 172 192 202 T 320 196 L 320 240 L 0 240 Z"
        fill="var(--accent-primary)"
        opacity="0.2"
      />

      {/* Livre / projet ouvert au centre */}
      <g transform="translate(160 150)">
        <path
          d="M-52 6 Q -26 -12 0 2 L 0 42 Q -26 28 -52 46 Z"
          fill="url(#lumina-book)"
        />
        <path
          d="M52 6 Q 26 -12 0 2 L 0 42 Q 26 28 52 46 Z"
          fill="url(#lumina-book)"
          opacity="0.82"
        />
        <path
          d="M0 2 L 0 42"
          stroke="var(--canvas)"
          strokeWidth="2"
          opacity="0.5"
        />
      </g>

      {/* Personnages stylisés (ronds + traits) */}
      {[
        { x: 78, y: 150, s: 1 },
        { x: 118, y: 160, s: 0.9 },
        { x: 202, y: 160, s: 0.9 },
        { x: 242, y: 150, s: 1 },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y}) scale(${p.s})`}>
          <circle cx="0" cy="-16" r="11" fill="var(--text-primary)" opacity="0.85" />
          <path
            d="M-13 14 Q 0 -2 13 14 Z"
            fill="var(--text-primary)"
            opacity="0.85"
          />
        </g>
      ))}

      {/* Étincelles */}
      {[
        { x: 60, y: 70 },
        { x: 96, y: 52 },
        { x: 272, y: 108 },
        { x: 300, y: 78 },
      ].map((s, i) => (
        <path
          key={i}
          d={`M${s.x} ${s.y - 6} L${s.x + 2} ${s.y - 2} L${s.x + 6} ${s.y} L${s.x + 2} ${s.y + 2} L${s.x} ${s.y + 6} L${s.x - 2} ${s.y + 2} L${s.x - 6} ${s.y} L${s.x - 2} ${s.y - 2} Z`}
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
      <IonContent className="bg-canvas">
        <div
          data-screen-state="ready"
          className="min-h-dvh flex flex-col"
          style={{ backgroundColor: "var(--canvas)" }}
        >
          {/* Demi-page supérieure : illustration + message inspirant */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-6 pt-safe text-center">
            <div className="w-full max-w-xs mx-auto">
              <WelcomeIllustration />
            </div>

            <h1 className="mt-6 text-text-primary font-bold text-2xl leading-snug">
              Votre organisation,
              <br />
              enfin à portée de main.
            </h1>
            <p className="mt-3 text-text-tertiary text-sm max-w-xs mx-auto">
              Gérez vos membres, vos finances et vos événements en toute
              simplicité — même hors connexion. Commencez en quelques secondes,
              et grandissez à votre rythme.
            </p>
          </div>

          {/* Zone d'action (bas d'écran, safe-area aware) */}
          <div className="px-6 pb-safe">
            <button
              type="button"
              onClick={() => navigate("/auth", { replace: true })}
              className="w-full py-4 rounded-full font-semibold text-on-accent text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: "var(--accent-primary)" }}
              aria-label="Commencer — accéder à la connexion"
            >
              Commencer
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/auth", { replace: true })}
              className="mt-3 w-full py-3 rounded-full font-medium text-sm transition-all active:scale-95"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "transparent",
                border: "1px solid var(--border)",
              }}
              aria-label="J'ai déjà un compte — se connecter"
            >
              J'ai déjà un compte
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
