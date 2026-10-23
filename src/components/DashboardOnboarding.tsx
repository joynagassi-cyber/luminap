/**
 * DashboardOnboarding — guide « premiers pas » affiché dans le dashboard.
 *
 * Objectif : montrer à un nouvel utilisateur, à partir de l'état RÉEL de son
 * organisation, ce qu'il lui reste à faire — et l'y emmener en un clic.
 *
 * Principes :
 *  - **Dynamique** : la progression est déduite des données réellement
 *    présentes (transactions, membres, événements, invitations), pas d'un
 *    drapeau posé au hasard. Une organisation qui a déjà des mouvements ne
 *    voit pas « Enregistrez votre premier mouvement ».
 *  - **Auto-effacement** : une fois toutes les étapes franchies, la carte
 *    disparaît d'elle-même et ne revient plus (`lumina-onboarding-done`).
 *  - **Non bloquant** : la carte se masque (`lumina-onboarding-dismissed`) ;
 *    l'utilisateur n'est jamais coincé derrière un guide.
 *  - **Sans état d'erreur silencieux** : si aucune organisation n'est
 *    résolue, la carte ne s'affiche pas (les listes seraient vides et le
 *    guide mentirait en prétendant que « rien n'a été fait »).
 *
 * La logique de progression est isolée dans `computeOnboardingProgress`, une
 * fonction PURE, pour être testable sans monter le dashboard.
 */
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import {
  useEvents,
  useInvitations,
  useMembers,
  useTransactions,
} from "@/lib/dataLayer";
import { hasResolvedOrganization } from "@/lib/orgContext";

export type OnboardingStepId =
  | "first-transaction"
  | "first-member"
  | "first-event"
  | "first-invitation";

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  /** Route vers laquelle la carte emmène l'utilisateur. */
  path: string;
  /** Libellé du bouton d'action de l'étape. */
  cta: string;
}

export interface OnboardingStepState extends OnboardingStep {
  done: boolean;
}

/** Compteurs bruts nécessaires au calcul de progression. */
export interface OnboardingCounts {
  transactions: number;
  members: number;
  events: number;
  invitations: number;
}

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "first-transaction",
    title: "Enregistrez votre premier mouvement",
    description: "Une entrée ou une sortie : c'est ce qui alimente votre solde.",
    path: "/transaction/new",
    cta: "Saisir un mouvement",
  },
  {
    id: "first-member",
    title: "Ajoutez un membre",
    description: "Votre annuaire sert ensuite aux cotisations et aux groupes.",
    path: "/members",
    cta: "Ajouter un membre",
  },
  {
    id: "first-event",
    title: "Planifiez un événement",
    description: "Suivez son budget et ses tâches depuis un seul écran.",
    path: "/event/new",
    cta: "Créer un événement",
  },
  {
    id: "first-invitation",
    title: "Invitez votre équipe",
    description: "Partagez un code ou un QR : vos collègues rejoignent l'organisation.",
    path: "/invitations",
    cta: "Inviter",
  },
] as const;

const DONE_KEY = "lumina-onboarding-done";
const DISMISSED_KEY = "lumina-onboarding-dismissed";

function countOf(list: unknown): number {
  return Array.isArray(list) ? list.length : 0;
}

/**
 * Déduit l'état de chaque étape à partir des compteurs, puis ORDONNE le
 * résultat pour mettre la prochaine étape à faire en tête (c'est ce qui rend
 * le guide « dynamique » : il pointe toujours vers le prochain pas utile).
 */
export function computeOnboardingProgress(
  counts: OnboardingCounts,
): OnboardingStepState[] {
  const doneById: Record<OnboardingStepId, boolean> = {
    "first-transaction": counts.transactions > 0,
    "first-member": counts.members > 0,
    "first-event": counts.events > 0,
    "first-invitation": counts.invitations > 0,
  };

  const steps = ONBOARDING_STEPS.map((step) => ({
    ...step,
    done: doneById[step.id],
  }));

  // Les étapes faites passent à la fin (ordre stable entre elles).
  return [...steps.filter((s) => !s.done), ...steps.filter((s) => s.done)];
}

export function isOnboardingComplete(counts: OnboardingCounts): boolean {
  return (
    counts.transactions > 0 &&
    counts.members > 0 &&
    counts.events > 0 &&
    counts.invitations > 0
  );
}

