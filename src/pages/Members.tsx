/**
 * Members v2 — Liste des membres, redesign premium.
 *
 * Design : fond sombre, en-tête avec stats, liste de membres avec avatars
 * et rôles, actions d'ajout rapide.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 */

import { Fragment, useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/lib/dataLayer";
import { useMembers, addMemberPS, isPowerSyncReadyNow } from "@/lib/dataLayer";
import { getOrganizationId } from "@/lib/orgContext";
import { resource } from "@/capabilities/resource";
import { captureClientError } from "@/lib/clientErrors";
import { MembersSkeleton } from "@/components/PageSkeletons";
import { PlusCircle, Users, Search, Archive, RefreshCw } from "lucide-react";
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
import CapabilityBanner from "@/components/CapabilityBanner";
import { Section, InfoCard, ActionCard, ListItem, StatCard } from "@/design/components/PageShell";

export default function MembersPage() {
  const navigate = useNavigate();
  const user = useCurrentUser();

  const [archivedMembers, setArchivedMembers] = useState<Member[]>([]);
  const [archivedError, setArchivedError] = useState(false);
  const [retryArchived, setRetryArchived] = useState(0);

  useEffect(() => {
    setArchivedError(false);
    resource
      .listArchived<Member>("Member")
      .then(({ items }) => setArchivedMembers(items))
      .catch((e) => {
        captureClientError(e, { message: "Échec du chargement des membres archivés" });
        setArchivedError(true);
      });
  }, [retryArchived]);

  const { data: psMembers, isLoading: membersLoading } = useMembers();
  const members = psMembers ?? [];

  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);

  const filteredMembers = useMemo(() => {
    return members.filter((m: any) =>
      !searchTerm ||
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [members, searchTerm]);

  const visibleMembers = filteredMembers.slice(0, visibleCount);

  const handleAddMember = () => {
    navigate("/member/new", { replace: true });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          {membersLoading ? (
            <div data-screen-state="loading" className="px-5">
              <MembersSkeleton />
            </div>
          ) : (
            <Fragment>
              <h1 className="sr-only">Membres — gestion des membres</h1>
              <TopHeader title="Membres" />
              <div data-screen-state="ready" className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
                <CapabilityBanner orgId={getOrganizationId()} />

                {/* En-tête avec stats et action */}
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-text-primary font-bold text-2xl leading-tight">Membres</h2>
                      <p className="text-text-tertiary text-sm">
                        Gérez vos membres et leurs rôles dans l'organisation.
                      </p>
                    </div>
                    <ActionCard
                      tone="primary"
                      onClick={handleAddMember}
                      aria-label="Ajouter un membre"
                    >
                      <PlusCircle className="w-5 h-5" />
                      <span>Ajouter</span>
                    </ActionCard>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <StatCard
                      value={members.length.toString()}
                      label="Membres actifs"
                      icon={<Users className="w-5 h-5" />}
                      tone="primary"
                    />
                    <StatCard
                      value={archivedMembers.length.toString()}
                      label="Archivés"
                      icon={<Archive className="w-5 h-5" />}
                      tone="expense"
                    />
                    <StatCard
                      value={
                        members.filter(
                          (m: any) => m.role === "ADMIN" || m.role === "LEADER",
                        ).length.toString()
                      }
                      label="Responsables"
                      icon={<PlusCircle className="w-5 h-5" />}
                      tone="advance"
                    />
                  </div>
                </div>

                {/* Recherche */}
                <InfoCard className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <IonInput
                      type="text"
                      aria-label="Rechercher un membre"
                      placeholder="Rechercher un membre…"
                      value={searchTerm}
                      onIonInput={(e) =>
                        setSearchTerm(e.detail.value ?? "")
                      }
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-text-primary text-sm bg-transparent"
                    />
                  </div>
                </InfoCard>

                {/* Liste des membres */}
                {filteredMembers.length === 0 ? (
                  <EmptyState
                    title="Aucun membre"
                    description="Ajoutez votre premier membre pour commencer à gérer votre organisation."
                    icon={<Users className="w-6 h-6" />}
                    action={handleAddMember}
                    actionLabel="Ajouter un membre"
                  />
                ) : (
                  <Section title="Liste des membres">
                    {visibleMembers.map((member: any) => (
                      <ListItem
                        key={member.id}
                        icon={
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{
                              backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                            }}
                          >
                            <img
                              src={member.photo_url || ""}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            {!member.photo_url && (
                              <Users className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                            )}
                          </div>
                        }
                        title={member.name || "Membre sans nom"}
                        subtitle={member.role || "Membre"}
                        onClick={() => navigate(`/member/${member.id}`)}
                      />
                    ))}
                    {visibleMembers.length < filteredMembers.length && (
                      <button
                        onClick={() => setVisibleCount((c) => c + 20)}
                        className="w-full py-3 rounded-xl text-sm font-medium text-center transition-all hover:bg-surface-hover"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--accent-primary)",
                        }}
                      >
                        Charger plus <span className="ml-2">›</span>
                      </button>
                    )}
                  </Section>
                )}
              </div>
            </Fragment>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
