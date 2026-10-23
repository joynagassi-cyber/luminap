/**
 * App Context - PowerSync Integration + Auth
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalStore } from "@/store/useLocalStore";
import { usePowerSyncStatus } from "@/lib/dataLayer";
import { authService } from "@/lib/auth";
import { oneSignalService } from "@/lib/authOneSignal";
import { setOrganizationId } from "@/lib/orgContext";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { loadInitialData, setOnline } = useLocalStore();
  const isPowerSyncReady = usePowerSyncStatus();

  // Load initial data
  useEffect(() => {
    loadInitialData().catch(() => {});
  }, []);

  // Network listeners
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnline]);

  // Resolve the organization context from the auth state.
  //
  // Ce chemin doit se rejouer a CHAQUE changement d'auth, pas seulement au
  // montage : `AppProvider` est monte a la racine et ne se remonte jamais,
  // donc une connexion ulterieure (depuis /auth) laissait
  // `getOrganizationId()` sur `__no_org__` -> toutes les listes vides.
  useEffect(() => {
    const checkAuth = async () => {
      // Source 1 (fiable, deja hydratée) : le profil du singleton auth.
      // Source 2 : lecture directe si le profil n'est pas encore en memoire.
      let profile = authService.getState().profile;
      if (!profile) {
        const session = await authService.getSession();
        if (session) profile = await authService.getProfile(session.user.id);
      }
      if (profile) {
        // SYNC ORG CONTEXT AT BOOT
        //
        // L'org context (orgContext._orgId) n'était jamais résolu au boot :
        // seul les switchers d'UI (OrgSwitcher / Sessions / CentralAdmin)
        // appelaient setOrganizationId(). Conséquence : getOrganizationId()
        // retournait « __no_org__ » pour toute écriture offline-first
        // (createGroupPS / createCustomFieldDefinitionPS, etc.) — la ligne
        // montait bien côté Supabase (INSERT policy = NO USING) mais le
        // SELECT RLS `is_org_member(uid, org_id)` la filtrait si
        // `org_id = '__no_org__'` (n'importe quel user réel).
        //
        // Résolution au boot : on hydrate le contexte depuis le profil
        // (profiles.org_id — le seul champ fiable côté client). Si le
        // profil n'a pas encore d'org (user avant onboarding), on ne
        // force rien (l'app est en mode « no-org » légitime).
        //
        // PERSISTANCE localStorage (fix Cypress cloud-sync) : le contexte
        // orgContext est éphémère (mémoire). `cy.clearLocalStorage()` ou
        // un plein rechargement ne restaure PAS `lumina-active-org`.
        // En le posant ici, le contexte repart avec le bon org_id après
        // reboot (pas `__no_org__`).
        const profileOrgId = profile.org_id;
        if (profileOrgId && profileOrgId !== "__no_org__") {
          setOrganizationId(profileOrgId);
          try {
            localStorage.setItem("lumina-active-org", profileOrgId);
          } catch {
            /* storage indisponible — le contexte mémoire suffit pour la session */
          }
        }
        // Sync role with local store
        await useLocalStore.getState().selectRole(profile.role as any);
        // Sync with OneSignal
        await oneSignalService.login(profile.role as any, profile.id);
      }
    };
    checkAuth();
    // Re-resout a chaque evenement d'auth (SIGNED_IN apres login/restauration).
    return authService.subscribe(() => {
      void checkAuth();
    });
  }, []);

  return <>{children}</>;
}
