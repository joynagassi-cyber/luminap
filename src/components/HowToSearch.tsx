/**
 * HowToSearch — barre « Comment faire ? » avec parcours guidés.
 *
 * ── Choix d'implémentation ───────────────────────────────────────────────────
 * · **Aucun appel réseau, aucun modèle de langage.** Filtrage local sur le
 *   catalogue `src/lib/howto.ts`. Fonctionne hors ligne — ce qui compte, puisque
 *   l'application est utilisable sans réseau.
 * · **Mobile d'abord** : une seule colonne, zones tactiles ≥ 44 px, aucune
 *   table, aucun défilement horizontal.
 * · **Étapes repliées par défaut** : sur un écran de 6", afficher 17 parcours
 *   dépliés rendrait la page illisible. On montre la question, on déplie le
 *   parcours choisi.
 * · **Instrumentation discrète** : une recherche n'est journalisée qu'après une
 *   pause de frappe (700 ms) et à partir de 3 caractères, pour ne pas enregistrer
 *   chaque lettre. Le journal reste sur l'appareil (cf. `lib/howto.ts`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  ChevronDown,
  ArrowRight,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

import {
  HOWTOS,
  featuredHowtos,
  searchHowtos,
  logHowToSearch,
  type HowTo,
} from "@/lib/howto";

export interface HowToSearchProps {
  /** Par défaut le catalogue complet. Surchargeable pour les tests. */
  catalogue?: readonly HowTo[];
  /** Nombre de suggestions quand le champ est vide. */
  featuredLimit?: number;
  /** Remplace la navigation par défaut (tests, intégration). */
  onSelectRoute?: (route: string) => void;
}

const MIN_QUERY_FOR_LOG = 3;
const LOG_DEBOUNCE_MS = 700;

