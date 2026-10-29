import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IonApp, setupIonicReact } from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { IonRouterOutlet } from "@ionic/react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { authService } from "@/lib/auth";
import { useAppUrlOpen, LUMINA_DEEPLINK_EVENT } from "@/hooks/useAppUrlOpen";
import { AppProvider } from "./context/AppContext";
import { SyncUnavailableBanner } from "./components/SyncUnavailableBanner";
import AppRouter from "./AppRouter";
import { luminaRoutes } from "./ionic/routing";
import { ErrorBoundary, withScope } from "@sentry/react";
import { UpdateDialog } from "@/updater/UpdateDialog";
import { useUpdater } from "@/updater/useUpdater";
import {
  resolveRoute,
  webEntryOrgIntent,
  type RouteOutcome,
} from "@/lib/routeResolver";
import {
  CLIENT_SCHEMA_VERSION,
  resolveMinSchemaVersion,
} from "@/lib/schemaVersion";
import { installClientErrorCapture, installChunkErrorRecovery } from "@/lib/clientErrors";
import { signalAppReady } from "@/lib/bootWatchdog";
import {
  ForbiddenScreen,
  NeedsMembershipScreen,
  UpdateRequiredScreen,
  OrgSwitchScreen,
} from "@/components/RouteStates";
import { getOrganizationId } from "@/lib/orgContext";
import { useOrgMembership } from "@/hooks/useOrgMembership";
import {
  getDeepLinkOrgIntent,
  setDeepLinkOrgIntent,
  clearDeepLinkOrgIntent,
} from "@/lib/deepLinkIntent";
import { enterOrganization } from "@/lib/organization-context";
import "./ionic/theme";

// Capture globale des erreurs non gérées (contrat Phase 1/2) : rend visibles
// les échecs silencieux au lieu de laisser l'utilisateur sur un écran noir.
installClientErrorCapture();
// Récupération contrôlée d'un chunk obsolète après déploiement (contrat §2.1).
installChunkErrorRecovery();

// Le watchdog de démarrage est armé AVANT `createRoot` dans `main.tsx` (il doit
// pouvoir détecter l'absence de montage React — impossible depuis l'arbre).
// Ici on ne fait que signaler la disponibilité de la coquille.

// Initialize Ionic React (dark theme applied via setupLuminaTheme)
setupIonicReact({
  mode: "ios",
  animated: true,
  ...({ keyboardBehavior: "ion-focus", keyboardFillMode: "overlap" } as any),
});

const queryClient = new QueryClient();

/** Route guard — the single decision point for "what does this URL show?".

 *  Two-layer auth check:
 *   1. **Mount check** — async `authService.getSession()` on first render
 *      (covers cold start, hard reload, direct URL entry).
 *   2. **Live subscription** — `authService.subscribe()` keeps
 *      `isAuthenticated` in sync with in-app sign-in / sign-out / session
 *      invalidation (without this, a `proceedAfterAuth` navigation from
 *      AuthPage → /onboarding or /dashboard would see the stale
 *      `isAuthenticated === false` set at mount and immediately bounce
 *      back to /auth via the `<Navigate>` guard).
 */
function RouteGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Layer 1: initial check on mount (cold start / hard reload / direct URL).
  useEffect(() => {
    const check = async () => {
      const session = await authService.getSession();
      setIsAuthenticated(!!session);
      setIsAuthChecked(true);
    };
    check();
  }, []);

  // Layer 2: keep in sync with live auth state changes (sign-in, sign-out,
  // session invalidated, OAuth callback success).
  useEffect(() => {
    const unsubscribe = authService.subscribe(() => {
      setIsAuthenticated(!!authService.getState().session);
    });
    return unsubscribe;
  }, []);

  // PM2 — un deep link peut viser une AUTRE organisation que l'active. On lit
  // l'intention mémorisée par `useAppUrlOpen` et on l'expose au résolveur, qui
  // produira `org-switch-required`. Sans cet état, la branche restait morte et
  // le lien s'ouvrait dans le mauvais contexte.
  //
  // Ces deux hooks DOIVENT rester au-dessus du `return` précoce du check auth :
  // les placer après violait les Rules of Hooks (`Rendered more hooks than
  // during the previous render`) → l'ErrorBoundary racine remplaçait toute
  // l'app par « Une erreur inattendue s'est produite » au premier rendu
  // (écran noir / E2E jamais vert). L'ordre des hooks doit être identique à
  // chaque rendu.
  const [orgIntent, setOrgIntent] = useState(() => getDeepLinkOrgIntent());
  useEffect(() => {
    const sync = () => {
      let intent = getDeepLinkOrgIntent();
      // R127 — sur le web, RIEN n'analysait l'URL d'entrée (contrairement au
      // chemin natif `appUrlOpen`). Un lien `…/dashboard?org=B` s'ouvrait donc
      // dans l'organisation A sans jamais proposer la bascule. On capte
      // l'intention depuis `window.location` et on la persiste (sinon le
      // prochain `sync()` l'écraserait avec `null`).
      if (!intent && typeof window !== "undefined") {
        const fromUrl = webEntryOrgIntent(
          window.location.href,
          getOrganizationId(),
        );
        if (fromUrl) {
          setDeepLinkOrgIntent(fromUrl);
          intent = fromUrl;
        }
      }
      setOrgIntent(intent);
    };
    // L'intention est écrite par le listener natif (hors React) → on re-sonde
    // à chaque navigation, qui suit toujours de près la pose de l'intention.
    sync();
    return () => {};
  }, [location.pathname]);

  // R107 — alimente `isOrgMember` pour la branche `needs-membership` du
  // résolveur (sinon MORTE : un compte authentifié mais non membre de l'org
  // active voyait un écran vide au lieu de l'écran « Organisation non
  // rejointe »). Fail-open : `undefined` tant que la non-appartenance n'est pas
  // PROUVÉE. DOIT rester au-dessus du `return` précoce (Rules of Hooks).
  const orgMembership = useOrgMembership();

  // Pendant le check, on affiche un spinner plein écran plutôt que null :
  // le fond --canvas (noir) restait seul visible pendant 2-3s (la
  // revalidation réseau du token) et ressemblait à un « écran noir »
  // permanent — en particulier sur mobile où le user ne peut pas recharger.
  if (!isAuthChecked) {
    return (
      <div
        aria-busy="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--canvas)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: "var(--accent-primary)",
            borderTopColor: "transparent",
          }}
        />
        <p style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
          Chargement…
        </p>
      </div>
    );
  }

  // PM2 — un deep link peut viser une AUTRE organisation que l'active. On lit
  // l'intention mémorisée par `useAppUrlOpen` et on l'expose au résolveur, qui
  // produira `org-switch-required`. Sans cet état, la branche restait morte et
  // le lien s'ouvrait dans le mauvais contexte.
  //
  // (Les hooks `orgIntent` sont déclarés plus haut, avant le `return` précoce
  // du check auth, pour respecter les Rules of Hooks.)
  const activeOrgId = getOrganizationId();
  const linkOrgId =
    orgIntent && orgIntent.orgId !== activeOrgId ? orgIntent.orgId : null;

  // Always allow public routes → delegated to the single resolver below.
  // (Resolve the current URL through resolveRoute so web navigation and
  // native deep links share ONE decision point — contract §2.2.)
  const outcome: RouteOutcome = resolveRoute(location.pathname, {
    isAuthenticated,
    activeOrgId,
    linkOrgId,
    // R106 — le garde-fou « mise à jour requise » n'était jamais alimenté
    // (branche morte). On fournit la version du schéma local et la version
    // minimale exigée par la config. Fail-open : si aucune version minimale
    // n'est déclarée, la contrainte est inerte (comportement inchangé).
    clientSchemaVersion: CLIENT_SCHEMA_VERSION,
    minSchemaVersion: resolveMinSchemaVersion(),
    // R107 — `isOrgMember` alimenté par `useOrgMembership` : `false` UNIQUEMENT
    // sur preuve de non-appartenance (membre de l'org active → `true` ; incertain
    // → `undefined`, fail-open). `hasPermission` reste à câbler (phase 4/R105,
    // bloqué par la décision R109 sur le rôle ADMIN).
    isOrgMember: orgMembership === "unknown" ? undefined : orgMembership === "member",
  });

  const confirmOrgSwitch = async (targetOrgId: string) => {
    const entered = await enterOrganization(targetOrgId);
    clearDeepLinkOrgIntent();
    setOrgIntent(null);
    // `enterOrganization` vérifie l'accès local ; en cas de refus on retombe
    // sur l'accueil (jamais d'écran muet).
    navigate(entered ? location.pathname : "/dashboard", { replace: true });
  };

  const cancelOrgSwitch = () => {
    clearDeepLinkOrgIntent();
    setOrgIntent(null);
    navigate("/dashboard", { replace: true });
  };

  switch (outcome.outcome) {
    case "render":
      return null;
    case "redirect":
      return <Navigate to={outcome.to} replace />;
    case "needs-auth":
      // Log conservé (diagnostic écran noir BottomNav, cf. historique).
      console.warn(
        `[RouteGuard] Unauthenticated at ${location.pathname} — redirecting to /auth (returnTo=${outcome.returnTo}). ` +
          `Si le user a juste cliqué un onglet de la BottomNav, cette navigation ` +
          `a pu casser la transition Ionic (écran noir).`,
      );
      // R126 — le `returnTo` (déjà allowlisté par le résolveur) DOIT être
      // transmis : sans lui, l'utilisateur qui suivait un lien profond vers
      // une route protégée était renvoyé au dashboard après connexion, la
      // cible étant perdue. `AuthPage` le relit (revalidé) après authent.
      return (
        <Navigate
          to={`/auth?returnTo=${encodeURIComponent(outcome.returnTo)}`}
          replace
        />
      );
    case "forbidden":
      return <ForbiddenScreen permission={outcome.permission} />;
    case "needs-membership":
      return (
        <NeedsMembershipScreen
          onSignOut={() => {
            void authService.signOut();
            navigate("/sessions", { replace: true });
          }}
        />
      );
    case "update-required":
      return <UpdateRequiredScreen />;
    case "org-switch-required":
      return (
        <OrgSwitchScreen
          orgLabel={outcome.orgId}
          onConfirm={() => void confirmOrgSwitch(outcome.orgId)}
          onCancel={cancelOrgSwitch}
        />
      );
    // `not-found` is rendered by the wildcard route in the route registry;
    // the guard lets it through to avoid a double 404.
    case "not-found":
    case "loading":
    default:
      return null;
  }
}

