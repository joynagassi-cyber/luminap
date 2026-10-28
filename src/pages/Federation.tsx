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
import { IonPage, IonHeader, IonContent, IonTitle, IonToolbar, IonButtons, IonBackButton, IonSelect, IonSelectOption, IonItem, IonLabel, IonInput } from "@ionic/react";
import { ReactFlowProvider } from "@xyflow/react";
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
import EmptyState from "@/components/EmptyState";
import FederationGraph from "@/components/FederationGraph";
import { useCurrentUser } from "@/lib/dataLayer";
import {
  federation,
  FEDERATION_STATUS_COLOR,
  FEDERATION_STATUS_LABEL,
  FEDERATION_TYPE_LABEL,
  type FederationOrg,
} from "@/capabilities/federation";
import { bootstrapOrganization } from "@/lib/orgBootstrap";
import { reparentTargets } from "@/lib/orgTree";
import type { IonChangeCustomEvent } from "@/lib/ionic-types";

// M22 — libellés de statut UNIQUE partagés (capabilities/federation) :
// vue liste et vue graphe (FederationGraph) ne dupliquent plus de map locale.
const STATUS_LABEL = FEDERATION_STATUS_LABEL;

// M22 — carte de statut UNIQUE partagée (vue liste + vue graphe) :
// plus de map locale qui diverge (ex. SUSPENDED en accent vs data-expense).
const STATUS_COLOR = FEDERATION_STATUS_COLOR;

/**
 * Actions d'une carte d'organisation — partagées par les cartes racines ET
 * les cartes enfants. Sans elles sur les enfants, une hiérarchie de plus de
 * deux niveaux était impossible à construire depuis l'UI : la carte enfant
 * n'exposait ni « Ajouter sous cette org » ni « Voir les enfants ».
 */
