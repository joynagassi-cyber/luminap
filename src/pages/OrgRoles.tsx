/**
 * OrgRoles — écran d'administration des accès (contrat RBAC §3.6, route
 * `/admin/roles`).
 *
 * Un administrateur d'organisation y :
 *   1. voit les membres de l'org active avec leur rôle (select) ;
 *   2. pour le membre sélectionné, voit les capacités DÉJÀ couvertes par le
 *      rôle (verrouillées) et peut cocher des capacités SUPPLÉMENTAIRES
 *      (grants) — décision D2 : on expose des capacités lisibles, jamais les
 *      28 permissions brutes ;
 *   3. enregistre : `assignMemberRole` (org_memberships, D3) puis
 *      `grantCapability`/`revokeCapability` (grants, D4).
 *
 * L'accès à l'écran est réservé aux administrateurs : le gate réutilise la
 * décision unique (`useCanAccessMulti` → `federation.canAccess`, D5) et le
 * serveur re-vérifie de toute façon via RLS (`is_org_admin`).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import { Shield, UserCog, Save } from "lucide-react";

import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import EmptyState from "@/components/EmptyState";
import { ScreenState } from "@/components/RouteStates";
import { useCurrentUser, useMembers, type PSMember } from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { useCanAccessMulti } from "@/hooks/useCanAccessMulti";
import { ROLE_LABELS, getRolePermissions } from "@/lib/rbac";
import { CAPABILITIES, type Capability } from "@/lib/capabilities";
import {
  assignMemberRole,
  grantCapability,
  revokeCapability,
  listMemberCapabilities,
} from "@/lib/orgAdmin";
import { showError, showSuccess } from "@/utils/toast";
import type { Member, Role } from "@/types";

const ROLES = Object.keys(ROLE_LABELS) as Role[];
const DEFAULT_ROLE: Role = "MEMBRE";

/**
 * `useMembers` renvoie soit des lignes PowerSync (`snake_case`), soit le
 * modèle de repli IndexedDB (`camelCase`). Ces accesseurs absorbent les deux
 * formes sans `any`.
 */
type MemberRow = Member | PSMember;

function memberName(m: MemberRow): string {
  return "first_name" in m
    ? `${m.first_name} ${m.last_name}`.trim()
    : `${m.firstName} ${m.lastName}`.trim();
}
function memberPhone(m: MemberRow): string {
  return "phone" in m ? (m.phone ?? "") : "";
}

interface ExistingGrant {
  grantId: string;
  capabilityId: string;
  effect: "allow" | "deny";
}

/** Une capacité est « couverte » quand TOUTES ses permissions le sont. */
function isCovered(cap: Capability, role: Role): boolean {
  const perms = getRolePermissions(role);
  return cap.permissions.every((p) => perms.includes(p));
}

