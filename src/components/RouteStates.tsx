/**
 * State screens — the finite set of "non-render" outcomes from the route
 * resolver, each as a real, useful screen (contract §2.2 + §5.1).
 *
 * Every screen exposes `data-screen-state` so tests (crawler, Phase 12) can
 * PROVE no screen is mute. This replaces the old behaviour where a guard
 * could leave the Ionic outlet on an empty/black view.
 */
import { IonPage, IonContent } from "@ionic/react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

export type ScreenStateValue =
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "offline"
  | "syncing"
  | "forbidden"
  | "notfound"
  | "partial"
  | "success"
  | "destructive-confirm";

/** Marks a screen with its UX state for the "zero black screen" crawler. */
export function ScreenState({
  state,
  children,
}: {
  state: ScreenStateValue;
  children: ReactNode;
}) {
  return <div data-screen-state={state}>{children}</div>;
}

interface StateScreenProps {
  state: ScreenStateValue;
  icon?: string;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

function StateScreen({
  state,
  icon,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: StateScreenProps) {
  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div
          data-screen-state={state}
          className="min-h-dvh flex items-center justify-center px-5"
        >
          <div className="text-center max-w-sm">
            {icon && (
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                }}
              >
                <span className="text-2xl" aria-hidden>
                  {icon}
                </span>
              </div>
            )}
            <p className="text-text-primary font-bold text-xl mb-2">{title}</p>
            <p className="text-text-tertiary text-sm mb-8">{message}</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onPrimary}
                className="px-8 py-3 rounded-full font-semibold text-on-accent active:scale-95 transition-all"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                {primaryLabel}
              </button>
              {secondaryLabel && onSecondary && (
                <button
                  type="button"
                  onClick={onSecondary}
                  className="px-8 py-3 rounded-full font-semibold active:scale-95 transition-all"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--accent-primary)",
                    border: "1px solid var(--accent-primary)",
                  }}
                >
                  {secondaryLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** Missing permission — says WHICH permission and offers a useful exit. */
export function ForbiddenScreen({ permission }: { permission?: string }) {
  const navigate = useNavigate();
  return (
    <StateScreen
      state="forbidden"
      icon="🔒"
      title="Accès refusé"
      message={
        permission
          ? `Il vous manque la permission « ${permission} ». Contactez un administrateur de votre organisation.`
          : "Vous n'avez pas la permission d'accéder à cette page. Contactez un administrateur."
      }
      primaryLabel="Retour à l'accueil"
      onPrimary={() => navigate("/dashboard")}
    />
  );
}

/**
 * Not a member of the active organisation — offers to claim/join.
 *
 * `/dashboard` n'est PAS exempté de `needs-membership` (R107) : proposer
 * « Retour à l'accueil » renvoyait l'utilisateur sur cet écran même
 * (boucle sans issue). Le seul chemin praticable depuis un compte non membre
 * est donc la réclamation d'invitation, ou la déconnexion (pour changer de
 * compte). `onSignOut` est fourni par le garde de route ; sans lui, le bouton
 * n'est pas rendu (aucun bouton mort).
 */
export function NeedsMembershipScreen({ onSignOut }: { onSignOut?: () => void } = {}) {
  const navigate = useNavigate();
  return (
    <StateScreen
      state="forbidden"
      icon="🏠"
      title="Organisation non rejointe"
      message="Votre compte n'est pas encore membre de cette organisation. Utilisez une invitation pour la rejoindre, ou changez de compte."
      primaryLabel="Saisir un code d'invitation"
      onPrimary={() => navigate("/invitation/claim")}
      secondaryLabel={onSignOut ? "Changer de compte" : undefined}
      onSecondary={onSignOut}
    />
  );
}

/** Client schema older than the server requires — forces an update. */
export function UpdateRequiredScreen() {
  return (
    <StateScreen
      state="error"
      icon="⬆"
      title="Mise à jour requise"
      message="Une nouvelle version de l'application est nécessaire pour continuer. Rechargez la page ou mettez l'application à jour."
      primaryLabel="Recharger"
      onPrimary={() => window.location.reload()}
    />
  );
}

/**
 * PM2 — un deep link vise une AUTRE organisation que l'active. On demande
 * confirmation AVANT de basculer : un changement de contexte d'organisation
 * est une action significative (les listes, permissions et écritures changent),
 * et un lien ne doit jamais basculer silencieusement.
 */
export function OrgSwitchScreen({
  orgLabel,
  onConfirm,
  onCancel,
}: {
  orgLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <StateScreen
      state="partial"
      icon="🔄"
      title="Changer d'organisation ?"
      message={`Ce lien vise une autre organisation (${orgLabel}). Voulez-vous basculer vers ce contexte ?`}
      primaryLabel="Changer d'organisation"
      onPrimary={onConfirm}
      secondaryLabel="Rester ici"
      onSecondary={onCancel}
    />
  );
}

/** Boot watchdog — shown when the app shell never became ready in time. */
export function BootRecoveryScreen({ onRetry }: { onRetry?: () => void }) {
  return (
    <StateScreen
      state="error"
      icon="⚠"
      title="L'application met trop de temps à démarrer"
      message="Le chargement a dépassé le délai attendu. Réessayez ; si le problème persiste, rechargez l'application."
      primaryLabel="Réessayer"
      onPrimary={onRetry ?? (() => window.location.reload())}
      secondaryLabel="Recharger"
      onSecondary={() => window.location.reload()}
    />
  );
}

/**
 * A data load failed (R88) — distinct from "loaded, nothing there". Without
 * this, a swallowed `.catch(() => setLoading(false))` renders the same empty
 * state as a genuinely empty list: the user cannot tell "no data" from "could
 * not fetch", and no trace is left. `onRetry` re-runs the load.
 *
 * Embeddable (no `IonPage`): pages that must keep a single `<IonPage>` root
 * (to avoid the black-screen view-stack bug) render it inside their own
 * `IonContent`, like `EmptyState`.
 */
export function LoadErrorBlock({
  message = "Le chargement a échoué. Vérifiez votre connexion puis réessayez.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      data-screen-state="error"
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="text-3xl mb-3" aria-hidden>
        ⚠
      </div>
      <p className="text-text-primary font-bold text-lg mb-1">
        Chargement impossible
      </p>
      <p className="text-text-tertiary text-sm mb-6">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-8 py-3 rounded-full font-semibold text-on-accent active:scale-95 transition-all"
        style={{ backgroundColor: "var(--accent-primary)" }}
      >
        Réessayer
      </button>
    </div>
  );
}
