/**
 * SessionsPage — « Mes comptes » (feature de persistance voulue).
 *
 * Quand l'utilisateur se déconnecte, ses comptes (orgs) ne sont PAS effacés :
 * ils restent listés ici. Au prochain chargement, il suffit de cliquer sur un
 * compte pour re-s'authentifier et y entrer. Route : /sessions.
 *
 * C'est la page « hub de session » : elle récapitule les organisations aux
 * quelles l'utilisateur courant est lié (membres, grants, legacy) et propose
 * de re-entrer dans chacune, ou de tout déconnecter.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonContent,
} from "@ionic/react";
import TopHeader from "@/components/TopHeader";
import { useCurrentUser } from "@/lib/dataLayer";
import {
  useMyOrgs,
  enterOrganization,
  resolveCurrentUserId,
  type UserOrg,
} from "@/lib/organization-context";
import { authService, useAuth } from "@/lib/auth";
import { useLocalStore } from "@/store/useLocalStore";
import { Building2, Check, Loader2, LogOut, Trash2 } from "lucide-react";
import { getOrganizationId } from "@/lib/orgContext";

/** Paire « retiré » — un user ne retire un compte que pour LUI-MÊME. */
interface RemovedPair {
  userId: string;
  orgId: string;
}

const REMOVED_ACCOUNTS_KEY = "lumina-removed-accounts";

function readRemovedAccounts(): RemovedPair[] {
  try {
    const raw = localStorage.getItem(REMOVED_ACCOUNTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is RemovedPair =>
        !!p &&
        typeof p === "object" &&
        typeof (p as RemovedPair).userId === "string" &&
        typeof (p as RemovedPair).orgId === "string",
    );
  } catch {
    return [];
  }
}

function persistRemovedAccounts(pairs: RemovedPair[]) {
  localStorage.setItem(REMOVED_ACCOUNTS_KEY, JSON.stringify(pairs));
}

const VIA_LABEL: Record<UserOrg["via"], string> = {
  BOTH: "Membre + admin",
  GRANT: "Admin (grant)",
  MEMBER: "Membre",
  LEGACY: "Membre",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  ARCHIVED: "Archivée",
};

