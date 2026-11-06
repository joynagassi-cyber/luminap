/**
 * ObservabilityBridge — synchronise le contexte de session et le fil d'Ariane
 * avec l'observabilité, sans coupler les modules d'erreur à `auth`/`router`.
 *
 * Monté SOUS le routeur Ionic (il lit `useLocation()`), il :
 *   1. met à jour l'état de session (authentifié + rôle) joint aux rapports ;
 *   2. met à jour les identités à retirer par VALEUR des rapports (e-mail,
 *      prénom, nom) — politique PII : le dépôt est public ;
 *   3. trace chaque navigation dans le fil d'Ariane ;
 *   4. purge les rapports en attente dès que la connexion revient.
 *
 * Il ne rend rien. DOIT rester sous `<IonReactRouter>` (comme `UsageStatsBridge`)
 * sinon `useLocation()` lève et fait tomber toute l'app dans l'ErrorBoundary.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { authService } from "@/lib/auth";
import { pushBreadcrumb } from "./breadcrumbs";
import {
  setReportIdentities,
  setSessionContext,
  flushPendingReports,
} from "./errorReporter";
import { subscribeOnline } from "@/platform/networkState";

export const ObservabilityBridge = () => {
  const location = useLocation();

  useEffect(() => {
    const sync = () => {
      const { user, session, profile } = authService.getState();
      setSessionContext({
        authenticated: Boolean(user?.id && session),
        role: profile?.role ?? null,
      });
      setReportIdentities([
        profile?.email ?? "",
        profile?.first_name ?? "",
        profile?.last_name ?? "",
      ]);
    };
    sync();
    const unsubscribe = authService.subscribe(sync);
    return unsubscribe;
  }, []);

  useEffect(() => {
    pushBreadcrumb("navigation", `route ${location.pathname}`);
  }, [location.pathname]);

  useEffect(() => {
    // Tente d'écouler la file d'attente des rapports dès que la connexion
    // revient (les rapports émis hors-ligne repartent automatiquement).
    const flush = () => {
      void flushPendingReports().catch(() => {});
    };
    const unsubscribe = subscribeOnline((online) => {
      if (online) flush();
    });
    flush();
    return unsubscribe;
  }, []);

  return null;
};
