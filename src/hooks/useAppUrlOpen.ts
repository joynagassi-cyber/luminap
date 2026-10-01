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
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { authService } from "@/lib/auth";

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
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let cleanup: (() => void) | undefined;

    const onNativeDeepLink = async (url: string) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return;
      }
      const code = parsed.searchParams.get("code");
      if (!code) return; // not an OAuth callback (plain lumina:// launch)

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
