import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { IonPage, IonContent } from "@ionic/react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";

interface Props {
  /** Titre affiché dans le header + en h1 de la page. */
  title: string;
  /** Sous-titre optionnel (description de la section). */
  subtitle?: string;
  /** Action « Retour » par défaut : navigation vers /settings (le hub). */
  backTo?: string;
  /** Style inline appliqué au wrapper scrollable (ex. paddingBottom dynamique pour keyboard-avoidance). */
  contentStyle?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * Layout commun des sous-pages de Paramètres : header + bouton « Retour » +
 * titre + contenu scrollable + barre de navigation. Utilisé par chaque section
 * de Paramètres (Profil, Thème, Personnalisation, Features, …) pour garder un
 * gabarit identique et réduire la duplication.
 */
export default function SettingsShell({
  title,
  subtitle,
  backTo = "/settings",
  contentStyle,
  children,
}: Props) {
  const navigate = useNavigate();
  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <TopHeader title={title} />
        <div
          className="max-w-lg mx-auto px-5 pt-safe-calc pb-safe-calc"
          style={contentStyle}
        >
          {/* L25 — hitzone tactile 44px (DESIGN.md §5) : bouton text-sm seul
              faisait ~24px de hauteur, sous la cible minimale. */}
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="flex items-center gap-2 text-text-secondary text-sm mb-4 active:opacity-70"
            style={{ background: "none", border: "none", cursor: "pointer", height: 44 }}
            aria-label={`Retour aux paramètres`}
          >
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <h1
            className="text-text-primary font-bold text-xl mb-1"
            data-testid={`settings-${title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-text-tertiary text-xs mb-5">{subtitle}</p>
          )}

          {children}
        </div>
        <BottomNav />
      </IonContent>
    </IonPage>
  );
}