export default function OrgRoles() {
  const user = useCurrentUser();
  const orgId = getOrganizationId() || user?.org?.id || "";
  const { allowed: isAdmin } = useCanAccessMulti(
    user?.id,
    orgId,
    "admin",
    "roles",
    undefined,
    user?.role as Role | undefined,
  );

  const { data: members } = useMembers();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roleByMember, setRoleByMember] = useState<Record<string, Role>>({});
  const [extraByMember, setExtraByMember] = useState<Record<string, Set<string>>>({});
  const [grantsByMember, setGrantsByMember] = useState<Record<string, ExistingGrant[]>>({});
  const [loadingGrants, setLoadingGrants] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "ACTIVE"),
    [members],
  );

  const selectedMember = activeMembers.find((m) => m.id === selectedId) ?? null;
  const selectedRole = (selectedId && roleByMember[selectedId]) || DEFAULT_ROLE;
  const selectedExtras = (selectedId && extraByMember[selectedId]) || new Set<string>();

  const loadGrants = useCallback(
    async (memberId: string) => {
      setLoadingGrants(true);
      try {
        const rows = await listMemberCapabilities(memberId, orgId);
        setGrantsByMember((prev) => ({ ...prev, [memberId]: rows }));
        setExtraByMember((prev) => ({
          ...prev,
          [memberId]: new Set(rows.filter((r) => r.effect === "allow").map((r) => r.capabilityId)),
        }));
      } catch {
        // Échec de lecture des grants : on repart d'un ensemble vide plutôt
        // que de bloquer l'écran (l'admin pourra re-cocher puis enregistrer).
        setGrantsByMember((prev) => ({ ...prev, [memberId]: [] }));
      } finally {
        setLoadingGrants(false);
      }
    },
    [orgId],
  );

  const selectMember = (memberId: string) => {
    setSelectedId(memberId);
    if (!grantsByMember[memberId]) void loadGrants(memberId);
  };

  // Réinitialise la sélection si le membre disparaît de la liste (archivage).
  useEffect(() => {
    if (selectedId && !activeMembers.some((m) => m.id === selectedId)) {
      setSelectedId(null);
    }
  }, [activeMembers, selectedId]);

  const toggleExtra = (capabilityId: string) => {
    if (!selectedId) return;
    setExtraByMember((prev) => {
      const next = new Set(prev[selectedId] ?? []);
      if (next.has(capabilityId)) next.delete(capabilityId);
      else next.add(capabilityId);
      return { ...prev, [selectedId]: next };
    });
  };

  const handleSave = async () => {
    if (!selectedMember || saving) return;
    setSaving(true);
    const memberId = selectedMember.id;
    try {
      await assignMemberRole(memberId, orgId, selectedRole);

      const existing = grantsByMember[memberId] ?? [];
      const existingByCapability = new Map(existing.map((g) => [g.capabilityId, g.grantId]));
      const desired = extraByMember[memberId] ?? new Set<string>();

      for (const capabilityId of desired) {
        if (!existingByCapability.has(capabilityId)) {
          await grantCapability(memberId, orgId, capabilityId);
        }
      }
      for (const [capabilityId, grantId] of existingByCapability) {
        if (!desired.has(capabilityId)) {
          await revokeCapability(grantId);
        }
      }

      await loadGrants(memberId);
      showSuccess("Accès enregistrés.");
    } catch (err) {
      console.error("[org-roles] échec de l'enregistrement des accès", err);
      showError("Impossible d'enregistrer les accès. Réessayez.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <IonPage>
        <IonContent className="bg-canvas">
          <div className="min-h-dvh">
            <TopHeader title="Rôles et capacités" />
            <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
              <ScreenState state="forbidden">
                <div
                  className="p-6 rounded-xl text-center"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <Shield className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                  <p className="text-text-primary font-semibold mb-1">
                    Accès réservé aux administrateurs
                  </p>
                  <p className="text-text-tertiary text-sm">
                    Seul un administrateur de cette organisation peut assigner
                    des rôles et des capacités.
                  </p>
                </div>
              </ScreenState>
            </div>
            <BottomNav />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div className="min-h-dvh">
          <TopHeader title="Rôles et capacités" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <div className="mb-5">
              <h1 className="text-text-primary font-bold text-xl">
                Rôles et capacités
              </h1>
              <p className="text-text-tertiary text-xs mt-0.5">
                {activeMembers.length} membre
                {activeMembers.length !== 1 ? "s" : ""}
              </p>
            </div>

            {activeMembers.length === 0 ? (
              <ScreenState state="empty">
                <EmptyState
                  title="Aucun membre"
                  description="Aucun membre actif dans cette organisation pour le moment."
                  icon={<UserCog className="w-6 h-6" />}
                />
              </ScreenState>
            ) : (
              <ScreenState state="ready">
                <div className="space-y-2 mb-6">
                  {activeMembers.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-xl p-4 flex items-center gap-3"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-semibold truncate">
                          {memberName(member)}
                        </p>
                        <p className="text-text-tertiary text-xs">
                          {memberPhone(member) || "Pas de téléphone"}
                        </p>
                      </div>
                      <label className="sr-only" htmlFor={`role-${member.id}`}>
                        Rôle de {memberName(member)}
                      </label>
                      <select
                        id={`role-${member.id}`}
                        value={roleByMember[member.id] ?? DEFAULT_ROLE}
                        onChange={(e) =>
                          setRoleByMember((prev) => ({
                            ...prev,
                            [member.id]: e.target.value as Role,
                          }))
                        }
                        className="rounded-lg px-3 py-2 text-sm"
                        style={{
                          backgroundColor: "var(--card)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => selectMember(member.id)}
                        aria-label={`Configurer les capacités de ${memberName(member)}`}
                        aria-pressed={selectedId === member.id}
                        className="p-2 rounded-full active:scale-95 transition-transform"
                        style={{
                          backgroundColor:
                            "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                        }}
                      >
                        <UserCog
                          className="w-4 h-4"
                          style={{ color: "var(--accent-primary)" }}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                {selectedMember && (
                  <section
                    aria-label={`Capacités de ${memberName(selectedMember)}`}
                    className="rounded-xl p-4 mb-4"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <h2 className="text-text-primary font-semibold text-sm mb-3">
                      Capacités — {memberName(selectedMember)}
                    </h2>
                    <p className="text-text-tertiary text-xs mb-3">
                      Les capacités déjà couvertes par le rôle sont verrouillées.
                      Cochez-en d&apos;autres pour les accorder en plus.
                    </p>
                    <ul className="space-y-2">
                      {CAPABILITIES.map((cap) => {
                        const covered = isCovered(cap, selectedRole);
                        const checked = covered || selectedExtras.has(cap.id);
                        return (
                          <li key={cap.id}>
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={covered || loadingGrants}
                                onChange={() => toggleExtra(cap.id)}
                                className="mt-1"
                                aria-label={cap.label}
                              />
                              <span className="min-w-0">
                                <span className="block text-text-primary text-sm font-medium">
                                  {cap.label}
                                  {covered && (
                                    <span className="ml-2 text-text-tertiary text-xs">
                                      (héritée du rôle)
                                    </span>
                                  )}
                                </span>
                                <span className="block text-text-tertiary text-xs">
                                  {cap.description}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving || loadingGrants}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-on-accent text-sm disabled:opacity-60"
                      style={{ backgroundColor: "var(--accent-primary)" }}
                    >
                      <Save className="w-4 h-4" />
                      {saving ? "Enregistrement…" : "Enregistrer"}
                    </button>
                  </section>
                )}
              </ScreenState>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