/**
 * AppReadyBridge — marks the document `data-app-ready="true"` and cancels the
 * boot watchdog (armed in `main.tsx` before `createRoot`) once the shell has
 * mounted. The watchdog itself lives OUTSIDE React on purpose: a watchdog
 * inside the tree can never fire when React fails to mount.
 */
function AppReadyBridge() {
  useEffect(() => {
    document.getElementById("root")?.setAttribute("data-app-ready", "true");
    signalAppReady();
  }, []);

  return null;
}

/**
 * AppUrlOpenBridge — renders nothing but registers the app-level
 * `appUrlOpen` deep-link listener (see useAppUrlOpen) for the whole app
 * lifetime, so a `lumina://` OAuth callback arriving on ANY screen is
 * captured — not just when AuthPage is mounted.
 */
const AppUrlOpenBridge = () => {
  useAppUrlOpen();
  // Force re-render sur chaque événement LUMINA_DEEPLINK_EVENT pour que
  // les composants enfants (Splash, Onboarding, etc.) qui lisent
  // `authService.getState().session` re-réagissent immédiatement après
  // un callback OAuth arrivé sur une route publique (fix écran noir après
  // le splash). Without this, a deep-link on /splash updates the session
  // in memory but nothing re-renders the tree → user stuck on the black
  // post-splash screen.
  const [, setVersion] = useState(0);
  useEffect(() => {
    const onDeeplink = () => setVersion((v) => v + 1);
    window.addEventListener(LUMINA_DEEPLINK_EVENT, onDeeplink);
    return () => window.removeEventListener(LUMINA_DEEPLINK_EVENT, onDeeplink);
  }, []);
  return null;
};

/**
 * SentryUserBridge — rattache l'utilisateur connecté au contexte Sentry
 * (replays, corrélation erreurs ↔ user), et le retire à la déconnexion.
 */
const SentryUserBridge = () => {
  useEffect(() => {
    const unsubscribe = authService.subscribe(() => {
      const { user, session } = authService.getState();
      withScope((scope) => {
        if (user?.id && session) {
          scope.setUser({
            id: user.id,
            email: user.email ?? undefined,
          });
        } else {
          scope.setUser(null);
        }
      });
    });
    return unsubscribe;
  }, []);
  return null;
};

