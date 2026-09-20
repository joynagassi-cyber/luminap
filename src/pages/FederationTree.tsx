/**
 * Federation Tree — diagramme visuel (React Flow) de la fédération.
 *
 * Dessine chaque organisation visible pour l'utilisateur courant comme un
 * nœud, et les liens parent → enfant comme des arêtes : une forêt d'arbres
 * enracinés aux organisations de plus haut niveau. Vue auto-fit au chargement,
 * nœuds déplaçables, zoom/mini-carte, et clic sur un nœud → vue admin de
 * l'organisation.
 *
 * Route: /admin/federation/tree
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type ReactFlowInstance,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { IonPage, IonContent } from "@ionic/react";
import {
  Network,
  Building2,
  GitBranch,
  Maximize2,
} from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { FederationTreeSkeleton } from "@/components/PageSkeletons";
import { useCurrentUser } from "@/lib/dataLayer";
import { federation, type FederationOrg } from "@/capabilities/federation";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  ARCHIVED: "Archivée",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#FFB800",
  ACTIVE: "#1DB954",
  SUSPENDED: "#E51332",
  ARCHIVED: "#808080",
};

const TYPE_LABEL: Record<string, string> = {
  CHURCH: "Église",
  SCHOOL: "École",
  ENTERPRISE: "Entreprise",
  CENTRAL: "Centrale",
};

interface OrgNodeData {
  org: FederationOrg;
}

const handleStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "var(--accent-primary)",
  border: "2px solid var(--canvas)",
};

/* ── Nœud personnalisé (carte organisation) ── */
function OrgFlowNode({ data, selected }: NodeProps) {
  const { org } = data as unknown as OrgNodeData;
  const color = STATUS_COLOR[org.status] ?? "var(--text-tertiary)";
  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        padding: 12,
        background: "#1f1f1f",
        border: `1px solid ${selected ? "var(--accent-primary)" : "#2e2e2e"}`,
        borderRadius: 8,
        boxShadow: selected
          ? "0 0 0 3px rgba(255,107,0,0.15)"
          : "0 4px 12px rgba(0,0,0,0.3)",
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background:
              "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
          }}
        >
          <Building2
            style={{ width: 18, height: 18, color: "var(--accent-primary)" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: "var(--text-primary)",
              fontWeight: 600,
              fontSize: 14,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {org.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 3,
            }}
          >
            <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
              {TYPE_LABEL[org.type] ?? org.type}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 10,
                fontWeight: 500,
                padding: "1px 7px",
                borderRadius: 999,
                background: `${color}22`,
                color,
              }}
            >
              {STATUS_LABEL[org.status] ?? org.status}
            </span>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
}

const nodeTypes = { org: OrgFlowNode };

/**
 * Layout « tidy tree » sans dépendance externe : chaque feuille reçoit un
 * index séquentiel en x, les nœuds internes sont centrés sur leurs enfants,
 * la profondeur donne y. Gère une forêt (plusieurs racines) et les nœuds
 * dont le parent n'est pas visible (traités comme racines).
 */
function layoutForest(orgs: FederationOrg[]) {
  const present = new Set(orgs.map((o) => o.id));
  const childrenOf = new Map<string, FederationOrg[]>();
  for (const o of orgs) {
    if (o.parentOrgId && present.has(o.parentOrgId)) {
      const arr = childrenOf.get(o.parentOrgId) ?? [];
      arr.push(o);
      childrenOf.set(o.parentOrgId, arr);
    }
  }
  const roots = orgs.filter(
    (o) => !o.parentOrgId || !present.has(o.parentOrgId),
  );

  const NODE_W = 220;
  const H_GAP = 56;
  const NODE_H = 68;
  const V_GAP = 64;
  const positions = new Map<string, { x: number; y: number }>();
  let leaf = 0;

  const place = (org: FederationOrg, depth: number): number => {
    const kids = childrenOf.get(org.id) ?? [];
    let x: number;
    if (kids.length === 0) {
      x = leaf;
      leaf += 1;
    } else {
      const centers = kids.map((c) => place(c, depth + 1));
      x = (centers[0] + centers[centers.length - 1]) / 2;
    }
    positions.set(org.id, {
      x: x * (NODE_W + H_GAP) + NODE_W / 2,
      y: depth * (NODE_H + V_GAP),
    });
    return x;
  };
  roots.forEach((r) => place(r, 0));

  const nodes: Node[] = orgs.map((o) => ({
    id: o.id,
    type: "org",
    position: positions.get(o.id) ?? { x: NODE_W / 2, y: 0 },
    data: { org: o },
  }));

  const edges: Edge[] = orgs
    .filter((o) => o.parentOrgId && present.has(o.parentOrgId))
    .map((o) => ({
      id: `e-${o.parentOrgId}-${o.id}`,
      source: o.parentOrgId as string,
      target: o.id,
      type: "smoothstep",
      style: { stroke: "#4a4a4a", strokeWidth: 1.5 },
    }));

  return { nodes, edges };
}