export default function SessionsPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { data: orgs, refetch } = useMyOrgs();
  const loadInitialData = useLocalStore((s) => s.loadInitialData);
  const [busy, setBusy] = useState<string | null>(null);
  const [entering, setEntering] = useState<string | null>(null);
  const { profile } = useAuth().getState();

  // BUG FIX : « Mes comptes » vide juste après login — la liste
  // s'appuie sur resolveCurrentUserId(), qui préfère
  // authService.getState().profile.id ; ce dernier reste null tant
  // que le profile n'a pas été chargé (fetchUser/getProfile, appel
  // asynchrone au boot). Le fallback localStorage (« lumina-user »)
  // n'a QUE l'id — pas l'email/le rôle — il sert seulement quand
  // l'auth n'est pas hydraté du tout (ex. page ouverte en dur,
  // déconnecté). Dès que le profile hydrate, on refetch avec l'id
  // fiable + on persiste le profil complet en localStorage pour les
  // visites futures (idempotent, écriture silencieuse).
  useEffect(() => {
    if (!profile?.id) return;
    refetch();
    try {
      localStorage.setItem(
        "lumina-user",
        JSON.stringify({
          id: profile.id,
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          role: profile.role,
        }),
      );
    } catch {
      /* best-effort, localStorage peut être indisponible */
    }
  }, [profile?.id, refetch]);

  // HYDRATE au montage : le token Supabase est persisté en localStorage
  // (jamais effacé par un visite de /sessions — clearLocalStorage du
  // Cypress est un événement de SPEC, pas de l'app). hydrateProfile()
  // en lit user.id si le state auth n'est pas encore réhydraté (cas
  // /sessions ouverte directement après login, sans passage par
  // /splash), puis charge le profile via getProfile → setState +
  // notifyListeners. C'est ce dernier event qui déclenche le refetch
  // de useMyOrgs (souscription authService.subscribe ajoutée au
  // commit précédent) et débloquent la liste « Mes comptes ».
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    authService.hydrateProfile();
  }, []);

  // Re-runs à chaque refetch (la dépendance [refetch] s'exécute à
  // CHAQUE rendu car refetch est une fonction inline du hook parent
  // — un no-op qui n'importe rien, ça laisse le cas ci-dessus gérer
  // le re-fetch réel).
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Le compte courant (celui dans lequel on est).
  const currentOrgId = getOrganizationId();

  const handleEnter = async (org: UserOrg) => {
    setBusy(org.orgId);
    setEntering(org.orgId);
    try {
      // 1. Re-s'authentifier si déconnecté (token expiré / rechargement) :
      //    on tente de restaurer la session Supabase depuis le localStorage.
      let session = await authService.getSession();
      if (!session) {
        // Le token local peut encore être valide : re-hydrate via
        // fetchUser() qui re-lit sb-*-auth-token et revalide silencieusement.
        const rehydrated = await authService.fetchUser().catch(() => null);
        if (!rehydrated) {
          // Impossible de restaurer la session : le refresh token est mort.
          // On renvoie vers /auth pour un re-login explicite — SANS laisser
          // l'utilisateur atterrir sur un dashboard vide (RouteGuard
          // rebattrait dans 1 tick, ou pire, crash).
          setBusy(null);
          setEntering(null);
          navigate("/auth", { replace: true });
          return;
        }
        session = await authService.getSession();
        if (!session) {
          setBusy(null);
          setEntering(null);
          navigate("/auth", { replace: true });
          return;
        }
      }
      // 2. Entre dans le contexte org (vérifie membership/grant local) et
      //    hydrate le profile si besoin (résout le « Mes comptes » vide
      //    post-login : resolveCurrentUserId() dépend de profile.id).
      await enterOrganization(org.orgId).then(async (ctx) => {
        setEntering(null);
        if (!ctx) {
          // Accès refusé (ni membre ni grant) : on reste sur la page,
          // l'org n'est pas ré-entrant. Le compte reste affiché.
          setBusy(null);
          return;
        }
        // 3. Recharger les données locales de cet org pour l'accueil.
        await loadInitialData();
        setBusy(null);
        navigate("/dashboard", { replace: true });
      });
    } catch {
      setBusy(null);
      setEntering(null);
    }
  };

  const handleSignOut = async () => {
    setBusy("__signout__");
    await authService.signOut();
    setBusy(null);
    navigate("/auth", { replace: true });
  };

  const handleRemoveAccount = (org: UserOrg) => {
    // « Retirer ce compte » : on ne supprime RIEN côté serveur (les data
    // restent) — on masque simplement l'org localement pour qu'elle ne soit
    // plus proposée par défaut ici. Persisté par (userId, orgId) : l'action
    // ne touche QUE cet utilisateur et ne survit qu'à sa déconnexion.
    setBusy(org.orgId + "__remove__");
    const uid = resolveCurrentUserId();
    if (uid) {
      const existing = readRemovedAccounts();
      if (!existing.some((p) => p.userId === uid && p.orgId === org.orgId)) {
        persistRemovedAccounts([...existing, { userId: uid, orgId: org.orgId }]);
      }
    }
    setBusy(null);
  };

  const uid = resolveCurrentUserId();
  const removed = readRemovedAccounts().filter((p) => p.userId === uid);
  const list = (orgs ?? []).filter((o) => !removed.some((p) => p.orgId === o.orgId));

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Mes comptes" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
            <p className="text-text-tertiary text-xs mb-5">
              Vos comptes restent ici même après déconnexion. Cliquez sur
              l'un d'eux pour re-ouvrir votre session.
            </p>

            {list.length === 0 ? (
              <div
                className="rounded-xl p-6 text-center"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <Building2 className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
                <p className="text-text-primary text-sm">
                  Aucun compte lié pour l'instant.
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  {user?.email ?? "Connectez-vous pour voir vos organisations."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {list.map((org) => {
                  const isCurrent = org.orgId === currentOrgId;
                  const busyThis =
                    busy === org.orgId || busy === org.orgId + "__remove__";
                  return (
                    <div
                      key={org.orgId}
                      className="rounded-xl p-4 flex items-center gap-3 transition-[background-color]"
                      style={{
                        backgroundColor: isCurrent
                          ? "color-mix(in srgb, var(--accent-primary) 10%, var(--surface))"
                          : "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {/* Re-ouvrir la session — le contenu de la carte est cliquable,
                          à l'exception de la zone « Retirer » (stopPropagation). */}
                      <button
                        type="button"
                        disabled={busyThis}
                        onClick={() => handleEnter(org)}
                        className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-lg active:scale-[0.99] transition-transform disabled:opacity-60"
                        style={{ border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                        aria-label={`Re-ouvrir ${org.name}`}
                      >
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor:
                              "color-mix(in srgb, var(--accent-primary) 15%, transparent)",
                          }}
                        >
                          {entering === org.orgId || busyThis ? (
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent-primary)" }} />
                          ) : (
                            <Building2 className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-text-primary text-sm font-semibold truncate">
                              {org.name}
                            </p>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-income flex-shrink-0">
                                <Check className="w-3 h-3" /> Actif
                              </span>
                            )}
                          </div>
                          <p className="text-text-tertiary text-xs mt-0.5">
                            {VIA_LABEL[org.via]} · {STATUS_LABEL[org.status] ?? org.status}
                          </p>
                        </div>
                      </button>
                      {/* « Retirer » : agit sur le compte visuel associé à la
                          carte (org), jamais sur list[0] — avec plusieurs
                          comptes, le bouton retire LA org cliquée, pas la
                          1re de la liste. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAccount(org);
                        }}
                        disabled={busyThis}
                        className="flex items-center gap-1.5 p-2 rounded-lg text-text-tertiary text-xs hover:text-text-secondary transition-colors disabled:opacity-50"
                        style={{ border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                        aria-label={`Retirer ${org.name} de la liste`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Retirer
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions de compte */}
            {user?.id && (
              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={busy === "__signout__"}
                  className="w-full flex items-center gap-3 p-4 rounded-xl active:scale-[0.99] transition-transform text-left disabled:opacity-60"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                  aria-label="Se déconnecter de tous les comptes"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--data-expense) 12%, transparent)",
                    }}
                  >
                    <LogOut
                      className="w-5 h-5"
                      style={{ color: "var(--data-expense)" }}
                    />
                  </div>
                  <div>
                    <p className="text-text-primary text-sm font-semibold">
                      Se déconnecter
                    </p>
                    <p className="text-text-tertiary text-xs mt-0.5">
                      Vos comptes restent listés ici pour reconnecter plus tard
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