function OrgNodeActions({
  org,
  onCreate,
  onOpen,
  onReparent,
}: {
  org: FederationOrg;
  onCreate: (parentOrgId: string) => void;
  onOpen: (id: string) => void;
  onReparent: (orgId: string) => void;
}) {
  const btn =
    "w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95";
  const style = {
    color: "var(--text-secondary)",
    border: "none",
    background: "transparent",
    cursor: "pointer",
  } as const;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onCreate(org.id)}
        title="Ajouter sous cette org"
        aria-label="Ajouter sous cette org"
        data-testid={`org-add-child-${org.id}`}
        className={btn}
        style={style}
      >
        <UserPlus className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onOpen(org.id)}
        title="Voir les enfants"
        aria-label="Voir les enfants"
        data-testid={`org-open-${org.id}`}
        className={btn}
        style={style}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onReparent(org.id)}
        title="Changer de parent"
        aria-label="Changer de parent"
        data-testid={`org-reparent-${org.id}`}
        className={btn}
        style={style}
      >
        <GitBranch className="w-4 h-4" />
      </button>
    </div>
  );
}

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
  onCreate: (parentOrgId: string) => void;
  onReparent: (orgId: string) => void;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-3 p-3 rounded-xl"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
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
              className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{
                backgroundColor: `${STATUS_COLOR[org.status]}20`,
                color: STATUS_COLOR[org.status],
              }}
            >
              {STATUS_LABEL[org.status] ?? org.status}
            </span>
          </div>
          <p className="text-text-tertiary text-xs truncate">
            {FEDERATION_TYPE_LABEL[org.type] ?? org.type}
          </p>
        </div>
        <OrgNodeActions
          org={org}
          onCreate={onCreate}
          onOpen={onOpen}
          onReparent={onReparent}
        />
      </div>

      {children.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l border-border pl-4">
          {children.map((child) => (
            <div
              key={child.id}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <Building2
                className="w-4 h-4 text-text-tertiary flex-shrink-0"
              />
              <span className="text-text-primary text-sm flex-1 truncate">
                {child.name}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: `${STATUS_COLOR[child.status]}20`,
                  color: STATUS_COLOR[child.status],
                }}
              >
                {STATUS_LABEL[child.status] ?? child.status}
              </span>
              <OrgNodeActions
                org={child}
                onCreate={onCreate}
                onOpen={onOpen}
                onReparent={onReparent}
              />
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

  // M22 — toggle de vue unifié : liste (défaut) ou graphe (mode explicite).
  // La vue graphe (FederationGraph, React Flow) n'est montée QUE dans ce
  // mode : un composant unique partage la carte de statut FEDERATION_STATUS_COLOR.
  const [view, setView] = useState<"list" | "graph">("list");

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

  /**
   * Bouton contextuel « Ajouter sous cette org » — ouvre le formulaire de
   * création avec le parent pré-rempli à `org.id` (pattern L346-442).
   * La création récursive passe par `federation.createOrg` (Phase 2 T2.1) ;
   * le composant OrgChildren réutilise le même contrat.
   */
  const handleCreateUnder = (orgId: string) => {
    setNewParent(orgId);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!user?.id || !newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      // Les deux boutons vivent dans le MÊME formulaire : on bascule sur le
      // chemin serveur (ACTIVE + admin) au lieu de l'insert PENDING local.
      // Voir la note sur `handleBootstrap` ci-dessous.
      await handleBootstrap();
      return;
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
   *
   * C'est le SEUL chemin de création exposé. L'ancien bouton « Créer »
   * (insert PowerSync local, statut PENDING) écrivait une organisation sans
   * aucun lien d'appartenance (`profiles.org_id`, `org_memberships` ni
   * `org_admins`). Or `listOrgs()` et la RLS `is_org_member()` n'exposent une
   * organisation qu'à ses membres/admins : l'organisation créée était donc
   * définitivement INVISIBLE pour tout le monde, y compris son créateur
   * (orphelin en base, constaté sur `Annexe A 542602`). Le chemin local est
   * conservé pour la reprise hors-ligne (PROPOSITIONS.md P1).
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

  // R122 — le sélecteur de re-parentage n'offrait que les RACINES
  // (`rootOrgs`), alors que la création accepte toute organisation
  // visible : il était donc impossible de déplacer une organisation
  // sous une annexe existante (profondeur plafonnée à 1). On aligne les
  // deux sélecteurs sur « toute org visible », en excluant self et
  // descendants (anti-cycle, même source de vérité que l'écriture).
  const reparentCandidates = reparentOrg
    ? reparentTargets(reparentOrg, allOrgs)
    : [];

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
      <h1 className="sr-only">Fédération</h1>
        <div className="min-h-dvh">
          <TopHeader title="Gestion de la fédération" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            {/* M22 — segmented control Liste | Graphe : un seul composant,
                la vue graphe (React Flow) est un mode explicite. */}
            <div
              role="tablist"
              aria-label="Mode d'affichage de la fédération"
              className="mb-4 p-1 rounded-full flex items-center gap-1"
              style={{ backgroundColor: "var(--surface)" }}
            >
              {(["list", "graph"] as const).map((mode) => {
                const active = view === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setView(mode)}
                    className="flex-1 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
                    style={
                      active
                        ? { backgroundColor: "var(--accent-primary)", color: "var(--on-accent)" }
                        : { backgroundColor: "transparent", color: "var(--text-secondary)" }
                    }
                  >
                    {mode === "list" ? "Liste" : "Graphe"}
                  </button>
                );
              })}
            </div>

            {view === "list" ? (
            <>
            {/* Create button (bouton natif — les enfants d'IonButton ne sont
                pas rendus fiablement sous React 19) */}
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-full font-semibold text-on-accent text-sm transition-all active:scale-95 mb-4"
              style={{ backgroundColor: "var(--accent-primary)" }}
              aria-label="Créer une organisation"
            >
              <Plus className="w-4 h-4" /> Créer une organisation
            </button>

            {/* Converti en IonSelect (popover) : l'ancien commentaire justifiait
                un <select> natif (picker IonSelect illisible sous React 19) ;
                le popover Ionic rend bien les options. */}
            {showCreate && (
              <div
                className="rounded-xl p-4 mb-4 space-y-4"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel position="floating" className="text-sm text-text-secondary">Nom</IonLabel>
                  <IonInput
                    id="org-name"
                    data-testid="org-name"
                    type="text"
                    value={newName}
                    onIonInput={(e: IonChangeCustomEvent<string>) => setNewName(e.detail.value ?? "")}
                    placeholder="Ex: Paroisse Sainte-Marie"
                  />
                </IonItem>
                {/* M24 — grammaire canonique : IonItem + IonLabel + IonSelect */}
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel position="floating" className="text-sm text-text-secondary">
                    Type d'organisation
                  </IonLabel>
                  <IonSelect
                    id="org-type"
                    data-testid="org-type"
                    value={newType}
                    onIonChange={(e: IonChangeCustomEvent<string>) => setNewType(e.detail.value)}
                    interface="popover"
                    style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                  >
                    <IonSelectOption value="CHURCH">Église</IonSelectOption>
                    <IonSelectOption value="SCHOOL">École</IonSelectOption>
                    <IonSelectOption value="ENTERPRISE">Entreprise</IonSelectOption>
                    <IonSelectOption value="CENTRAL">Centrale</IonSelectOption>
                  </IonSelect>
                </IonItem>
                <IonItem lines="none" className="bg-card rounded-xl">
                  <IonLabel position="floating" className="text-sm text-text-secondary">
                    Organisation parente (optionnel)
                  </IonLabel>
                  <IonSelect
                    id="org-parent"
                    data-testid="org-parent"
                    value={newParent}
                    onIonChange={(e: IonChangeCustomEvent<string>) => setNewParent(e.detail.value)}
                    interface="popover"
                    style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                  >
                    <IonSelectOption value="">Aucune (racine)</IonSelectOption>
                    {/* Toute org visible (racines + annexes) peut être parente :
                        la création récursive (Phase 2) s'appuie sur parent_org_id. */}
                    {allOrgs.map((o) => (
                      <IonSelectOption key={o.id} value={o.id}>
                        {o.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </IonItem>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || bootstrapping || !newName.trim()}
                  className="w-full py-3 rounded-full font-semibold text-on-accent text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                  aria-label="Créer l'organisation"
                >
                  {creating || bootstrapping ? "Création…" : "Créer"}
                </button>
                <p className="text-xs text-text-tertiary leading-snug">
                  L'organisation est créée ACTIVE dont vous êtes l'admin, prête
                  à recevoir des membres par invitation. Nécessite un grant
                  admin central.
                </p>
              </div>
            )}

            {/* Organisation opérationnelle créée → inviter des membres (RBAC) */}
            {createdOrg && (
              <div
                className="rounded-xl p-4 mb-4 space-y-3"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--data-income) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--data-income) 25%, transparent)",
                }}
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" style={{ color: "var(--data-income)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--data-income)" }}>
                    « {createdOrg.name} » créée (opérationnelle). Vous êtes son admin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/invitation/emit?org=${createdOrg.orgId}`)}
                  className="w-full py-3 rounded-full font-semibold text-on-accent text-sm transition-all active:scale-95"
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
                <button
                  type="button"
                  onClick={() => setView("graph")}
                  className="ml-auto flex items-center gap-1 text-xs font-semibold transition-all active:scale-95"
                  style={{
                    color: "var(--accent-primary)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px",
                    borderRadius: 999,
                  }}
                  aria-label="Voir en diagramme"
                >
                  <GitBranch className="w-3.5 h-3.5" /> Diagramme
                </button>
              </div>

              {loading ? (
                <p className="text-text-tertiary text-sm py-4 text-center">Chargement...</p>
              ) : rootOrgs.length === 0 ? (
                <EmptyState
                  title="Aucune organisation visible pour votre compte."
                  description="La création d'organisation opérationnelle et la gestion de la fédération sont réservées aux admins centraux (détenteurs d'un accès admin central actif)."
                  icon={<GitBranch className="w-6 h-6" />}
                  actionLabel="Voir mon accès admin central"
                  onAction={() => navigate("/admin")}
                />
              ) : (
                rootOrgs.map((org) => (
                  <div key={org.id}>
                    {selectedOrg === org.id ? (
                      <div>
                        <OrgNode
                          org={org}
                          children={children}
                          onOpen={handleOpenOrg}
                          onCreate={handleCreateUnder}
                          onReparent={openReparent}
                        />
                      </div>
                    ) : (
                      <OrgNode
                        org={org}
                        children={[]}
                        onOpen={handleOpenOrg}
                        onCreate={handleCreateUnder}
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
                  backgroundColor: "var(--band-central)",
                  border: "1px solid var(--surface-active)",
                }}
              >
                <div className="flex items-center gap-2">
                  <GitBranch
                    className="w-4 h-4"
                    style={{ color: "var(--accent-primary)" }}
                  />
                  <span className="text-text-primary font-semibold text-sm">
                    Changer de parent —{" "}
                    {allOrgs.find((o) => o.id === reparentOrg)?.name ?? "chargement…"}
                  </span>
                </div>
                <IonSelect
                  data-testid="reparent-target"
                  value={reparentTarget}
                  onIonChange={(e: IonChangeCustomEvent<string>) => setReparentTarget(e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value="">Détacher (aucun parent)</IonSelectOption>
                  {reparentCandidates
                    .map((o) => (
                      <IonSelectOption key={o.id} value={o.id}>
                        {o.name}
                      </IonSelectOption>
                    ))}
                </IonSelect>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="reparent-apply"
                    onClick={applyReparent}
                    disabled={reparenting}
                    className="flex-1 py-2.5 rounded-full text-sm font-semibold text-on-accent transition-all active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                  >
                    {reparenting ? "Application…" : "Appliquer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReparentOrg(null)}
                    className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95"
                    style={{
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                      background: "transparent",
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            </>
            ) : (
            /* M22 — mode graphe : React Flow monté dans un Provider unique,
               partageant la carte de statut FEDERATION_STATUS_COLOR. */
            <ReactFlowProvider>
              <FederationGraph />
            </ReactFlowProvider>
            )}

            {/* Error */}
            {error && (
              <div
                className="mt-4 p-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--data-expense) 25%, transparent)",
                  color: "var(--data-expense)",
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
                  backgroundColor: "color-mix(in srgb, var(--data-pending) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--data-pending) 25%, transparent)",
                  color: "var(--data-pending)",
                }}
              >
                <p className="font-semibold">
                  Votre compte n&apos;est pas administrateur central.
                </p>
                <p className="leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  Seuls les détenteurs d&apos;un accès admin central actif peuvent
                  créer une organisation opérationnelle. Connectez-vous avec un
                  compte admin central ou demandez qu&apos;on vous attribue ce rôle.
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
