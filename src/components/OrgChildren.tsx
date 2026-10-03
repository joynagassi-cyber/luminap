/**
 * OrgChildren — liste des annexes directes d'une organisation + création
 * récursive d'annexe (Phase 2 Feature 2 — rapports inter-organisations).
 *
 * Comportement :
 *  - Charge les enfants directs via `federation.getOrgChildren(parentOrgId)`
 *    (SQLite PowerSync — 100 % offline-first).
 *  - Chaque carte affiche le nom, le type (FEDERATION_TYPE_LABEL) et le
 *    statut (FEDERATION_STATUS_COLOR / _LABEL — uniques partagées M22).
 *  - Bouton « Créer une annexe » ouvrant un bottom-sheet DOM (pattern
 *    Federation.tsx L346-442 : fixed + scrim + rounded-t-2xl) :
 *    IonInput nom + IonSelect type + IonSelect statut.
 *      PENDING  → `federation.createOrg(crypto.randomUUID(), ...)` local
 *                  (PowerSync outbox, idempotent).
 *      ACTIVE   → `bootstrapOrganization` (edge `create_org`, service_role) :
 *                  l'organisation est ACTIVE et le créateur son admin.
 *
 * Réutilisable : section « Mes annexes » de `CentralAdmin.tsx` (T2.2) et
 * bouton contextuel « Ajouter sous cette org » de `Federation.tsx` (T2.2).
 */

import { useEffect, useState } from "react";
import {
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonChangeCustomEvent,
} from "@ionic/react";
import { X, Building2, Plus, FolderPlus } from "lucide-react";
import {
  federation,
  FEDERATION_STATUS_COLOR,
  FEDERATION_STATUS_LABEL,
  FEDERATION_TYPE_LABEL,
  type FederationOrg,
} from "@/capabilities/federation";
import { useCurrentUser } from "@/lib/dataLayer";
import { bootstrapOrganization } from "@/lib/orgBootstrap";

/** Types acceptés par la colonne `type` de `organizations`
 *  (migration 20260910000001 : CHECK IN ('CENTRAL','CHURCH','SCHOOL','ENTERPRISE')). */
const ORG_TYPES = ["CENTRAL", "CHURCH", "SCHOOL", "ENTERPRISE"] as const;

/** Statuts sélectionnables à la création d'une annexe. */
const ORG_STATUSES = ["PENDING", "ACTIVE"] as const;

/**
 * Formule M22 : couleur de statut + 20 % de transparence pour le fond de
 * badge (identique au pattern de Federation.tsx L95-97).
 */
function statusColor(status: string): string {
  return FEDERATION_STATUS_COLOR[status] ?? "var(--text-tertiary)";
}

function statusLabel(status: string): string {
  return FEDERATION_STATUS_LABEL[status] ?? status;
}

function typeLabel(type: string): string {
  return FEDERATION_TYPE_LABEL[type] ?? type;
}

