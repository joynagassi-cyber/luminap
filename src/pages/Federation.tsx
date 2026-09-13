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
} from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { useCurrentUser, useOrganizations } from "@/lib/dataLayer";
import {
  federation,
  type FederationOrg,
} from "@/capabilities/federation";

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
  const { data: managedOrgs } = useOrganizations("central");
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

  const handleReparent = async (orgId: string) => {
    if (!user?.id) return;
    const target = window.prompt(
      "Nouvelle organisation parente (id, ou laissez vide pour détacher) :",
    );
    if (target === null) return;
    setError(null);
    try {
      await federation.setParentOrg(orgId, target.trim() || null, user.id);
      await loadOrgs();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors du re-parenting");
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
                <p className="text-text-tertiary text-sm py-6 text-center">
                  Aucune organisation racine. Créez-en une pour démarrer.
                </p>
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
                          onReparent={handleReparent}
                        />
                      </div>
                    ) : (
                      <OrgNode
                        org={org}
                        children={[]}
                        onOpen={handleOpenOrg}
                        onCreate={() => setShowCreate(true)}
                        onReparent={handleReparent}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

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
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
