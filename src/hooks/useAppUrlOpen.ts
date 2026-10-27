// Fixed: appUrlOpen registered at app root (gap: deep link arriving on any
// screen was missed because the listener lived only on AuthPage.tsx).
//
// This hook hoists the generic Capacitor `appUrlOpen` (warm re-open) and
// `getLaunchUrl` (cold start) handling to the app root. When a `lumina://`
// OAuth callback URL arrives, it exchanges the code for a real session via
// `authService.handleOAuthDeepLink` and then dispatches a `lumina:deeplink`
// CustomEvent so screen-specific logic (e.g. AuthPage's navigation intent)
// can react. No-op on the web (Capacitor.isNativePlatform() guard).
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { authService } from "@/lib/auth";
import { parseDeepLink } from "@/lib/routeResolver";
import { getOrganizationId } from "@/lib/orgContext";
import { setDeepLinkOrgIntent } from "@/lib/deepLinkIntent";

/**
 * Event dispatched (on `window`) after a native OAuth deep-link URL has been
 * exchanged for a session. Carries the resolved result so listeners can
 * decide on navigation / onboarding without re-parsing the URL.
 */
export const LUMINA_DEEPLINK_EVENT = "lumina:deeplink";

export interface LuminaDeepLinkDetail {
  url: string;
  error: string | null;
  profile: import("@/lib/auth").Profile | null;
  isNewUser: boolean;
}

/**
 * Registers the app-level `appUrlOpen` / launch-URL listener once at the app
 * root, so a deep link arriving while the user is on ANY screen (not just the
 * auth screen) is captured and its code exchanged for a session.
 *
 * Screen-specific navigation stays in the screens themselves; they listen to
 * `LUMINA_DEEPLINK_EVENT` if they need to react. This keeps the generic
 * listener registered exactly once (no double-registration in AuthPage).
 */
export function useAppUrlOpen() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let cleanup: (() => void) | undefined;

    const onNativeDeepLink = async (url: string) => {
      // Parse through the SAME resolver as the web (contract §2.3): the link
      // is never trusted — `returnTo` is allowlisted, unknown paths fall back.
      const link = parseDeepLink(url);
      if (!link) return;

      // Non-OAuth deep link: navigate to the (validated) target path directly.
      // The route guard then applies auth / permission / org-switch rules.
      if (!link.code) {
        const target = link.returnTo ?? link.path;
        // PM2 : si le lien vise une AUTRE organisation que l'active, on
        // mémorise l'intention AVANT de naviguer — sinon `resolveRoute`
        // n'aurait aucun `linkOrgId` à comparer et la garde resterait morte.
        if (link.orgId && link.orgId !== getOrganizationId()) {
          setDeepLinkOrgIntent({ orgId: link.orgId, path: target });
        }
        navigate(target, { replace: false });
        return;
      }

      const result = await authService.handleOAuthDeepLink(url);
      if (!active) return;

      // Dispatch for screen-specific handlers (AuthPage navigation, etc.).
      window.dispatchEvent(
        new CustomEvent<LuminaDeepLinkDetail>(LUMINA_DEEPLINK_EVENT, {
          detail: {
            url,
            error: result.error,
            profile: result.profile,
            isNewUser: result.isNewUser,
          },
        }),
      );

      // Transition forcée (fix écran noir après le splash) : si le callback
      // OAuth arrive alors que l'app est sur une route PUBLIQUE (/splash,
      // /), `RouteGuard` ne force PAS de navigation et l'utilisateur
      // resterait figé sur le splash / écran noir. On navigue vers le
      // `returnTo` validé, sinon le dashboard (ou l'onboarding).
      const PUBLIC = ["/splash", "/", "/auth", "/auth/callback", "/sessions"];
      if (PUBLIC.includes(location.pathname) && !result.error) {
        const { needsOnboarding } = await import("@/lib/onboardingState");
        const dest =
          link.returnTo ??
          (needsOnboarding() ? "/onboarding" : "/dashboard");
        navigate(dest, { replace: true });
      }
    };

    // Cold launch: read the URL the app was started with.
    void CapacitorApp.getLaunchUrl()
      .then((launch) => {
        if (active && launch?.url) void onNativeDeepLink(launch.url);
      })
      .catch(() => {
        /* plugin unavailable (web / SSR) — ignore */
      });

    // Warm re-open: Google hands the user back into a running app.
    void CapacitorApp.addListener("appUrlOpen", (evt) => {
      if (active) void onNativeDeepLink(evt.url);
    })
      .then((sub) => {
        if (!active) {
          void sub.remove();
          return;
        }
        cleanup = () => {
          void sub.remove();
        };
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      active = false;
      cleanup?.();
    };
  }, []);
}
