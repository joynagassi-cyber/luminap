/**
 * Organisation Units — gestion des unités internes d'une organisation.
 *
 * Une unité interne (groupe, service, branche, département) vit dans la
 * table `org_units` et appartient à une organisation (`org_id`). La page est
 * scopable à une organisation précise via le query param `?org=<id>` (règle
 * Lumina : les données inter-pages passent par l'URL, jamais par
 * location.state) ; sans param, elle cible l'organisation courante.
 *
 * Lectures via `federation.getOrgUnits(orgId)` ; écritures via la
 * capability `organization` (`addOrgUnit` / `removeOrgUnit`), qui respectent
 * la RLS `is_org_member` (un utilisateur ne gère que les unités de ses orgs).
 *
 * Route: /admin/units (?org=<id>)
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IonPage, IonContent } from "@ionic/react";
import {
  Boxes,
  Plus,
  Trash2,
  Layers,
  ArrowLeft,
} from "lucide-react";
import TopHeader from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";
import { ShimmerList } from "@/components/Shimmer";
import {
  federation,
  type OrgUnit as FederationOrgUnit,
} from "@/capabilities/federation";
import { organization } from "@/capabilities/organization";
import { getOrganizationId } from "@/lib/orgContext";

const UNIT_TYPES = ["groupe", "service", "départment", "branche"];

export default function OrgUnits() {
  const navigate = useNavigate();
  const location = useLocation();
  const orgId =
    new URLSearchParams(location.search).get("org") || getOrganizationId();

  const [units, setUnits] = useState<FederationOrgUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulaire de création
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("groupe");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await federation.getOrgUnits(orgId);
      setUnits(list);
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await organization.addOrgUnit({
        id: `unit-${Date.now()}`,
        name: name.trim(),
        type,
        orgId,
        description: description.trim(),
        parentId: null,
        isActive: true,
      });
      setName("");
      setType("groupe");
      setDescription("");
      setShowCreate(false);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (unitId: string) => {
    setError(null);
    try {
      await organization.removeOrgUnit(orgId, unitId);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la suppression");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    fontSize: 14,
    backgroundColor: "#181818",
    color: "#fff",
    border: "1px solid #282828",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#808080",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
  };

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div style={{ minHeight: "100dvh" }}>
          <TopHeader title="Unités internes" />
          <div
            style={{
              padding: "88px 16px 120px",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <ArrowLeft
                style={{
                  width: 18,
                  height: 18,
                  color: "#808080",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/admin/federation")}
                aria-label="Retour à la fédération"
              />
              <Layers
                style={{
                  width: 18,
                  height: 18,
                  color: "var(--accent-primary)",
                }}
              />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>
                Unités internes
              </span>
              {!loading && (
                <span
                  style={{
                    marginLeft: "auto",
                    color: "#808080",
                    fontSize: 12,
                  }}
                >
                  {units.length}
                </span>
              )}
            </div>

            <p style={{ color: "#808080", fontSize: 12, marginBottom: 16 }}>
              Organisation : <code style={{ color: "#B3B3B3" }}>{orgId}</code>
            </p>

            {/* Bouton création (natif) */}
            <button
              type="button"
              onClick={() => setShowCreate(!showCreate)}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-full font-semibold text-white text-sm transition-all active:scale-95 mb-4"
              style={{ backgroundColor: "var(--accent-primary)" }}
              aria-label="Créer une unité interne"
            >
              <Plus style={{ width: 16, height: 16 }} /> Ajouter une unité
            </button>

            {showCreate && (
              <div
                className="rounded-xl p-4 mb-4 space-y-4"
                style={{
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
                }}
              >
                <div>
                  <label style={labelStyle} htmlFor="unit-name">
                    Nom
                  </label>
                  <input
                    id="unit-name"
                    data-testid="unit-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Diocèse, Chorale, Jeunesse…"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="unit-type">
                    Type
                  </label>
                  <select
                    id="unit-type"
                    data-testid="unit-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={inputStyle}
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="unit-desc">
                    Description (optionnel)
                  </label>
                  <input
                    id="unit-desc"
                    data-testid="unit-desc"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Rôle, périmètre…"
                    style={inputStyle}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !name.trim()}
                  className="w-full py-3 rounded-full font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                  aria-label="Créer l'unité"
                >
                  {creating ? "Création…" : "Créer l'unité"}
                </button>
              </div>
            )}

            {/* Liste */}
            {loading ? (
              <ShimmerList count={4} minHeight={56} />
            ) : units.length === 0 ? (
              <div
                className="rounded-xl p-6 text-center space-y-2"
                style={{
                  backgroundColor: "#212121",
                  border: "1px solid #282828",
                }}
              >
                <Boxes
                  style={{
                    width: 24,
                    height: 24,
                    color: "#808080",
                    margin: "0 auto",
                  }}
                />
                <p style={{ color: "#B3B3B3", fontSize: 14 }}>
                  Aucune unité interne pour cette organisation.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {units.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      backgroundColor: "#1f1f1f",
                      border: "1px solid #282828",
                    }}
                  >
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background:
                          "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                      }}
                    >
                      <Boxes
                        style={{
                          width: 18,
                          height: 18,
                          color: "var(--accent-primary)",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 14,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {u.name}
                      </p>
                      <p style={{ color: "#808080", fontSize: 11 }}>{u.type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(u.id)}
                      aria-label={`Supprimer ${u.name}`}
                      className="flex-shrink-0 transition-all active:scale-95"
                      style={{
                        color: "#E51332",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Trash2 style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                ))}
              </div>
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
