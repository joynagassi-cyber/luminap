import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/lib/dataLayer";
import {
  HelpCircle,
  Info,
  Shield,
  Database,
  Search,
  ChevronRight,
  BookOpen,
  X,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import TopHeader from "@/components/TopHeader";
import { IonPage, IonContent } from "@ionic/react";
import {
  TUTORIAL_SECTIONS,
  searchSections,
  searchFaq,
} from "@/lib/tutorialContent";

/**
 * Centre d'aide (PR16, Phase 13).
 *
 * Ajoute au contenu existant :
 *   - une RECHERCHE qui filtre les sections du tutoriel (source unique
 *     `tutorialContent.ts`, partagée avec `Tutorial.tsx` — aucun contenu
 *     dupliqué), insensible à la casse ET aux accents ;
 *   - une liste « Questions fréquentes » (FAQ transversale).
 *
 * Règle « pas encore lu ≠ vide » (R52) : le corpus est STATIQUE (toujours
 * chargé), mais « Aucun résultat » n'est affiché QUE si la requête est
 * non vide ET le corpus disponible — jamais au premier rendu.
 */
export default function Help() {
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const [query, setQuery] = useState("");

  // Le corpus est statique : disponible dès le premier rendu. On l'exprime
  // explicitement pour ne jamais confondre « rien trouvé » et « pas encore lu ».
  const corpusLoaded = TUTORIAL_SECTIONS.length > 0;
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const matchedSections = useMemo(() => searchSections(trimmed), [trimmed]);
  const matchedFaq = useMemo(() => searchFaq(trimmed), [trimmed]);

  const showNoResult =
    hasQuery &&
    corpusLoaded &&
    matchedSections.length === 0 &&
    matchedFaq.length === 0;

  return (
    <IonPage>
      <IonContent className="bg-canvas">
        <div data-screen-state="ready" className="min-h-dvh">
          <TopHeader title="Aide" />
          <div className="max-w-lg mx-auto px-5 pb-safe-calc pt-safe-calc">
            <h1 className="text-text-primary font-bold text-xl mb-6">
              Aide &amp; Informations
            </h1>

            {/* ─── Recherche dans le centre d'aide ─────────────────────────── */}
            <div className="mb-5">
              <label htmlFor="help-search" className="sr-only">
                Rechercher dans l&apos;aide
              </label>
              <div
                className="flex items-center gap-2 rounded-xl px-3"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <Search
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                  aria-hidden="true"
                />
                <input
                  id="help-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher une aide, une question…"
                  data-testid="help-search-input"
                  className="flex-1 bg-transparent py-3 text-sm text-text-primary outline-none"
                />
                {hasQuery && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Effacer la recherche"
                    data-testid="help-search-clear"
                    className="p-1"
                  >
                    <X
                      className="w-4 h-4"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* ─── Résultats de recherche (sections du tutoriel) ───────────── */}
            {hasQuery && (
              <section aria-label="Résultats de recherche" className="mb-6">
                <h2 className="text-text-secondary font-semibold text-sm mb-2">
                  Sections du tutoriel
                </h2>
                {matchedSections.length > 0 ? (
                  <div className="space-y-2" data-testid="help-section-results">
                    {matchedSections.map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => navigate("/tutoriel")}
                          data-testid={`help-section-${s.id}`}
                          className="w-full text-left rounded-xl p-3 flex items-start gap-3 active:scale-[0.99] transition-transform"
                          style={{
                            backgroundColor: "var(--surface)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: s.iconBg }}
                          >
                            <Icon
                              className="w-4 h-4"
                              style={{ color: s.color }}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-text-primary font-semibold text-sm">
                              {s.title}
                            </p>
                            <p className="text-text-tertiary text-xs mt-0.5 line-clamp-2">
                              {s.paragraphs[0]}
                            </p>
                          </div>
                          <ChevronRight
                            className="w-4 h-4 flex-shrink-0 mt-1"
                            style={{ color: "var(--text-tertiary)" }}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p
                    className="text-text-tertiary text-xs"
                    data-testid="help-sections-none"
                  >
                    Aucune section ne correspond.
                  </p>
                )}
              </section>
            )}

            {/* ─── Aucun résultat global ───────────────────────────────────── */}
            {showNoResult && (
              <div
                className="rounded-xl p-6 text-center mb-6"
                style={{ backgroundColor: "var(--surface)" }}
                data-testid="help-no-result"
                role="status"
              >
                <p className="text-text-primary font-semibold text-sm">
                  Aucun résultat
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  Aucune aide ne correspond à « {trimmed} ». Essayez un autre mot
                  (par exemple « transaction », « sauvegarde », « membre »).
                </p>
              </div>
            )}

            {/* ─── Questions fréquentes ────────────────────────────────────── */}
            <section aria-label="Questions fréquentes" className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle
                  className="w-5 h-5"
                  style={{ color: "var(--accent-primary)" }}
                  aria-hidden="true"
                />
                <h2 className="text-text-primary font-semibold">
                  Questions fréquentes
                </h2>
              </div>
              {matchedFaq.length > 0 ? (
                <div className="space-y-2" data-testid="help-faq-list">
                  {matchedFaq.map((f) => (
                    <details
                      key={f.q}
                      className="rounded-xl p-4"
                      style={{ backgroundColor: "var(--surface)" }}
                    >
                      <summary className="text-text-primary font-medium text-sm cursor-pointer list-none">
                        {f.q}
                      </summary>
                      <p className="text-text-tertiary text-xs mt-2">{f.a}</p>
                    </details>
                  ))}
                </div>
              ) : (
                hasQuery && (
                  <p
                    className="text-text-tertiary text-xs"
                    data-testid="help-faq-none"
                  >
                    Aucune question fréquente ne correspond.
                  </p>
                )
              )}
            </section>

            {/* ─── Accès au tutoriel complet ───────────────────────────────── */}
            <button
              type="button"
              onClick={() => navigate("/tutoriel")}
              data-testid="help-open-tutorial"
              className="w-full rounded-xl p-4 flex items-center gap-3 mb-8 active:scale-[0.99] transition-transform"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <BookOpen
                className="w-5 h-5"
                style={{ color: "var(--accent-primary)" }}
                aria-hidden="true"
              />
              <span className="text-text-primary font-medium text-sm flex-1 text-left">
                Ouvrir le tutoriel complet
              </span>
              <ChevronRight
                className="w-4 h-4"
                style={{ color: "var(--text-tertiary)" }}
                aria-hidden="true"
              />
            </button>

            {/* ─── Repères existants ──────────────────────────────────────── */}
            <div className="space-y-4 mb-8">
              {[
                {
                  icon: Info,
                  title: "Comment utiliser Lumina",
                  desc: "Ajoutez des transactions, gérez vos caisses et effectuez des versements entre groupes.",
                },
                {
                  icon: Shield,
                  title: "Sécurité des données",
                  desc: "Vos données sont stockées localement et synchronisées via PowerSync pour accès multi-appareil.",
                },
                {
                  icon: Database,
                  title: "Synchronisation",
                  desc: `État: ${notifications?.length ?? 0} notifications reçues.`,
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-text-primary font-semibold text-sm">
                      {title}
                    </p>
                    <p className="text-text-tertiary text-xs mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-xl p-4 mb-6"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <HelpCircle className="w-5 h-5" style={{ color: "var(--accent-primary)" }} aria-hidden="true" />
                <span className="text-text-primary font-semibold">
                  Rôles disponibles
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  {
                    role: "TREASURIER",
                    desc: "Accès complet aux transactions et caisses",
                  },
                  {
                    role: "PASTEUR",
                    desc: "Consultation des finances et validation",
                  },
                  {
                    role: "SECRETAIRE",
                    desc: "Gestion des événements et groupes",
                  },
                  { role: "COMPTABLE", desc: "Accès au grand livre et bilans" },
                  {
                    role: "TREASURIER_ADJOINT",
                    desc: "Assiste le trésorier principal",
                  },
                  { role: "SECRETAIRE_ADJOINT", desc: "Assiste le secrétaire" },
                ].map(({ role, desc }) => (
                  <div key={role} className="flex justify-between">
                    <span className="text-text-secondary">
                      {role.replace(/_/g, " ").toLowerCase()}
                    </span>
                    <span className="text-text-tertiary text-xs">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-text-tertiary text-xs text-center">
              Lumina v2.0 · Église MFE-JC Centrale
            </p>
          </div>
          <BottomNav />
        </div>
      </IonContent>
    </IonPage>
  );
}