export default function OrgChildren({
  parentOrgId,
  onCreated,
}: {
  /** Id de l'organisation dont on liste les annexes directes. */
  parentOrgId: string;
  /** Callback optionnel appelé après création d'une annexe (rafraîchir la vue parente). */
  onCreated?: (createdOrgId: string) => void;
}) {
  const user = useCurrentUser();
  const [children, setChildren] = useState<FederationOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bottom-sheet « Créer une annexe » (DOM — pattern Federation.tsx)
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>("CHURCH");
  const [newStatus, setNewStatus] = useState<string>("PENDING");
  const [creating, setCreating] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);

  const loadChildren = async () => {
    if (!parentOrgId) return;
    setLoading(true);
    setError(null);
    try {
      const ch = await federation.getOrgChildren(parentOrgId);
      setChildren(ch);
    } catch (e: any) {
      setError(e?.message ?? "Erreur de chargement des annexes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentOrgId]);

  /**
   * PENDING : création registry locale (PowerSync outbox) — le statut PENDING
   * est écrit par `federation.createOrg`. L'activation vers ACTIVE passe par
   * le bouton « Opérationnelle » (edge `create_org`) ou par l'admin parent.
   */
  const handleCreate = async () => {
    if (!user?.id || !newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      // Id crypto (pas de Date.now — collision multi-appareils hors-ligne)
      const newId = crypto.randomUUID();
      await federation.createOrg(
        newId,
        newName.trim(),
        { parentOrgId, type: newType },
        user.id,
      );
      setNewName("");
      setNewType("CHURCH");
      setNewStatus("PENDING");
      setShowCreate(false);
      setCreatedMsg(`« ${newName.trim()} » créée sous cette organisation.`);
      onCreated?.(newId);
      await loadChildren();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la création de l'annexe");
    } finally {
      setCreating(false);
    }
  };

  /**
   * ACTIVE : création « opérationnelle » via la fonction serveur
   * (`create_org`, service_role) : organisation ACTIVE + le créateur en
   * devient l'admin. Le client seul ne peut pas faire cela (RLS).
   */
  const handleBootstrapCreate = async () => {
    if (!newName.trim()) return;
    setBootstrapping(true);
    setError(null);
    try {
      const res = await bootstrapOrganization({
        name: newName.trim(),
        type: newType,
        parentOrgId,
      });
      setNewName("");
      setNewType("CHURCH");
      setNewStatus("PENDING");
      setShowCreate(false);
      setCreatedMsg(
        `« ${res.name} » créée (opérationnelle). Vous êtes son admin.`,
      );
      onCreated?.(res.orgId);
      await loadChildren();
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la création opérationnelle");
    } finally {
      setBootstrapping(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* En-tête + compteur */}
      <div className="flex items-center gap-2">
        <FolderPlus className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
        <span className="text-text-primary font-semibold text-sm">
          Mes annexes
        </span>
        {!loading && children.length > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: "var(--surface-hover)",
              color: "var(--text-secondary)",
            }}
          >
            {children.length}
          </span>
        )}
      </div>

      {/* Liste des annexes directes */}
      {loading ? (
        <p className="text-text-tertiary text-sm py-3 text-center">Chargement...</p>
      ) : children.length === 0 ? (
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Building2 className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-text-tertiary text-sm">Aucune annexe pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {children.map((child) => (
            <div
              key={child.id}
              className="rounded-xl p-3"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                  }}
                >
                  <Building2 className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary font-semibold text-sm truncate">
                      {child.name}
                    </p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{
                        backgroundColor: `${statusColor(child.status)}20`,
                        color: statusColor(child.status),
                      }}
                    >
                      {statusLabel(child.status)}
                    </span>
                  </div>
                  <p className="text-text-tertiary text-xs truncate">
                    {typeLabel(child.type)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton « Créer une annexe » (natif — les enfants d'IonButton ne
          sont pas rendus fiablement sous React 19) */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="w-full flex items-center justify-center gap-1.5 py-3 rounded-full font-semibold text-on-accent text-sm transition-all active:scale-95"
        style={{ backgroundColor: "var(--accent-primary)" }}
        aria-label="Créer une annexe"
      >
        <Plus className="w-4 h-4" /> Créer une annexe
      </button>

      {/* Confirmation de création */}
      {createdMsg && (
        <div
          className="rounded-xl p-3 text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--data-income) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--data-income) 25%, transparent)",
            color: "var(--data-income)",
          }}
        >
          {createdMsg}
        </div>
      )}

      {/* Bottom-sheet « Créer une annexe » — DOM (pattern Federation.tsx L346-442) */}
      {showCreate && (
        <div
          className="fixed inset-0 z-overlay flex items-end justify-center"
          onClick={() => setShowCreate(false)}
        >
          <div className="absolute inset-0 bg-scrim" />
          <div
            className="relative w-full max-w-lg rounded-t-2xl p-5 pb-safe"
            style={{ backgroundColor: "var(--card)" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Créer une annexe"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-text-primary font-bold text-lg">Créer une annexe</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "var(--surface-hover)" }}
                aria-label="Fermer"
              >
                <X className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <IonItem lines="none" className="bg-surface rounded-xl">
                <IonLabel position="floating" className="text-sm text-text-secondary">
                  Nom de l'annexe
                </IonLabel>
                <IonInput
                  type="text"
                  value={newName}
                  onIonChange={(e: IonChangeCustomEvent<string>) =>
                    setNewName(e.detail.value ?? "")
                  }
                  placeholder="Ex: Paroisse Sainte-Marie"
                  slot="input"
                />
              </IonItem>

              <IonItem lines="none" className="bg-surface rounded-xl">
                <IonLabel position="floating" className="text-sm text-text-secondary">
                  Type d'organisation
                </IonLabel>
                <IonSelect
                  value={newType}
                  onIonChange={(e: IonChangeCustomEvent<string>) => setNewType(e.detail.value)}
                  interface="popover"
                  slot="input"
                >
                  {ORG_TYPES.map((t) => (
                    <IonSelectOption key={t} value={t}>
                      {typeLabel(t)}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonItem lines="none" className="bg-surface rounded-xl">
                <IonLabel position="floating" className="text-sm text-text-secondary">
                  Statut
                </IonLabel>
                <IonSelect
                  value={newStatus}
                  onIonChange={(e: IonChangeCustomEvent<string>) =>
                    setNewStatus(e.detail.value)
                  }
                  interface="popover"
                  slot="input"
                >
                  {ORG_STATUSES.map((s) => (
                    <IonSelectOption key={s} value={s}>
                      {statusLabel(s)}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-on-accent transition-all active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: "var(--accent-primary)" }}
              >
                {creating ? "Création..." : "Créer"}
              </button>
              <button
                type="button"
                onClick={handleBootstrapCreate}
                disabled={bootstrapping || !newName.trim()}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                style={{
                  color: "var(--accent-primary)",
                  border: "1px solid var(--accent-primary)",
                  background: "transparent",
                }}
              >
                {bootstrapping ? "Création opérationnelle..." : "Opérationnelle (admin + ACTIVE)"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="w-full mt-2 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
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

      {/* Erreur */}
      {error && (
        <div
          className="rounded-xl p-3 text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--data-expense) 25%, transparent)",
            color: "var(--data-expense)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