function FederationTreeInner() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<FederationOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await federation.listOrgs(user.id);
        if (cancelled) return;
        setOrgs(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const { nodes: n, edges: e } = layoutForest(orgs);
    setNodes(n);
    setEdges(e);
  }, [orgs]);

  const onInit = (inst: ReactFlowInstance) => {
    rfInstance.current = inst;
    inst.fitView({ padding: 0.2 });
  };

  const refit = () => rfInstance.current?.fitView({ padding: 0.2 });

  const hasContent = !loading && !error && orgs.length > 0;

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <style>{`
          .react-flow__controls { background: transparent; }
          .react-flow__controls button {
            background: var(--card);
            border: 1px solid var(--border);
            color: var(--text-primary);
            width: 28px;
            height: 28px;
            line-height: 28px;
            margin: 0;
            padding: 0;
          }
          .react-flow__controls button:hover { background: var(--surface-hover); }
          .react-flow__minimap { background: var(--card); border: 1px solid var(--border); }
        `}</style>
        <div style={{ minHeight: "100dvh" }}>
          <TopHeader title="Arborescence" />
          <div
            style={{
              padding: "88px 16px 120px",
              maxWidth: 720,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Network
                style={{ width: 18, height: 18, color: "var(--accent-primary)" }}
              />
              <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16 }}>
                Arborescence des organisations
              </span>
              {hasContent && (
                <>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "var(--text-tertiary)",
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Maximize2 style={{ width: 14, height: 14 }} />
                    <button
                      type="button"
                      onClick={refit}
                      data-testid="tree-refit"
                      aria-label="Recentrer la vue"
                      style={{
                        color: "var(--accent-primary)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {orgs.length} org
                    </button>
                  </span>
                </>
              )}
            </div>

            <div
              data-testid="federation-tree"
              style={{
                height: "calc(100dvh - 320px)",
                minHeight: 420,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--canvas)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {loading ? (
                <div style={{ padding: 16 }}>
                  <FederationTreeSkeleton />
                </div>
              ) : error ? (
                <div
                  style={{
                    padding: 20,
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    textAlign: "center",
                    marginTop: 24,
                  }}
                >
                  {error}
                </div>
              ) : orgs.length === 0 ? (
                <div
                  style={{
                    padding: 20,
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    textAlign: "center",
                    marginTop: 24,
                    lineHeight: 1.5,
                  }}
                >
                  <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 8 }}>
                    Aucune organisation visible pour votre compte.
                  </p>
                  <p style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
                    La vue diagramme est réservée aux admins centraux
                    (détenteurs d&apos;un grant <code>org_admins</code> actif).
                  </p>
                </div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onInit={onInit}
                  onNodeClick={(_, n) =>
                    navigate(`/admin/organizations/${n.id}`)
                  }
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  proOptions={{ hideAttribution: true }}
                  minZoom={0.2}
                  maxZoom={1.5}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1.5}
                    color="var(--surface-hover)"
                  />
                  <Controls position="bottom-right" showInteractive={false} />
                  <MiniMap
                    position="top-right"
                    nodeColor="#3a3a3a"
                    maskColor="rgba(18,18,18,0.6)"
                    style={{ background: "var(--card)" }}
                  />
                </ReactFlow>
              )}
            </div>

            {/* Légende des statuts */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 14,
              }}
            >
              {Object.entries(STATUS_COLOR).map(([k, c]) => (
                <span
                  key={k}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: c,
                      display: "inline-block",
                    }}
                  />
                  {STATUS_LABEL[k]}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate("/admin/federation")}
              className="mt-4 flex w-full items-center justify-center gap-2 py-3 rounded-full font-semibold text-white text-sm transition-all active:scale-95"
              style={{
                backgroundColor: "transparent",
                color: "var(--accent-primary)",
                border: "1px solid var(--accent-primary)",
              }}
              aria-label="Gérer la fédération"
            >
              <GitBranch style={{ width: 16, height: 16 }} /> Gérer la
              fédération
            </button>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}

export default function FederationTree() {
  return (
    <ReactFlowProvider>
      <FederationTreeInner />
    </ReactFlowProvider>
  );
}
