import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { resource } from "@/capabilities/resource";
import { lifecycle } from "@/capabilities/lifecycle";
import type { Group, Member, Event } from "@/types";
import {
  useDocuments,
  addDocumentPS,
  updateDocumentPS,
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
  IonHeader,
  IonContent,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

export default function Archives() {
  const navigate = useNavigate();

  const [archivedGroups, setArchivedGroups] = useState<Group[]>([]);
  const [archivedMembers, setArchivedMembers] = useState<Member[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Documents (upload / archivage via bucket `archives`) ─────────────
  const { data: allDocuments } = useDocuments();
  const documents = (allDocuments ?? []).filter(
    (d) => d.bucket === "archives",
  );
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

  // Load archived entities via Resource capability
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        // Load archived entities failed — non-fatal
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <IonContent className="bg-canvas">
        <div className="min-h-screen bg-canvas">
          <TopHeader title="Archives" />
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <ArchivesSkeleton />
            </div>
          ) : (
            <div className="max-w-lg mx-auto px-5 pb-32 pt-16">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-text-secondary text-sm mb-5"
                aria-label="Retour à la page précédente"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>

              <h1 className="text-text-primary font-bold text-xl mb-5">
                Archives
              </h1>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans les archives..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-text-primary text-sm"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                  }}
                />
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide">
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
                    className="px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                    style={{
                      backgroundColor:
                        filterType === id ? "var(--accent-primary)" : "var(--surface)",
                      color: filterType === id ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                    aria-pressed={filterType === id}
                    aria-label={`Filtrer par ${label}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Documents : upload + liste */}
              {(filterType === "all" || filterType === "document") && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Upload className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
                    Documents
                  </h2>

                  {/* Formulaire d'upload */}
                  <div
                    className="rounded-xl p-4 mb-4 space-y-3"
                    style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Nom du document *"
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                      aria-label="Nom du document"
                    />
                    <input
                      type="text"
                      value={docPurpose}
                      onChange={(e) => setDocPurpose(e.target.value)}
                      placeholder="Objet / à quoi il s'applique (ex: PV assemblée, reçu...)"
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                      aria-label="Objet du document"
                    />
                    <label
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm cursor-pointer"
                      style={{ backgroundColor: "var(--surface-hover)", color: "var(--text-primary)" }}
                    >
                      <FileText className="w-4 h-4" />
                      {docFile ? docFile.name : "Choisir le fichier (PDF, image...)*"}
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
                      <p className="text-xs" style={{ color: "#E51332" }}>
                        {docError}
                      </p>
                    )}
                    <button
                      onClick={handleDocumentUpload}
                      disabled={docUploading || !docFile || !docTitle.trim()}
                      className="w-full py-3 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-40"
                      style={{
                        backgroundColor: "var(--accent-primary)",
                      }}
                    >
                      {docUploading ? "Archivage..." : "Archiver le document"}
                    </button>
                  </div>

                  {/* Liste des documents */}
                  <div className="space-y-2">
                    {documents.length === 0 ? (
                      <p className="text-center text-text-tertiary text-xs py-4">
                        Aucun document archivé
                      </p>
                    ) : (
                      documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-xl p-3 flex items-center gap-3"
                          style={{
                            backgroundColor: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: "var(--surface-hover)" }}
                          >
                            <FileText className="w-5 h-5 text-text-tertiary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text-secondary text-sm font-medium truncate">
                              {doc.title}
                              {doc.status === "ARCHIVED" && (
                                <span className="ml-2 text-xs text-text-tertiary">
                                  (archivé)
                                </span>
                              )}
                            </p>
                            {doc.purpose && (
                              <p className="text-text-tertiary text-xs mt-0.5 truncate">
                                {doc.purpose}
                              </p>
                            )}
                            <p className="text-text-tertiary text-xs mt-0.5">
                              {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                              {doc.file_size
                                ? ` · ${(doc.file_size / 1024).toFixed(0)} Ko`
                                : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="p-2 rounded-full active:scale-95"
                            style={{ backgroundColor: "#1DB95420" }}
                            aria-label={`Télécharger ${doc.title}`}
                          >
                            <Download className="w-4 h-4" style={{ color: "#1DB954" }} />
                          </button>
                          <button
                            onClick={() => handleToggleArchiveDocument(doc)}
                            className="p-2 rounded-full active:scale-95"
                            style={{
                              backgroundColor: doc.status === "ARCHIVED" ? "#FFB80020" : "#E5133220",
                            }}
                            aria-label={
                              doc.status === "ARCHIVED"
                                ? `Rétablir ${doc.title}`
                                : `Supprimer ${doc.title}`
                            }
                          >
                            <Archive
                              className="w-4 h-4"
                              style={{
                                color: doc.status === "ARCHIVED" ? "#FFB800" : "#E51332",
                              }}
                            />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Archived items (entités) — masqué quand l'onglet Documents est actif */}
              {filterType !== "document" && (
              <div className="space-y-2">
                {filtered.length === 0 ? (
                  <div
                    className="text-center py-10 rounded-xl"
                    style={{ backgroundColor: "var(--surface)" }}
                  >
                    <Archive className="w-12 h-12 mx-auto mb-4 text-text-tertiary opacity-40" />
                    <p className="text-text-tertiary text-sm">
                      Aucun élément archivé
                    </p>
                    <p className="text-text-tertiary text-xs mt-1">
                      Les éléments archivés apparaîtront ici
                    </p>
                  </div>
                ) : (
                  filtered.map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-xl p-4 flex items-center gap-3"
                      style={{
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
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
                      <div className="flex-1 min-w-0">
                        <p className="text-text-secondary text-sm font-medium truncate">
                          {item.name}
                        </p>
                        <p className="text-text-tertiary text-xs mt-0.5">
                          {item.reason}
                        </p>
                        {item.archivedAt && (
                          <p className="text-text-tertiary text-xs mt-0.5">
                            Archivé le{" "}
                            {new Date(item.archivedAt).toLocaleDateString(
                              "fr-FR",
                            )}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRestore(item.type as any, item.id)}
                        className="p-2 rounded-full active:scale-95 transition-transform"
                        style={{ backgroundColor: "#1DB95420" }}
                        aria-label={`Restaurer ${item.name}`}
                      >
                        <RefreshCw
                          className="w-4 h-4"
                          style={{ color: "#1DB954" }}
                        />
                      </button>
                    </div>
                  ))
                )}
              </div>
              )}
            </div>
          )}
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
