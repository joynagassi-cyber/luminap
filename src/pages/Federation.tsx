/**
 * Federation Management Page
 *
 * UI for managing hierarchical organization structures (parent → children).
 * Admins can:
 *   - View federation tree (org + its children)
 *   - Create new child organizations under a parent
 *   - Re-parent organizations
 *
 * Route: /admin/federation
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
} from "@ionic/react";
import {
  Network,
  Building2,
  Plus,
  GitBranch,
  ChevronRight,
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { useCurrentUser } from "@/lib/dataLayer";
import {
  federation,
  type FederationOrg,
} from "@/capabilities/federation";
import { bootstrapOrganization } from "@/lib/orgBootstrap";

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

function OrgNode({
  org,
  children,
  onOpen,
  onCreate,
  onReparent,
}: {
  org: FederationOrg;
  children: FederationOrg[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onReparent: (orgId: string) => void;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ backgroundColor: "#212121", border: "1px solid #282828" }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
          }}
        >
          <Building2 className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-text-primary font-semibold truncate">{org.name}</p>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{
                backgroundColor: `${STATUS_COLOR[org.status]}20`,
                color: STATUS_COLOR[org.status],
              }}
            >
              {STATUS_LABEL[org.status] ?? org.status}
            </span>
          </div>
          <p className="text-text-tertiary text-xs truncate">{org.type}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpen(org.id)}
            title="Voir les enfants"
            aria-label="Voir les enfants"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
            style={{ color: "#B3B3B3", border: "none", background: "transparent", cursor: "pointer" }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onReparent(org.id)}
            title="Changer de parent"
            aria-label="Changer de parent"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95"
            style={{ color: "#B3B3B3", border: "none", background: "transparent", cursor: "pointer" }}
          >
            <GitBranch className="w-4 h-4" />
          </button>
        </div>
      </div>

      {children.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l border-[#282828] pl-4">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              <Building2
                className="w-4 h-4 text-text-tertiary flex-shrink-0"
              />
              <span className="text-text-primary text-sm flex-1 truncate">
                {child.name}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${STATUS_COLOR[child.status]}20`,
                  color: STATUS_COLOR[child.status],
                }}
              >
                {STATUS_LABEL[child.status] ?? child.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Federation() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [bootstrapping, setBootstrapping] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<{ orgId: string; name: string } | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [children, setChildren] = useState<FederationOrg[]>([]);
  const [allOrgs, setAllOrgs] = useState<FederationOrg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New org form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("CHURCH");
  const [newParent, setNewParent] = useState<string | "">("");
  const [creating, setCreating] = useState(false);

  // Re-parenting inline (remplace le window.prompt)
  const [reparentOrg, setReparentOrg] = useState<string | null>(null);
  const [reparentTarget, setReparentTarget] = useState("");
  const [reparenting, setReparenting] = useState(false);

  const loadOrgs = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const orgs = await federation.listOrgs(user.id);
      setAllOrgs(orgs);
      if (selectedOrg) {
        const ch = await federation.getOrgChildren(selectedOrg);
        setChildren(ch);
      }
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedOrg]);

  const handleOpenOrg = async (orgId: string) => {
    setSelectedOrg(orgId === selectedOrg ? null : orgId);
  };

  const handleCreate = async () => {
    if (!user?.id || !newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const newId = `org-${Date.now()}`;
      await federation.createOrg(
        newId,
        newName.trim(),
        {
          type: newType,
          parentOrgId: newParent || null,
        },
        user.id,
      );
      setNewName("");
      setNewType("CHURCH");
      setNewParent("");
      setShowCreate(false);
      await loadOrgs();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  /**
   * Créer une organisation OPÉRATIONNELLE (service_role) : l'organisation est
   * ACTIVE et le créateur devient son admin. Le client seul ne peut pas le
   * faire (RLS), c'est le rôle de la fonction `create_org`. Ensuite on peut
   * inviter des membres (RBAC) sur cette organisation.
   */
  const handleBootstrap = async () => {
    if (!newName.trim()) return;
    setBootstrapping(true);
    setError(null);
    try {
      const res = await bootstrapOrganization({
        name: newName.trim(),
        type: newType,
        parentOrgId: newParent || null,
      });
      setCreatedOrg({ orgId: res.orgId, name: res.name });
      setNewName("");
      setNewType("CHURCH");
      setNewParent("");
      setShowCreate(false);
      await loadOrgs();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la création opérationnelle");
    } finally {
      setBootstrapping(false);
    }
  };

  const openReparent = (orgId: string) => {
    setReparentOrg(orgId);
    setReparentTarget("");
  };

  const applyReparent = async () => {
    if (!user?.id || !reparentOrg) return;
    setReparenting(true);
    setError(null);
    try {
      await federation.setParentOrg(
        reparentOrg,
        reparentTarget || null,
        user.id,
      );
      setReparentOrg(null);
      await loadOrgs();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du re-parenting");
    } finally {
      setReparenting(false);
    }
  };

  const rootOrgs = allOrgs.filter((o) => !o.parentOrgId);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/admin" />
          </IonButtons>
          <IonTitle>Fédération</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Gestion de la fédération" />
          <div className="max-w-lg mx-auto px-5 pb-32 pt-24">
            {/* Create button (bouton natif — les enfants d'IonButton ne sont
                pas rendus fiablement sous React 19) */}
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-full font-semibold text-white text-sm transition-all active:scale-95 mb-4"
              style={{ backgroundColor: "var(--accent-primary)" }}
              aria-label="Créer une organisation"
            >
              <Plus className="w-4 h-4" /> Créer une organisation
            </button>

            {/* Create form — contrôles natifs : les IonSelect ouvrent un
                picker blanc vide sous React 19 (enfants non rendus), illisible
                pour sélectionner. Le <select> natif garantit les options. */}
            {showCreate && (
              <div
                className="rounded-xl p-4 mb-4 space-y-4"
                style={{ backgroundColor: "#212121", border: "1px solid #282828" }}
              >
                <div>
                  <label
                    className="block text-text-tertiary text-xs uppercase tracking-wide mb-1.5"
                    htmlFor="org-name"
                  >
                    Nom
                  </label>
                  <input
                    id="org-name"
                    data-testid="org-name"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Paroisse Sainte-Marie"
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{
                      backgroundColor: "#181818",
                      color: "#fff",
                      border: "1px solid #282828",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-text-tertiary text-xs uppercase tracking-wide mb-1.5"
                    htmlFor="org-type"
                  >
                    Type d'organisation
                  </label>
                  <select
                    id="org-type"
                    data-testid="org-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{
                      backgroundColor: "#181818",
                      color: "#fff",
                      border: "1px solid #282828",
                    }}
                  >
                    <option value="CHURCH">Église</option>
                    <option value="SCHOOL">École</option>
                    <option value="ENTERPRISE">Entreprise</option>
                    <option value="CENTRAL">Centrale</option>
                  </select>
                </div>
                <div>
                  <label
                    className="block text-text-tertiary text-xs uppercase tracking-wide mb-1.5"
                    htmlFor="org-parent"
                  >
                    Organisation parente (optionnel)
                  </label>
                  <select
                    id="org-parent"
                    data-testid="org-parent"
                    value={newParent}
                    onChange={(e) => setNewParent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm"
                    style={{
                      backgroundColor: "#181818",
                      color: "#fff",
                      border: "1px solid #282828",
                    }}
                  >
                    <option value="">Aucune (racine)</option>
                    {rootOrgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="w-full py-3 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                  aria-label="Créer l'organisation"
                >
                  {creating ? "Création..." : "Créer"}
                </button>
                <button
                  type="button"
                  onClick={handleBootstrap}
                  disabled={bootstrapping || !newName.trim()}
                  className="w-full py-3 rounded-full font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--accent-primary)",
                    border: "1px solid var(--accent-primary)",
                  }}
                  aria-label="Créer une organisation opérationnelle"
                >
                  {bootstrapping
                    ? "Création opérationnelle..."
                    : "Créer opérationnelle (admin + ACTIVE)"}
                </button>
                <p className="text-[11px] text-text-tertiary leading-snug">
                  « Opérationnelle » = organisation ACTIVE dont vous êtes
                  l'admin (via la fonction serveur), prête à recevoir des
                  membres par invitation. Nécessite un grant admin central.
                </p>
              </div>
            )}

            {/* Organisation opérationnelle créée → inviter des membres (RBAC) */}
            {createdOrg && (
              <div
                className="rounded-xl p-4 mb-4 space-y-3"
                style={{ backgroundColor: "#1DB95418", border: "1px solid #1DB95440" }}
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" style={{ color: "#1DB954" }} />
                  <p className="text-sm font-medium" style={{ color: "#1DB954" }}>
                    « {createdOrg.name} » créée (opérationnelle). Vous êtes son admin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/invitation/emit?org=${createdOrg.orgId}`)}
                  className="w-full py-3 rounded-full font-semibold text-white text-sm transition-all active:scale-95"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  Inviter des membres (rôle + organisation)
                </button>
              </div>
            )}

            {/* Federation tree */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                <span className="text-text-primary font-semibold text-sm">
                  Arborescence des organisations
                </span>
              </div>

              {loading ? (
                <p className="text-text-tertiary text-sm py-4 text-center">Chargement...</p>
              ) : rootOrgs.length === 0 ? (
                <div
                  className="rounded-xl p-4 text-sm text-center space-y-2"
                  style={{ backgroundColor: "#212121", border: "1px solid #282828" }}
                >
                  <p className="text-text-tertiary">
                    Aucune organisation visible pour votre compte.
                  </p>
                  <p className="text-text-tertiary text-xs leading-relaxed">
                    La création d&apos;organisation opérationnelle et la gestion de
                    la fédération sont réservées aux <strong>admins centraux</strong>{" "}
                    (détenteurs d&apos;un grant <code>org_admins</code> actif). Si
                    vous n&apos;y voyez rien, votre compte n&apos;a pas encore le
                    rôle admin central — demandez-le à l&apos;administrateur de
                    Lumina.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/admin")}
                    className="mt-1 text-xs font-semibold"
                    style={{
                      color: "var(--accent-primary)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Voir mon accès admin central
                  </button>
                </div>
              ) : (
                rootOrgs.map((org) => (
                  <div key={org.id}>
                    {selectedOrg === org.id ? (
                      <div>
                        <OrgNode
                          org={org}
                          children={children}
                          onOpen={handleOpenOrg}
                          onCreate={() => setShowCreate(true)}
                          onReparent={openReparent}
                        />
                      </div>
                    ) : (
                      <OrgNode
                        org={org}
                        children={[]}
                        onOpen={handleOpenOrg}
                        onCreate={() => setShowCreate(true)}
                        onReparent={openReparent}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Re-parenting inline (sans prompt) */}
            {reparentOrg && (
              <div
                className="rounded-xl p-4 mt-4 space-y-3"
                style={{
                  backgroundColor: "#1a130f",
                  border: "1px solid #3a2a1a",
                }}
              >
                <div className="flex items-center gap-2">
                  <GitBranch
                    className="w-4 h-4"
                    style={{ color: "var(--accent-primary)" }}
                  />
                  <span className="text-text-primary font-semibold text-sm">
                    Changer de parent —{" "}
                    {allOrgs.find((o) => o.id === reparentOrg)?.name ?? reparentOrg}
                  </span>
                </div>
                <select
                  data-testid="reparent-target"
                  value={reparentTarget}
                  onChange={(e) => setReparentTarget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{
                    backgroundColor: "#181818",
                    color: "#fff",
                    border: "1px solid #282828",
                  }}
                >
                  <option value="">Détacher (aucun parent)</option>
                  {rootOrgs
                    .filter((o) => o.id !== reparentOrg)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="reparent-apply"
                    onClick={applyReparent}
                    disabled={reparenting}
                    className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    {reparenting ? "Application…" : "Appliquer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReparentOrg(null)}
                    className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
                    style={{
                      color: "#B3B3B3",
                      border: "1px solid #282828",
                      background: "transparent",
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
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

            {/* 403 explicite : le compte n'est pas admin central */}
            {error?.includes("Admin central requis") && (
              <div
                className="mt-3 p-3 rounded-xl text-xs space-y-2"
                style={{
                  backgroundColor: "#FFB80015",
                  border: "1px solid #FFB80040",
                  color: "#FFB800",
                }}
              >
                <p className="font-semibold">
                  Votre compte n&apos;est pas administrateur central.
                </p>
                <p className="leading-relaxed" style={{ color: "#B3B3B3" }}>
                  Seuls les détenteurs d&apos;un grant admin central actif peuvent
                  créer une organisation opérationnelle. Connectez-vous avec le
                  compte admin central (ex. <code>admin@mfe-jc.org</code>) ou
                  demandez qu&apos;on vous attribue ce rôle.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  className="font-semibold"
                  style={{
                    color: "var(--accent-primary)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Voir mon accès admin central
                </button>
              </div>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
