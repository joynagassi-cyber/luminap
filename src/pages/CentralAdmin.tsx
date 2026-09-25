/**
 * Central Administration Dashboard (T7 — administration centrale multi-org).
 *
 * Visually distinct "ADMINISTRATION CENTRALE" surface. Access is NOT granted
 * by React alone: the server re-enforces every action via RLS (helper
 * `is_org_member` on `org_admins`). This page only opens for a user who holds
 * at least one ACTIVE central grant or has the CENTRAL_ADMIN role.
 *
 * Routes:
 *   /admin                    — overview (KPIs + org list + contextual actions)
 *   /admin/organizations/:id  — org detail (stats, admins, recent activity)
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonBadge,
} from "@ionic/react";
import {
  Building2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Archive,
  Play,
  Users,
  Clock,
  History,
  ArrowLeft,
  LayoutDashboard,
  UserMinus,
  UserCheck,
} from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { useCurrentUser } from "@/lib/dataLayer";
import { tint } from "@/lib/utils";
import {
  getOrgStats,
  getRecentActivity,
  suspendOrganization,
  reactivateOrganization,
  archiveOrganization,
  getOrgReportCard,
  getOrgAdminDetails,
  revokeOrgAdmin,
  assignOrgAdmin,
  listAdminCandidates,
  type OrgStats,
  type RecentActivity,
  type OrgAdminDetail,
  type OrgReportCard,
  type AdminCandidate,
} from "@/capabilities/organization/central";
import { useCanAccessMulti } from "@/hooks/useCanAccessMulti";
import { useOrganizations, type PSOrganization } from "@/lib/dataLayer";
import {
  useOrganizationContext,
  enterOrganization,
  exitToCentral,
} from "@/lib/organization-context";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  ARCHIVED: "Archivée",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#FFB800",
  ACTIVE: "#1DB954",
  SUSPENDED: "var(--accent-primary)",
  ARCHIVED: "#808080",
};

/** Determine whether the current user may access the central dashboard. */
function useCanAccessCentral() {
  const user = useCurrentUser();
  const { data: managedOrgs } = useOrganizations("central");
  // Central admin: has the explicit role OR manages at least one org via grant.
  const isCentralRole = user?.role === "CENTRAL_ADMIN";
  const hasGrant = (managedOrgs?.length ?? 0) > 0;
  return { allowed: isCentralRole || hasGrant, isCentralRole, managedOrgs };
}

/**
 * B.1 — Gate multi-org : union du `useCanAccessCentral` legacy (rôle
 * CENTRAL_ADMIN ou grant admin central) avec `federation.canAccess`
 * (rôles canon de l'org + grants user/tag/org_member/group_member).
 * Combiné en OR pour la transition : ni l'UI ni le serveur n'est jamais
 * plus restrictif que le chemin le plus permissif en vigueur.
 */
function useCentralAccessMulti(orgId: string) {
  const user = useCurrentUser();
  const legacy = useCanAccessCentral();
  const multi = useCanAccessMulti(
    user?.id,
    orgId,
    "org",
    "manage",
    undefined,
    user?.role as any,
  );
  return {
    allowed: legacy.allowed || multi.allowed,
    isCentralRole: legacy.isCentralRole,
    managedOrgs: legacy.managedOrgs,
    source: multi.source,
  };
}

// ─── Org detail view ────────────────────────────────────────────────────────

// Labels FR pour le journal d'audit (codes bruts DB → lisible).
const ACTION_LABEL: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  ARCHIVE: "Archivage",
  RESTORE: "Restauration",
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
};
const ENTITY_LABEL: Record<string, string> = {
  Transaction: "Transaction",
  transaction: "Transaction",
  Group: "Groupe",
  group: "Groupe",
  Member: "Membre",
  member: "Membre",
  Culte: "Culte",
  culte: "Culte",
  Event: "Événement",
  event: "Événement",
  Organization: "Organisation",
  organization: "Organisation",
};

