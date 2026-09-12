/**
 * Shared helpers for the route sections in src/ionic/routes/.
 *
 * Every section exports a flat `ReactElement[]` of `<Route>` elements.
 * The composed array (routes/index.ts) MUST stay a plain array — a JSX
 * Fragment around it would hide all routes from the Ionic view-stack
 * engine (see the note in App.tsx).
 */

import { lazy, Suspense } from "react";
import type { LazyExoticComponent, ComponentType } from "react";
import { IonPage, IonContent } from "@ionic/react";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Suspense Fallback ─────────────────────────────────────────────────────────
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
 * Lazy route wrapper — code-splits a page and shows a skeleton until it
 * resolves. Every heavy page in the sections goes through this.
 */
export function LazyRoute({
  component: LazyComponent,
}: {
  component: LazyExoticComponent<ComponentType<any>>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LazyComponent />
    </Suspense>
  );
}
