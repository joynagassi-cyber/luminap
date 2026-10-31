import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  IonPage,
  IonContent,
  IonInput,
} from "@ionic/react";
import {
  ArrowLeft,
  Search as SearchIcon,
  Users,
  CalendarDays,
  ArrowLeftRight,
  FileText,
  ListChecks,
  ChevronRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { ListSkeleton } from "@/components/Skeleton";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import {
  SEARCH_KIND_LABELS,
  type SearchKind,
} from "@/lib/globalSearch";

/** Icône par catégorie de résultat. */
const KIND_ICONS: Record<SearchKind, typeof Users> = {
  member: Users,
  group: Users,
  event: CalendarDays,
  transaction: ArrowLeftRight,
  document: FileText,
  form: ListChecks,
};

/**
 * PR11 — Recherche globale (`/search`).
 *
 * Un seul endroit pour retrouver un membre, un groupe, un événement, un
 * mouvement, un document ou un formulaire. Chaque résultat mène à sa fiche.
 *
 * R52 : tant que la réplique locale n'est pas lue (`replicaPending`), l'écran
 * affiche un squelette et ne montre JAMAIS « Aucun résultat » (fait faux).
 */
export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { ready, results } = useGlobalSearch(query);

  // R52 — réplique non lue : verdict vide interdit.
  const replicaPending = !ready;
  const trimmed = query.trim();

  return (
    <IonPage>
      <IonContent className="bg-canvas" fullscreen>
        <h1 className="sr-only">Recherche globale</h1>
        <div data-screen-state="ready" className="min-h-dvh">
          <TopHeader title="Recherche" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <div className="flex items-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="topheader-action"
                aria-label="Retour"
                title="Retour"
              >
                <span className="topheader-action-visual">
                  <ArrowLeft className="w-4 h-4 text-text-secondary" />
                </span>
              </button>
              <div>
                <p className="text-text-primary font-bold text-xl">
                  Recherche
                </p>
                <p className="text-text-tertiary text-xs mt-0.5">
                  Membres, groupes, événements, mouvements, documents
                </p>
              </div>
            </div>

            {/* Champ de recherche */}
            <div className="relative mb-5">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <IonInput
                aria-label="Rechercher dans toute l'application"
                placeholder="Rechercher..."
                value={query}
                onIonInput={(e) => setQuery((e.detail.value as string) ?? "")}
              />
            </div>

            {replicaPending ? (
              <ListSkeleton count={5} />
            ) : trimmed.length === 0 ? (
              <div
                className="text-center py-10 rounded-xl"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <p className="text-text-tertiary text-sm">
                  Saisissez un mot pour lancer la recherche.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div
                className="text-center py-10 rounded-xl"
                style={{ backgroundColor: "var(--surface)" }}
              >
                <p className="text-text-primary text-sm font-medium">
                  Aucun résultat
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  Essayez un autre mot-clé.
                </p>
              </div>
            ) : (
              <>
                <p className="text-text-tertiary text-xs mb-3">
                  {results.length} résultat{results.length !== 1 ? "s" : ""}
                </p>
                <ul className="space-y-2 mb-6">
                  {results.map((result) => {
                    const Icon = KIND_ICONS[result.kind];
                    return (
                      <li key={`${result.kind}:${result.id}`}>
                        <button
                          type="button"
                          onClick={() => navigate(result.route)}
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                          style={{
                            backgroundColor: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                          aria-label={`${SEARCH_KIND_LABELS[result.kind]} — ${result.title}`}
                        >
                          <span
                            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor:
                                "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
                            }}
                          >
                            <Icon className="w-4 h-4 text-text-secondary" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-text-primary text-sm font-medium truncate">
                              {result.title}
                            </span>
                            <span className="block text-text-tertiary text-xs truncate">
                              {SEARCH_KIND_LABELS[result.kind]}
                              {result.subtitle ? ` · ${result.subtitle}` : ""}
                            </span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