function OrgDetail({ orgId, onBack }: { orgId: string; onBack: () => void }) {
  const user = useCurrentUser();
  const { data: orgData } = useOrganizations("central");
  const orgName = orgData?.find((o) => o.id === orgId)?.name;
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [reportCard, setReportCard] = useState<OrgReportCard | null>(null);
  const [admins, setAdmins] = useState<OrgAdminDetail[]>([]);
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [delegated, setDelegated] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getRecentActivity(orgId, 15),
      getOrgReportCard(orgId),
      getOrgAdminDetails(orgId),
      listAdminCandidates(orgId),
    ])
      .then(([act, card, adm, cand]) => {
        setActivity(act);
        setReportCard(card);
        setAdmins(adm);
        setCandidates(cand);
      })
      .catch(() => {
        setActivity([]);
        setReportCard(null);
        setAdmins([]);
        setCandidates([]);
      });
  }, [orgId]);

  const handleDelegate = async () => {
    if (!user?.id || !delegated) return;
    setBusy("delegate");
    setError(null);
    try {
      await assignOrgAdmin({
        adminProfileId: delegated,
        orgId,
        grantedBy: user.id,
      });
      setDelegated("");
      setAdmins(await getOrgAdminDetails(orgId));
      setReportCard(await getOrgReportCard(orgId));
      setCandidates(await listAdminCandidates(orgId));
    } catch (e: any) {
      setError(e?.message ?? "Opération refusée");
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (admin: OrgAdminDetail) => {
    if (!user?.id) return;
    setBusy(admin.id);
    setError(null);
    try {
      await revokeOrgAdmin(admin.id, orgId, user.id, admin);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      setReportCard((prev) => prev ? {
        ...prev,
        activeAdminCount: prev.activeAdminCount - 1,
        revokedAdminCount: prev.revokedAdminCount + 1,
      } : null);
    } catch (e: any) {
      setError(e?.message ?? "Opération refusée");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <IonButton fill="clear" onClick={onBack} className="!min-height:auto !p-0 mb-3">
        <ArrowLeft className="w-4 h-4 mr-1" /> Retour à la liste
      </IonButton>

      {/* Report card */}
      {reportCard && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
            <span className="text-text-primary font-semibold">{orgName ?? "Organisation"}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">{reportCard.memberCount}</p>
              <p className="text-text-tertiary text-xs">Membres</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "#1DB954" }}>{reportCard.activeAdminCount}</p>
              <p className="text-text-tertiary text-xs">Admins actifs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--text-tertiary)" }}>{reportCard.revokedAdminCount}</p>
              <p className="text-text-tertiary text-xs">Révoqués</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin list */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold text-sm">Liste des admins</span>
        </div>
        {admins.length === 0 ? (
          <p className="text-text-tertiary text-sm py-3 text-center">Aucun administrateur</p>
        ) : (
          <div className="space-y-2">
            {admins.filter((a) => a.status === "ACTIVE").map((admin) => (
              <div
                key={admin.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ backgroundColor: "#1a1a1a" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
                >
                  <span className="text-xs font-bold" style={{ color: "var(--accent-primary)" }}>
                    {(admin.first_name || "").charAt(0)}{(admin.last_name || "").charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{admin.displayName}</p>
                  <p className="text-text-tertiary text-xs truncate">{admin.email}</p>
                </div>
                <IonButton
                  size="small"
                  fill="outline"
                  color="danger"
                  disabled={busy === admin.id}
                  onClick={() => handleRevoke(admin)}
                >
                  <UserMinus className="w-3 h-3 mr-1" /> Révoquer
                </IonButton>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Déléguer l'admin central */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold text-sm">
            Déléguer l&apos;admin central
          </span>
        </div>
        {candidates.length === 0 ? (
          <p className="text-text-tertiary text-sm py-2 text-center">
            Aucun profil éligible (tous les membres sont déjà admins actifs)
          </p>
        ) : (
          <div className="space-y-3">
            <select
              data-testid="delegate-candidate"
              value={delegated}
              onChange={(e) => setDelegated(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{
                backgroundColor: "var(--card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <option value="">Choisir un profil…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                  {c.email ? ` (${c.email})` : ""}
                </option>
              ))}
            </select>
            <IonButton
              expand="block"
              color="primary"
              disabled={!delegated || busy === "delegate"}
              onClick={handleDelegate}
            >
              <UserCheck className="w-4 h-4 mr-1" />
              {busy === "delegate" ? "Délégation…" : "Conférer l'admin"}
            </IonButton>
          </div>
        )}
        <p className="text-[11px] text-text-tertiary mt-2 leading-snug">
          Confère un grant admin central actif sur cette organisation. Le
          serveur ré-applique le RLS à la synchronisation.
        </p>
      </div>

      {/* Recent activity */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
          <span className="text-text-primary font-semibold text-sm">Activité récente</span>
        </div>
        {activity.length === 0 ? (
          <p className="text-text-tertiary text-sm py-4 text-center">
            Aucune activité enregistrée
          </p>
        ) : (
          activity.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              <History
                className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <p className="text-text-primary text-sm font-medium">
                  {ACTION_LABEL[a.action] ?? a.action} · {ENTITY_LABEL[a.entityType] ?? a.entityType}
                </p>
                {a.comment && (
                  <p className="text-text-tertiary text-xs mt-0.5">{a.comment}</p>
                )}
                <p className="text-text-tertiary text-[11px] mt-1">
                  {new Date(a.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {error && (
        <div
          className="mt-4 p-3 rounded-xl text-sm"
          style={{
            backgroundColor: "#E5133220",
            border: "1px solid #E5133240",
            color: "#ff8fa3",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Overview ───────────────────────────────────────────────────────────────

export default function CentralAdmin() {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useCurrentUser();
  const ctx = useOrganizationContext();
  const { allowed, isCentralRole, managedOrgs } = useCentralAccessMulti(ctx.orgId);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  useEffect(() => {
    if (allowed && !id) {
      getOrgStats(user?.id ?? "").then(setStats).catch(() => setStats(null));
    }
  }, [allowed, id, user?.id]);

  const confirmArchive = (o: PSOrganization) =>
    act(
      async () => {
        await archiveOrganization(
          o.id,
          user?.id ?? "",
          archiveReason.trim() || "Archivée depuis l'administration centrale",
          o,
        );
        setArchiveTarget(null);
        setArchiveReason("");
      },
      o.id,
    );

  const kpis = [
    { label: "Total", value: stats?.total ?? managedOrgs?.length ?? 0, color: "var(--accent-primary)", icon: Building2 },
    { label: "Actives", value: stats?.byStatus.ACTIVE ?? 0, color: "#1DB954", icon: ShieldCheck },
    { label: "En attente", value: stats?.byStatus.PENDING ?? 0, color: "#FFB800", icon: Clock },
    { label: "Suspendues", value: stats?.byStatus.SUSPENDED ?? 0, color: "var(--accent-primary)", icon: ShieldOff },
    { label: "Archivées", value: stats?.byStatus.ARCHIVED ?? 0, color: "#808080", icon: Archive },
  ];

  // Access gate — a non-central user never sees the dashboard.
  if (!allowed) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/dashboard" />
            </IonButtons>
            <IonTitle>Administration centrale</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="bg-canvas">
          <div className="min-h-screen bg-canvas">
            <TopHeader title="Administration centrale" />
            <div className="max-w-lg mx-auto px-5 pb-32 pt-24">
              <div className="p-6 rounded-xl text-center" style={{ backgroundColor: "var(--surface)" }}>
                <Shield className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-primary font-semibold mb-1">
                  Accès réservé
                </p>
                <p className="text-text-tertiary text-sm">
                  Vous n'êtes pas administrateur central. Cette zone est
                  accessible uniquement aux admins détenant un grant actif.
                </p>
                <IonButton
                  expand="block"
                  fill="outline"
                  className="mt-4"
                  onClick={() => navigate("/dashboard")}
                >
                  Retour au tableau de bord
                </IonButton>
              </div>
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const act = async (fn: () => Promise<void>, key: string, refresh = true) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      if (refresh && !id) {
        await getOrgStats(user?.id ?? "").then(setStats).catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message ?? "Opération refusée (le serveur n'a pas autorisé cette mutation).");
    } finally {
      setBusy(null);
    }
  };

  const openOrg = async (o: PSOrganization) => {
    // T4: enter the org context, verified against the local grant/membership.
    const ok = await enterOrganization(o.id);
    if (ok) navigate("/dashboard");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>Administration centrale</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          {/* Distinct central banner */}
          <div
            className="px-5 pt-4 pb-2"
            style={{
              backgroundColor: "#1a130f",
              borderBottom: "1px solid #3a2a1a",
            }}
          >
            <div className="max-w-lg mx-auto flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
              <span
                className="text-xs font-bold tracking-widest"
                style={{ color: "var(--accent-primary)" }}
              >
                ADMINISTRATION CENTRALE
              </span>
              {isCentralRole && (
                <IonBadge color="light">Admin central</IonBadge>
              )}
            </div>
          </div>

          <div className="max-w-lg mx-auto px-5 pb-32 pt-4">
            {id ? (
              <OrgDetail orgId={id} onBack={() => navigate("/admin")} />
            ) : (
              <>
                {/* Context switch action */}
                {ctx.mode === "CENTRAL" && (
                  <div className="mb-4 space-y-2">
                    <IonButton
                      expand="block"
                      fill="outline"
                      onClick={() => {
                        exitToCentral();
                        navigate("/dashboard");
                      }}
                    >
                      <Play className="w-4 h-4 mr-1" /> Revenir à mon organisation
                    </IonButton>
                    <IonButton
                      expand="block"
                      fill="clear"
                      onClick={() => navigate("/admin/federation")}
                    >
                      <Users className="w-4 h-4 mr-1" /> Voir la fédération
                    </IonButton>
                  </div>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {kpis.map((k) => (
                    <div
                      key={k.label}
                      className="rounded-xl p-4"
                      style={{ backgroundColor: "var(--surface)" }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
                        style={{ backgroundColor: tint(k.color, 12) }}
                      >
                        <k.icon className="w-5 h-5" style={{ color: k.color }} />
                      </div>
                      <p className="text-2xl font-bold text-text-primary">
                        {k.value}
                      </p>
                      <p className="text-text-tertiary text-xs">{k.label}</p>
                    </div>
                  ))}
                </div>

                {/* Org list */}
                <p className="text-text-primary font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                  Organisations gérées
                </p>

                {managedOrgs && managedOrgs.length === 0 ? (
                  <p className="text-text-tertiary text-sm py-6 text-center">
                    Aucune organisation gérée pour le moment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(managedOrgs ?? []).map((o) => (
                      <div
                        key={o.id}
                        className="rounded-xl p-4"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-text-primary font-semibold">
                            {o.name}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${STATUS_COLOR[o.status]}20`,
                              color: STATUS_COLOR[o.status],
                            }}
                          >
                            {STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <IonButton
                            size="small"
                            fill="outline"
                            color="medium"
                            onClick={() => openOrg(o)}
                          >
                            <Building2 className="w-3 h-3 mr-1" /> Ouvrir
                          </IonButton>
                          <IonButton
                            size="small"
                            fill="outline"
                            color="secondary"
                            onClick={() => navigate(`/admin/organizations/${o.id}`)}
                          >
                            <History className="w-3 h-3 mr-1" /> Historique
                          </IonButton>

                          {o.status === "SUSPENDED" ? (
                            <IonButton
                              size="small"
                              fill="outline"
                              color="success"
                              disabled={busy === o.id}
                              onClick={() =>
                                act(
                                  () =>
                                    reactivateOrganization(o.id, user?.id ?? "", o),
                                  o.id,
                                )
                              }
                            >
                              <Play className="w-3 h-3 mr-1" /> Réactiver
                            </IonButton>
                          ) : o.status === "ACTIVE" ? (
                            <IonButton
                              size="small"
                              fill="outline"
                              color="warning"
                              disabled={busy === o.id}
                              onClick={() =>
                                act(
                                  () =>
                                    suspendOrganization(o.id, user?.id ?? "", o),
                                  o.id,
                                )
                              }
                            >
                              <ShieldOff className="w-3 h-3 mr-1" /> Suspendre
                            </IonButton>
                          ) : null}

                          {o.status !== "ARCHIVED" && (
                            archiveTarget === o.id ? (
                              <div className="flex items-center gap-1.5 mt-2 w-full">
                                <input
                                  data-testid="archive-reason"
                                  value={archiveReason}
                                  onChange={(e) => setArchiveReason(e.target.value)}
                                  placeholder="Raison (optionnel)"
                                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs"
                                  style={{
                                    backgroundColor: "var(--card)",
                                    color: "var(--text-primary)",
                                    border: "1px solid var(--border)",
                                  }}
                                />
                                <button
                                  type="button"
                                  data-testid="archive-confirm"
                                  onClick={() => confirmArchive(o)}
                                  disabled={busy === o.id}
                                  className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                                  style={{ backgroundColor: "var(--accent-primary)" }}
                                >
                                  Valider
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setArchiveTarget(null);
                                    setArchiveReason("");
                                  }}
                                  className="px-2 py-1.5 text-[11px] font-semibold"
                                  style={{
                                    color: "var(--text-secondary)",
                                    background: "transparent",
                                    border: "none",
                                  }}
                                >
                                  Annuler
                                </button>
                              </div>
                            ) : (
                              <IonButton
                                size="small"
                                fill="outline"
                                color="dark"
                                disabled={busy === o.id}
                                onClick={() => {
                                  setArchiveTarget(o.id);
                                  setArchiveReason("");
                                }}
                              >
                                <Archive className="w-3 h-3 mr-1" /> Archiver
                              </IonButton>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {error && (
              <div
                className="mt-4 p-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "#E5133220",
                  border: "1px solid #E5133240",
                  color: "#ff8fa3",
                }}
              >
                {error}
              </div>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