/**
 * UpdaterBridge — vérifie une mise à jour (GitHub Releases) une seule fois au
 * démarrage, de façon strictement non-bloquante :
 *   - `check(false)` est fire-and-forget (jamais d'exception levée)
 *   - sur web / iOS / dev navigateur il retourne null immédiatement
 *     (Capacitor.getPlatform() !== 'android') → aucun effet
 *   - le dialogue s'ouvre seulement si une version strictement supérieure
 *     existe
 *
 * R124 — POINT DE MONTAGE UNIQUE du dialogue : l'état est partagé (store au
 * niveau module), donc le monter aussi dans SettingsAbout afficherait DEUX
 * dialogues (le second au-dessus de la page). Le bouton « Rechercher une mise
 * à jour » de SettingsAbout écrit dans le même store, ce qui fait apparaître
 * ce dialogue-ci.
 * Ne modifie PAS l'init PowerSync/Supabase existante (voir AppRouter).
 */
const UpdaterBridge = () => {
  const { updateInfo, check } = useUpdater();

  useEffect(() => {
    check(false).catch(() => {
      /* JAMAIS bloquer le démarrage : une erreur updater reste silencieuse. */
    });
  }, [check]);

  if (!updateInfo) return null;
  return <UpdateDialog />;
};

/**
 * App — wraps the entire Lumina application in IonApp + IonReactRouter.
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary fallback={
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--canvas)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          gap: 8,
          padding: 24,
        }}
      >
        <img
          src="/lumina-logo-version-monochrome.png"
          alt="Lumina"
          width={96}
          height={96}
          style={{ filter: "none", boxShadow: "none" }}
        />
        <p style={{ color: "var(--text-secondary)", margin: 0 }}>
          Une erreur inattendue s'est produite.
        </p>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 12 }}>
          Rechargez la page pour réessayer.
        </p>
      </div>
    }>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <IonApp style={{ backgroundColor: "var(--canvas)" }}>
        <SentryUserBridge />
        <UpdaterBridge />
        {/* Lien « sauter au contenu » — premier élément focalisable, masqué
            visuellement jusqu'au focus clavier (a11y : parcours du clavier). */}
        {/* M15 — z-index nommé : --z-toast (70) / --z-skip (100) coordonnés
            avec le nav (40) et les modales (60) ; fin des z-[100] ad-hoc. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:outline-none"
          style={{ position: "absolute", left: 12, top: 12, zIndex: "var(--z-skip)", backgroundColor: "var(--accent-primary)", color: "var(--on-accent)" }}
        >
          Aller au contenu principal
        </a>
        <IonReactRouter>
          <RouteGuard />
          <AppReadyBridge />
          <AppUrlOpenBridge />
          <AppRouter />
          <AppProvider>
            <SyncUnavailableBanner />
            <main id="main" style={{ height: "100%" }}>
              {/*
                Le <Routes> est OBLIGATOIRE : @ionic/react-router
                (view-stack) appelle getRoutesChildren() qui ne trouve
                que les routes À L'INTÉRIEUR d'un <Routes> enfant direct
                de <IonRouterOutlet>. Sans lui, le matching ad-hoc de
                matchComponent() échoue sur les routes absolues au root
                outlet et les clics BottomNav laissent le view entrant
                stuck en ion-page-invisible → écran noir permanent
                (mobile : impossible de recharger, l'app est PWA).
                Le key stable force un remount propre du StackManager
                si React re-monte le parent (QueryClientProvider /
                AppProvider re-render) — pas de view-item obsolète.
              */}
              <IonRouterOutlet key="lumina-root-outlet">
                <Routes>
                  {luminaRoutes}
                  {/* Redirection via `element=` (et NON un <Navigate>
                      enfant) : React Router ignore un composant placé en
                      enfant d'un <Route> sans `element`. Un `<Navigate>`
                      enfant laissait `/` (le `start_url` de la PWA)
                      matcher sans rien rendre → écran BLANC. */}
                  <Route
                    path="/"
                    element={<Navigate to="/splash" replace />}
                  />
                </Routes>
              </IonRouterOutlet>
            </main>
          </AppProvider>
        </IonReactRouter>
      </IonApp>
    </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
