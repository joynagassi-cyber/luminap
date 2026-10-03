import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/dataLayer";
import { useMembers, addMemberPS } from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { resource } from "@/capabilities/resource";
import { lifecycle } from "@/capabilities/lifecycle";
import { workflow } from "@/capabilities/workflow";
import { MembersSkeleton } from "@/components/PageSkeletons";
import {
  PlusCircle,
  Users,
  Search,
  Archive,
  RefreshCw,
  UserPlus,
  UserMinus,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import CircleAction from "@/components/CircleAction";
import type { Member } from "@/types";
import {
  IonPage,
  IonContent,
  IonInfiniteScroll,
  IonInput,
} from "@ionic/react";
import EmptyState from "@/components/EmptyState";

export default function MembersPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();

  const [archivedMembers, setArchivedMembers] = useState<Member[]>([]);
  const [archivedError, setArchivedError] = useState(false);
  const [retryArchived, setRetryArchived] = useState(0);

  // Load archived members via Resource capability
  useEffect(() => {
    setArchivedError(false);
    resource
      .listArchived<Member>("Member")
      .then(({ items }) => setArchivedMembers(items))
      .catch(() => setArchivedError(true));
  }, [retryArchived]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  const {
    data: members,
    isLoading: membersLoading,
    error: membersError,
    retry: retryMembers,
  } = useMembers();

  const filteredMembers = useMemo(() => {
    return members.filter((m: any) => {
      const q = searchQuery.toLowerCase();
      const firstName = m.first_name || m.firstName || "";
      const lastName = m.last_name || m.lastName || "";
      const memberEmail = m.email || "";
      return (
        !q ||
        firstName.toLowerCase().includes(q) ||
        lastName.toLowerCase().includes(q) ||
        memberEmail.toLowerCase().includes(q)
      );
    });
  }, [members, searchQuery]);

  const activeMembers = filteredMembers.filter(
    (m: any) => m.status === "ACTIVE",
  );

  // Un nouveau membre créé revient en tête de liste : on repart du premier écran.
  useEffect(() => {
    setVisibleCount(50);
  }, [searchQuery]);

  const loadNext = () => {
    if (visibleCount < activeMembers.length) {
      setVisibleCount((c) => c + 50);
    }
  };

  const visibleMembers = activeMembers.slice(0, visibleCount);

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    if (saving) return;
    setSaving(true);
    try {
      await addMemberPS({
        org_id: getOrganizationId(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        status: "ACTIVE",
        joined_at: new Date().toISOString(),
        archived_at: null,
        archived_by: null,
        archive_reason: null,
      });
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setShowForm(false);
    } catch {
      // Échec silencieux : le rechargement de la liste PS refait émerger
      // l'état ; on laisse le formulaire ouvert pour réessayer.
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (member: any) => {
    const check = workflow.check("member", member.status, "INACTIVE");
    if (!check.allowed) {
      return;
    }
    await lifecycle.archive(
      "Member",
      member.id,
      "Archivé via la gestion des membres",
      user.id,
    );
    // Refresh archived list
    const { items } = await resource.listArchived<Member>("Member");
    setArchivedMembers(items);
  };

  const handleRestore = async (member: any) => {
    const check = workflow.check("member", member.status, "ACTIVE");
    if (!check.allowed) {
      return;
    }
    await lifecycle.restore("Member", member.id, "Rétabli", user.id);
    // Refresh archived list
    const { items } = await resource.listArchived<Member>("Member");
    setArchivedMembers(items);
  };

  if (membersLoading) {
    return <MembersSkeleton />;
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="min-h-dvh">
          <TopHeader title="Membres" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-text-primary font-bold text-xl">Membres</h1>
                <p className="text-text-tertiary text-xs mt-0.5">
                  {activeMembers.length} actif
                  {activeMembers.length !== 1 ? "s" : ""}
                </p>
              </div>
              <CircleAction
                aria-label="Ajouter un membre"
                onClick={() => setShowForm(!showForm)}
              >
                <PlusCircle className="w-6 h-6" />
              </CircleAction>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              {/* M4 */}
              <IonInput
                aria-label="Rechercher un membre"
                placeholder="Rechercher un membre..."
                value={searchQuery}
                onIonChange={(e) => setSearchQuery((e.detail.value as string) ?? "")}
              />
            </div>

            {/* Create form */}
            {showForm && (
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid color-mix(in srgb, var(--accent-primary) 19%, transparent)",
                }}
              >
                <h3 className="text-text-primary font-semibold text-sm mb-3">
                  Nouveau membre
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* M4 */}
                    <IonInput
                      aria-label="Prénom"
                      autoComplete="given-name"
                      placeholder="Prénom"
                      value={firstName}
                      onIonChange={(e) => setFirstName((e.detail.value as string) ?? "")}
                    />
                    <IonInput
                      aria-label="Nom"
                      autoComplete="family-name"
                      placeholder="Nom"
                      value={lastName}
                      onIonChange={(e) => setLastName((e.detail.value as string) ?? "")}
                    />
                  </div>
                  <IonInput
                    type="tel"
                    aria-label="Téléphone"
                    autoComplete="tel"
                    placeholder="Téléphone"
                    value={phone}
                    onIonChange={(e) => setPhone((e.detail.value as string) ?? "")}
                  />
                  <IonInput
                    type="email"
                    aria-label="Email"
                    autoComplete="email"
                    placeholder="Email (optionnel)"
                    value={email}
                    onIonChange={(e) => setEmail((e.detail.value as string) ?? "")}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={saving || !firstName.trim() || !lastName.trim()}
                      className="flex-1 py-3 rounded-full font-semibold text-on-accent text-sm"
                      style={{ backgroundColor: "var(--accent-primary)" }}
                    >
                      {saving ? "Ajout..." : "Ajouter"}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      className="px-4 py-3 rounded-full font-medium text-sm"
                      style={{ backgroundColor: "var(--surface-hover)" }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Members list */}
            <div className="space-y-2">
              {activeMembers.length === 0 ? (
                <EmptyState
                  title="Aucun membre"
                  description="Ajoutez votre premier membre"
                  icon={<Users className="w-6 h-6" />}
                  actionLabel="Ajouter"
                  onAction={() => setShowForm(true)}
                />
              ) : (
                <>
                  {visibleMembers.map((member: any) => (
                  <div
                    key={member.id}
                    className="rounded-xl p-4 flex items-center gap-3"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        {(member.first_name || member.firstName)?.charAt(0)}
                        {(member.last_name || member.lastName)?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-semibold truncate">
                        {member.first_name || member.firstName}{" "}
                        {member.last_name || member.lastName}
                      </p>
                      <p className="text-text-tertiary text-xs">
                        {member.phone || "Pas de téléphone"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleArchive(member)}
                      className="p-2 rounded-full active:scale-95 transition-transform"
                      style={{ backgroundColor: "color-mix(in srgb, var(--data-expense) 12%, transparent)" }}
                    >
                      <Archive
                        className="w-4 h-4"
                        style={{ color: "var(--data-expense)" }}
                      />
                    </button>
                  </div>
                  ))}
                  {activeMembers.length > visibleCount && !membersError && (
                    <IonInfiniteScroll
                      position="bottom"
                      threshold="150px"
                      onIonInfinite={loadNext}
                    >
                      <div className="py-3">
                        <p className="text-text-tertiary text-xs">
                          Chargement…
                        </p>
                      </div>
                    </IonInfiniteScroll>
                  )}
                </>
              )}
              {activeMembers.length > 0 && activeMembers.length <= visibleCount && !membersError && (
                <p className="text-text-tertiary text-xs text-center py-3">
                  Fin de la liste — {activeMembers.length} membre
                  {activeMembers.length !== 1 ? "s" : ""} affiché
                  {activeMembers.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Error retry on the main list */}
            {membersError && (
              <div
                className="mb-4 rounded-xl p-4 text-center"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <p className="text-text-tertiary text-sm mb-2">
                  Impossible de charger les membres.
                </p>
                <button
                  onClick={retryMembers}
                  aria-label="Réessayer le chargement des membres"
                  className="px-4 py-2 rounded-full text-sm font-semibold text-on-accent transition-all active:scale-95"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Archived members */}
            {archivedError && (
              <div
                className="text-center py-6 rounded-xl"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <p className="text-text-tertiary text-sm">
                  Impossible de charger les membres archivés.
                </p>
                <button
                  onClick={() => setRetryArchived((n) => n + 1)}
                  className="mt-2 px-4 py-2 rounded-full text-sm font-semibold text-on-accent transition-all active:scale-95"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                  aria-label="Réessayer le chargement des membres archivés"
                >
                  Réessayer
                </button>
              </div>
            )}
            {archivedMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Archive className="w-4 h-4 text-text-tertiary" />
                  <p className="text-text-tertiary text-xs font-medium uppercase tracking-wider">
                    Archivés ({archivedMembers.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {archivedMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="rounded-xl p-4 flex items-center gap-3 opacity-60"
                      style={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "var(--surface-hover)" }}
                      >
                        <span className="text-sm font-bold text-text-tertiary">
                          {(member.first_name || member.firstName)?.charAt(0)}
                          {(member.last_name || member.lastName)?.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-secondary text-sm font-medium truncate">
                          {member.first_name || member.firstName}{" "}
                          {member.last_name || member.lastName}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestore(member)}
                        className="p-2 rounded-full active:scale-95 transition-transform"
                        style={{ backgroundColor: "color-mix(in srgb, var(--data-income) 12%, transparent)" }}
                      >
                        <RefreshCw
                          className="w-4 h-4"
                          style={{ color: "var(--data-income)" }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