export default function HowToSearch({
  catalogue = HOWTOS,
  featuredLimit = 6,
  onSelectRoute,
}: HowToSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const lastLogged = useRef<string>("");

  const trimmed = query.trim();

  const results = useMemo(
    () => searchHowtos(trimmed, catalogue),
    [trimmed, catalogue],
  );
  const suggestions = useMemo(
    () => featuredHowtos(featuredLimit, catalogue),
    [featuredLimit, catalogue],
  );

  // Journalisation après stabilisation de la frappe. On ne journalise jamais
  // deux fois la même requête consécutive (correction, va-et-vient).
  useEffect(() => {
    if (trimmed.length < MIN_QUERY_FOR_LOG) return;
    if (trimmed === lastLogged.current) return;
    const t = setTimeout(() => {
      logHowToSearch(trimmed, searchHowtos(trimmed, catalogue).length);
      lastLogged.current = trimmed;
    }, LOG_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed, catalogue]);

  const go = useCallback(
    (route: string) => {
      if (onSelectRoute) onSelectRoute(route);
      else navigate(route);
    },
    [navigate, onSelectRoute],
  );

  const showingResults = trimmed.length > 0;
  const approximate = results.some((r) => r.approximate);

  return (
    <section aria-labelledby="howto-title" className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen
          className="w-5 h-5 flex-shrink-0"
          style={{ color: "var(--accent-primary)" }}
          aria-hidden="true"
        />
        <h2
          id="howto-title"
          className="font-semibold text-text-primary"
          style={{ color: "var(--text-primary)" }}
        >
          Comment faire ?
        </h2>
      </div>

      {/* ── Champ de recherche ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 rounded-xl px-3"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          minHeight: 48,
        }}
      >
        <Search
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "var(--text-tertiary)" }}
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex. inviter, versement, budget…"
          aria-label="Rechercher une procédure"
          aria-controls="howto-results"
          className="flex-1 bg-transparent outline-none text-sm py-3"
          style={{ color: "var(--text-primary)" }}
          enterKeyHint="search"
          autoComplete="off"
        />
        {trimmed.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="p-2 -mr-1 rounded-full"
            style={{ color: "var(--text-tertiary)" }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div id="howto-results" aria-live="polite">
        {/* ── État vide : suggestions ─────────────────────────────────− */}
        {!showingResults && (
          <>
            <p
              className="text-xs mt-2 mb-3"
              style={{ color: "var(--text-tertiary)" }}
            >
              Questions fréquentes
            </p>
            <ul className="flex flex-wrap gap-2">
              {suggestions.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setQuery(h.keywords[0] ?? h.question)}
                    className="text-xs px-3 rounded-full"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                      minHeight: 36,
                    }}
                  >
                    {h.question.replace(/^(Comment|J'ai) /, "")}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── Aucun résultat : ne pas laisser l'utilisateur dans le vide ─ */}
        {showingResults && results.length === 0 && (
          <div
            className="rounded-xl p-4 mt-3"
            style={{ backgroundColor: "var(--surface)" }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Aucun parcours pour « {trimmed} »
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Essayez un mot plus court, ou consultez le tutoriel complet.
            </p>
            <button
              type="button"
              onClick={() => go("/tutoriel")}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: "var(--accent-primary)", minHeight: 44 }}
            >
              Ouvrir le tutoriel
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Résultats ──────────────────────────────────────────────── */}
        {results.length > 0 && (
          <>
            {approximate && (
              <p
                className="text-xs mt-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                Aucun parcours ne correspond à tous les mots — voici les plus
                proches.
              </p>
            )}
            <ul className="space-y-2 mt-3">
              {results.map(({ howto }) => {
                const open = openId === howto.id;
                return (
                  <li
                    key={howto.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : howto.id)}
                      aria-expanded={open}
                      aria-controls={`howto-steps-${howto.id}`}
                      className="w-full flex items-start gap-3 px-4 text-left"
                      style={{ minHeight: 56 }}
                    >
                      <span className="flex-1 py-3">
                        <span
                          className="block text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {howto.question}
                        </span>
                        <span
                          className="block text-xs mt-0.5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {howto.steps.length} étapes · {howto.summary}
                        </span>
                      </span>
                      <ChevronDown
                        className="w-4 h-4 flex-shrink-0 mt-4 transition-transform"
                        style={{
                          color: "var(--text-tertiary)",
                          transform: open ? "rotate(180deg)" : "none",
                        }}
                        aria-hidden="true"
                      />
                    </button>

                    {open && (
                      <div
                        id={`howto-steps-${howto.id}`}
                        className="px-4 pb-4"
                      >
                        <ol className="space-y-2 mt-1">
                          {howto.steps.map((s, i) => (
                            <li key={`${howto.id}-${i}`} className="flex gap-3">
                              <span
                                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold"
                                style={{
                                  backgroundColor:
                                    "color-mix(in srgb, var(--accent-primary) 14%, transparent)",
                                  color: "var(--accent-primary)",
                                }}
                                aria-hidden="true"
                              >
                                {i + 1}
                              </span>
                              <span className="flex-1">
                                <span
                                  className="block text-sm"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {s.label}
                                </span>
                                {s.detail && (
                                  <span
                                    className="block text-xs mt-0.5"
                                    style={{ color: "var(--text-tertiary)" }}
                                  >
                                    {s.detail}
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ol>

                        {howto.pitfalls && howto.pitfalls.length > 0 && (
                          <div
                            className="rounded-lg p-3 mt-3"
                            style={{
                              backgroundColor:
                                "color-mix(in srgb, var(--data-alert, #B45309) 10%, transparent)",
                            }}
                          >
                            <p
                              className="flex items-center gap-1.5 text-xs font-medium mb-1"
                              style={{ color: "var(--data-alert, #B45309)" }}
                            >
                              <AlertTriangle
                                className="w-3.5 h-3.5"
                                aria-hidden="true"
                              />
                              À savoir
                            </p>
                            <ul className="space-y-1">
                              {howto.pitfalls.map((p, i) => (
                                <li
                                  key={`${howto.id}-p-${i}`}
                                  className="text-xs"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  · {p}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {howto.route && (
                          <button
                            type="button"
                            onClick={() => go(howto.route as string)}
                            className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg text-sm font-medium"
                            style={{
                              backgroundColor: "var(--accent-primary)",
                              color: "var(--on-accent, #fff)",
                              minHeight: 44,
                            }}
                          >
                            {howto.routeLabel ?? "Ouvrir la page"}
                            <ArrowRight
                              className="w-4 h-4"
                              aria-hidden="true"
                            />
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