function readFlag(key: string): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, "true");
  } catch {
    /* stockage plein / mode privé : la carte réapparaîtra, sans erreur */
  }
}

export default function DashboardOnboarding() {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);

  const { data: transactions } = useTransactions();
  const { data: members } = useMembers();
  const { data: events } = useEvents();
  const { data: invitations } = useInvitations();

  const counts: OnboardingCounts = useMemo(
    () => ({
      transactions: countOf(transactions),
      members: countOf(members),
      events: countOf(events),
      invitations: countOf(invitations),
    }),
    [transactions, members, events, invitations],
  );

  const steps = useMemo(() => computeOnboardingProgress(counts), [counts]);
  const total = ONBOARDING_STEPS.length;
  const doneCount = total - steps.filter((s) => !s.done).length;
  const complete = doneCount === total;

  const dismiss = useCallback(() => {
    writeFlag(DISMISSED_KEY);
    setHidden(true);
  }, []);

  if (complete) {
    // Mémorise l'achèvement pour ne plus jamais proposer le guide.
    writeFlag(DONE_KEY);
    return null;
  }
  if (hidden || readFlag(DISMISSED_KEY) || readFlag(DONE_KEY)) return null;
  // Sans organisation résolue, toutes les listes sont vides : le guide
  // afficherait « rien n'a été fait » à tort. On s'abstient.
  if (!hasResolvedOrganization()) return null;

  const next = steps.find((s) => !s.done) ?? steps[0];

  return (
    <section
      aria-label="Premiers pas"
      data-testid="dashboard-onboarding"
      className="mb-6 rounded-2xl p-4"
      style={{
        background: "var(--surface-raised, var(--surface-2))",
        border: "1px solid var(--border-subtle, var(--border))",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles
            className="w-4 h-4 shrink-0"
            style={{ color: "var(--accent-primary)" }}
            aria-hidden="true"
          />
          <h2 className="text-sm font-semibold text-text-primary truncate">
            Premiers pas
          </h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer les premiers pas"
          data-testid="onboarding-dismiss"
          className="shrink-0 w-8 h-8 -mr-1 -mt-1 rounded-full flex items-center justify-center"
        >
          <X className="w-4 h-4 text-text-tertiary" aria-hidden="true" />
        </button>
      </div>

      <p
        className="text-xs text-text-tertiary mt-1"
        data-testid="onboarding-progress"
        role="status"
      >
        {doneCount} sur {total} étapes terminées
      </p>

      <div
        className="mt-2 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border-subtle, var(--border))" }}
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Progression des premiers pas"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(doneCount / total) * 100}%`,
            background: "var(--accent-primary)",
          }}
        />
      </div>

      {/* L'étape à faire est mise en avant ; les suivantes restent visibles
          pour donner la vue d'ensemble sans surcharger. */}
      <button
        type="button"
        onClick={() => navigate(next.path)}
        data-testid={`onboarding-next-${next.id}`}
        className="mt-3 w-full flex items-center gap-3 rounded-xl p-3 text-left transition-transform active:scale-[0.99]"
        style={{ background: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text-primary">
            {next.title}
          </span>
          <span className="block text-xs text-text-tertiary mt-0.5">
            {next.description}
          </span>
        </span>
        <span
          className="shrink-0 flex items-center gap-1 text-xs font-medium"
          style={{ color: "var(--accent-primary)" }}
        >
          {next.cta}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </span>
      </button>

      {steps.filter((s) => !s.done && s.id !== next.id).length > 0 && (
        <ul className="mt-3 space-y-1">
          {steps
            .filter((s) => !s.done && s.id !== next.id)
            .map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => navigate(s.path)}
                  data-testid={`onboarding-step-${s.id}`}
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                >
                  <span
                    className="w-4 h-4 shrink-0 rounded-full border"
                    style={{ borderColor: "var(--border-strong, var(--border))" }}
                    aria-hidden="true"
                  />
                  <span className="text-xs text-text-secondary truncate">
                    {s.title}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}

      {doneCount > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-text-tertiary">
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          {doneCount} étape{doneCount > 1 ? "s" : ""} déjà franchie
          {doneCount > 1 ? "s" : ""}
        </p>
      )}
    </section>
  );
}
