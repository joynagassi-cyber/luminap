/**
 * Shared helpers for the route sections in src/ionic/routes/.
 *
 * Every section exports a flat `ReactElement[]` of `<Route>` elements; the
 * composed array (routes/index.ts) MUST stay a plain array — a JSX
 * Fragment around it would hide all routes from the Ionic view-stack
 * engine (see the note in App.tsx).
 */

import {
  Component,
  Suspense,
  type ComponentType,
  type ErrorInfo,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import { IonPage, IonContent } from "@ionic/react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Suspense Fallback ─────────────────────────────────────────────────────
const PageSkeleton = () => (
  <IonPage>
    <IonContent fullscreen className="ion-padding ion-padding-top">
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </IonContent>
  </IonPage>
);

/**
 * Recovers from a broken view. Without this boundary, a lazy chunk that
 * fails to load (or a render error inside a page) leaves the Ionic
 * view-stack on a BLANK screen — the user clicks a nav tab and "nothing
 * shows up", with no way back. This renders an explicit error screen with
 * two exits: retry (re-mounts the view, re-triggering the lazy import) and
 * full reload (fresh chunk fetch).
 */
class LazyRouteErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; attempt: number }
> {
  state = { hasError: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(
      "[LazyRoute] La vue a échoué à charger/rendre — écran d'erreur affiché à la place d'un écran vide",
      error,
      info?.componentStack ?? null,
    );
  }

  private retry = () => {
    // Bumping `attempt` re-mounts the keyed subtree → the lazy import is
    // re-triggered and a fresh Suspense fallback shows while it loads.
    this.setState((s) => ({ hasError: false, attempt: s.attempt + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <IonPage>
          <IonContent className="ion-padding">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-10 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: "#1DB9541A" }}
              >
                <span className="text-2xl" aria-hidden>
                  ⚠
                </span>
              </div>
              <div>
                <p className="text-base font-semibold text-white">
                  Impossible d&apos;afficher cette page
                </p>
                <p className="mt-1 text-xs" style={{ color: "#808080" }}>
                  Une erreur est survenue pendant le chargement de la vue.
                  Essayez à nouveau ou rechargez l&apos;application.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={this.retry}
                  className="rounded-full px-5 py-3 text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  Réessayer
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-full px-5 py-3 text-sm font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--accent-primary)",
                    border: "1px solid var(--accent-primary)",
                  }}
                >
                  Recharger
                </button>
              </div>
            </div>
          </IonContent>
        </IonPage>
      );
    }
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

/**
 * Lazy route wrapper — code-splits a page, shows a skeleton while it
 * resolves, and a recoverable error screen if it fails. Every heavy page
 * in the sections goes through this.
 */
export function LazyRoute({
  component: LazyComponent,
}: {
  component: LazyExoticComponent<ComponentType<any>>;
}) {
  return (
    <LazyRouteErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <LazyComponent />
      </Suspense>
    </LazyRouteErrorBoundary>
  );
}
