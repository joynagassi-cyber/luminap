/**
 * Archives v2 — Archives et documents, redesign premium.
 *
 * Design : fond sombre, onglets de filtre, upload de document intégré,
 * liste des entités archivées avec bouton de restauration.
 * Tous les tokens CSS `var(--*)`, zéro couleur en dur.
 *
 * Logique métier inchangée : upload, download, toggle archive, restore,
 * recherche, filtre par type.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { resource } from "@/capabilities/resource";
import { lifecycle } from "@/capabilities/lifecycle";
import type { Group, Member, Event } from "@/types";
import {
  useDocuments,
  addDocumentPS,
  updateDocumentPS,
  isPowerSyncReadyNow,
  type PSDocument,
} from "@/lib/dataLayer";
import { uploadLuminaFile, getDocumentUrl } from "@/lib/storageService";
import {
  Users,
  Search,
  Archive,
  RefreshCw,
  ArrowLeft,
  FileText,
  Upload,
  Download,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { ArchivesSkeleton } from "@/components/PageSkeletons";
import {
  IonPage,
  IonContent,
  IonInput,
} from "@ionic/react";
import EmptyState from "@/components/EmptyState";
import {
  Section,
  InfoCard,
  ListItem,
  ActionCard,
} from "@/design/components/PageShell";

export default function Archives() {
  const navigate = useNavigate();

  const [archivedGroups, setArchivedGroups] = useState<Group[]>([]);
  const [archivedMembers, setArchivedMembers] = useState<Member[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const { data: allDocuments, isLoading: documentsLoading } = useDocuments();
  const documents = (allDocuments ?? []).filter(
    (d) => d.bucket === "archives",
  );
  const documentsPending = documentsLoading || !isPowerSyncReadyNow();
  const [docTitle, setDocTitle] = useState("");
  const [docPurpose, setDocPurpose] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState("");

  const handleDocumentUpload = async () => {
    if (!docFile || !docTitle.trim()) {
      setDocError("Nom du document et fichier requis.");
      return;
    }
    setDocUploading(true);
    setDocError("");
    try {
      const path = await uploadLuminaFile("archives", docFile);
      await addDocumentPS({
        title: docTitle.trim(),
        purpose: docPurpose.trim() || null,
        bucket: "archives",
        file_path: path,
        file_size: docFile.size,
        mime_type: docFile.type || null,
        entity_type: "ARCHIVE_DOC",
        status: "ACTIVE",
      });
      setDocTitle("");
      setDocPurpose("");
      setDocFile(null);
    } catch (e) {
      setDocError(
        "Envoi impossible (hors ligne ou accès refusé). Le document n'a pas été archivé.",
      );
    } finally {
      setDocUploading(false);
    }
  };

  const handleDownloadDocument = async (doc: PSDocument) => {
    try {
      const url = await getDocumentUrl("archives", doc.file_path);
      window.open(url, "_blank");
    } catch {
      setDocError("Téléchargement impossible (hors ligne ?).");
    }
  };

  const handleToggleArchiveDocument = async (doc: PSDocument) => {
    await updateDocumentPS(doc.id, {
      status: doc.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED",
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [groups, members, events] = await Promise.all([
          resource.listArchived<Group>("Group"),
          resource.listArchived<Member>("Member"),
          resource.listArchived<Event>("Event"),
        ]);
        if (!cancelled) {
          setArchivedGroups(groups.items);
          setArchivedMembers(members.items);
          setArchivedEvents(events.items);
        }
      } catch (e) {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "group" | "member" | "event" | "document"
  >("all");

  const allArchived = [
    ...archivedGroups.map((g: any) => ({
      type: "group" as const,
      id: g.id,
      name: g.name,
      reason: g.archive_reason || g.archiveReason,
      archivedAt: g.archived_at || g.archivedAt,
      archivedBy: g.archived_by || g.archivedBy,
    })),
    ...archivedMembers.map((m: any) => ({
      type: "member" as const,
      id: m.id,
      name: `${m.first_name || m.firstName} ${m.last_name || m.lastName}`,
      reason: m.archive_reason || m.archiveReason,
      archivedAt: m.archived_at || m.archivedAt,
      archivedBy: m.archived_by || m.archivedBy,
    })),
    ...archivedEvents.map((e: any) => ({
      type: "event" as const,
      id: e.id,
      name: e.name,
      reason: "Événement annulé",
      archivedAt: e.updated_at || e.updatedAt,
      archivedBy: null,
    })),
  ];

  const filtered = allArchived.filter((item: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || item.name.toLowerCase().includes(q);
    const matchesType = filterType === "all" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleRestore = async (
    type: "group" | "member" | "event",
    id: string,
  ) => {
    const entityType =
      type === "event" ? "Event" : type.charAt(0).toUpperCase() + type.slice(1);
    await lifecycle.restore(entityType as any, id, "", "local-user");
    navigate(-1);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className="min-h-dvh">
          {loading ? (
            <div className="flex items-center justify-center py-20 px-6">
              <ArchivesSkeleton />
            </div>
          ) : (
            <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
              <TopHeader title="Archives" onBack={() => navigate(-1)} />

              <h1 className="text-text-primary font-bold text-2xl mb-6">
                Archives
              </h1>

              {/* Recherche */}
              <InfoCard className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <IonInput
                    value={searchQuery}
                    onIonInput={(e) => setSearchQuery((e.detail.value as string) ?? "")}
                    placeholder="Rechercher dans les archives…"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-text-primary text-sm bg-transparent"
                  />
                </div>

                {/* Filtres */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide mt-4">
                  {[
                    { id: "all" as const, label: "Tout" },
                    { id: "group" as const, label: "Groupes" },
                    { id: "member" as const, label: "Membres" },
                    { id: "event" as const, label: "Événements" },
                    { id: "document" as const, label: "Documents" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setFilterType(id)}
                      className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor:
                          filterType === id ? "var(--accent-primary)" : "var(--surface)",
                        color: filterType === id ? "var(--on-accent)" : "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                      aria-pressed={filterType === id}
                      aria-label={`Filtrer par ${label}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </InfoCard>

              {/* Documents : upload + liste */}
              {(filterType === "all" || filterType === "document") && (
                <Section title="Documents">
                  {/* Formulaire d'upload */}
                  <div
                    className="rounded-xl p-5 mb-4 space-y-4"
                    style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <div className="relative">
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                        Nom du document *
                      </label>
                      <input
                        value={docTitle}
                        onChange={(e) => setDocTitle((e.target as HTMLInputElement).value)}
                        placeholder="Nom du document"
                        aria-label="Nom du document"
                        className="w-full pl-4 pr-4 py-3 rounded-xl text-text-primary text-sm"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                        Objet
                      </label>
                      <input
                        value={docPurpose}
                        onChange={(e) => setDocPurpose((e.target as HTMLInputElement).value)}
                        placeholder="Objet / à quoi il s'applique (ex: PV assemblée, reçu…)"
                        aria-label="Objet du document"
                        className="w-full pl-4 pr-4 py-3 rounded-xl text-text-primary text-sm"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                        }}
                      />
                    </div>
                    <div className="relative">
                      <label className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm cursor-pointer"
                        style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" }}
                      >
                        <FileText className="w-4 h-4" />
                        {docFile ? docFile.name : "Choisir le fichier (PDF, image…) *"}
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            setDocFile(e.target.files?.[0] ?? null);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {docError && (
                        <p className="text-xs mt-1" style={{ color: "var(--out)" }}>
                          {docError}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleDocumentUpload}
                      disabled={docUploading || !docFile || !docTitle.trim()}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, var(--accent-primary), var(--accent-dark))",
                        color: "var(--on-accent)",
                      }}
                    >
                      {docUploading ? "Archivage…" : "Archiver le document"}
                    </button>
                  </div>

                  {/* Liste des documents */}
                  <div className="space-y-3">
                    {documents.length === 0 ? (
                      documentsPending ? (
                        <div
                          className="rounded-xl p-5 text-center"
                          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                        >
                          <p className="text-text-tertiary text-sm">
                            Chargement des documents…
                          </p>
                        </div>
                      ) : (
                        <EmptyState
                          title="Aucun document archivé"
                          description="Les documents archivés apparaîtront ici"
                          icon={<FileText className="w-6 h-6" />}
                        />
                      )
                    ) : (
                      documents.map((doc) => (
                        <ListItem
                          key={doc.id}
                          icon={
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: "var(--surface-hover)" }}
                            >
                              <FileText className="w-5 h-5 text-text-tertiary" />
                            </div>
                          }
                          title={doc.title}
                          subtitle={doc.purpose || ""}
                          onClick={() => handleDownloadDocument(doc)}
                        />
                      ))
                    )
                  }
                  </div>
                </Section>
              )}

              {/* Archived items (entités) */}
              {filterType !== "document" && (
                <Section title="Entités archivées">
                  <div className="space-y-2">
                    {loadError ? (
                      <div
                        className="text-center py-10 rounded-xl"
                        style={{ backgroundColor: "var(--surface)" }}
                      >
                        <Archive className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
                        <p className="text-text-tertiary text-sm">
                          Impossible de charger les entités archivées.
                        </p>
                        <p className="text-text-tertiary text-xs mt-1">
                          Vérifiez votre connexion, puis réessayez.
                        </p>
                        <button
                          onClick={() => setRetryCount((n) => n + 1)}
                          className="mt-3 px-4 py-2 rounded-full text-xs font-semibold text-on-accent transition-all active:scale-95"
                          style={{ backgroundColor: "var(--accent-primary)" }}
                          aria-label="Réessayer le chargement des entités archivées"
                        >
                          Réessayer
                        </button>
                      </div>
                    ) : filtered.length === 0 ? (
                      <EmptyState
                        title="Aucun élément archivé"
                        description="Les éléments archivés apparaîtront ici"
                        icon={<Archive className="w-6 h-6" />}
                      />
                    ) : (
                      filtered.map((item: any) => (
                        <ListItem
                          key={item.id}
                          icon={
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: "var(--surface-hover)" }}
                            >
                              {item.type === "group" && (
                                <Users className="w-5 h-5 text-text-tertiary" />
                              )}
                              {item.type === "member" && (
                                <Users className="w-5 h-5 text-text-tertiary" />
                              )}
                              {item.type === "event" && (
                                <Archive className="w-5 h-5 text-text-tertiary" />
                              )}
                            </div>
                          }
                          title={item.name}
                          subtitle={item.reason}
                          onClick={() => handleRestore(item.type as any, item.id)}
                        />
                      ))
                    )}
                  </div>
                </Section>
              )}
            </div>
          )}
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
