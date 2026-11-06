/**
 * LuSelect — primitive P2 (spec §6 « LuSelect », 3 modes).
 *
 *  - ≤ 5 options  → `LuOptionList` en ligne (mode `list`) ;
 *  - 6–20 options → champ gris à chevron + popover (mode `popover`) ;
 *  - plus long / mobile → bottom sheet avec recherche (mode `sheet`).
 *  - `mode="auto"` (défaut) choisit selon le nombre d'options.
 *
 * Champ : même apparence que LuField (surface-2, h 56, rayon 14, label
 * au-dessus dans le champ). 100 % jetons --lu-* (ratchet lint).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, ChevronDown, Search } from "lucide-react";
import { LuOptionList, type LuOption } from "./LuOptionList";

export type LuSelectMode = "auto" | "list" | "popover" | "sheet";

export interface LuSelectProps {
  label: string;
  value: string;
  options: LuOption[];
  onChange: (value: string) => void;
  mode?: LuSelectMode;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** Icône affichée dans le champ (option sélectionnée). */
  trailingIcon?: ReactNode;
}

function resolveMode(mode: LuSelectMode, count: number): "list" | "popover" | "sheet" {
  if (mode !== "auto") return mode;
  if (count <= 5) return "list";
  if (count <= 20) return "popover";
  return "sheet";
}

export function LuSelect({
  label,
  value,
  options,
  onChange,
  mode = "auto",
  disabled,
  error,
  placeholder = "Choisir…",
  trailingIcon,
}: LuSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const resolved = resolveMode(mode, options.length);
  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(
    () =>
      query.trim()
        ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
        : options,
    [options, query],
  );

  // Fermeture au clic extérieur + Échap (popover et sheet).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  const field = (
    <button
      type="button"
      disabled={disabled}
      aria-haspopup={resolved === "list" ? undefined : "listbox"}
      aria-expanded={resolved === "list" ? undefined : open}
      aria-invalid={error ? true : undefined}
      onClick={() => resolved !== "list" && setOpen((o) => !o)}
      data-testid="lu-select-trigger"
      className="flex min-h-[56px] w-full items-center gap-2 rounded-[var(--lu-radius-md)] px-4 py-1.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
      style={{
        background: "var(--lu-surface-2)",
        border: `1px solid ${error ? "var(--lu-expense)" : "transparent"}`,
        outlineColor: "var(--lu-focus-ring)",
      }}
    >
      {trailingIcon && <span className="shrink-0" style={{ color: "var(--lu-fg-muted)" }}>{trailingIcon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium" style={{ color: "var(--lu-fg-muted)" }}>{label}</span>
        <span
          className="block truncate text-[15px]"
          style={{ color: selected ? "var(--lu-fg)" : "var(--lu-fg-subtle)" }}
        >
          {selected?.label ?? placeholder}
        </span>
      </span>
      <ChevronDown size={18} aria-hidden style={{ color: "var(--lu-fg-muted)", transform: open ? "rotate(180deg)" : "none" }} />
    </button>
  );

  const errorBlock = error ? (
    <p role="alert" className="mt-1 flex items-center gap-1 px-1 text-xs" style={{ color: "var(--lu-expense)" }}>
      <AlertCircle size={14} aria-hidden />
      {error}
    </p>
  ) : null;

  // Mode list : la liste est toujours visible sous le label.
  if (resolved === "list") {
    return (
      <div className="w-full">
        <span className="mb-0.5 block px-1 text-xs font-medium" style={{ color: error ? "var(--lu-expense)" : "var(--lu-fg-muted)" }}>
          {label}
        </span>
        <LuOptionList options={options} value={value} onSelect={onChange} aria-label={label} />
        {errorBlock}
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={rootRef}>
      {field}
      {errorBlock}
      {open && resolved === "popover" && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-2"
          style={{ filter: "drop-shadow(var(--lu-shadow-md))" }}
        >
          <div style={{ background: "var(--lu-surface)", borderRadius: "var(--lu-radius-lg)", border: "1px solid var(--lu-border)", padding: 6 }}>
            <LuOptionList options={options} value={value} onSelect={select} aria-label={label} />
          </div>
        </div>
      )}
      {open && resolved === "sheet" && (
        <>
          <div
            className="fixed inset-0 z-30"
            style={{ background: "var(--lu-scrim)" }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label={label}
            className="fixed inset-x-0 bottom-0 z-40 pb-6 pt-3"
            style={{ background: "var(--lu-surface)", borderRadius: "var(--lu-radius-2xl) var(--lu-radius-2xl) 0 0" }}
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full" style={{ background: "var(--lu-border-strong)" }} aria-hidden />
            <p className="px-4 text-base font-bold" style={{ color: "var(--lu-fg)" }}>{label}</p>
            <div className="mx-4 mt-2 flex h-11 items-center gap-2 rounded-[var(--lu-radius-md)] px-3" style={{ background: "var(--lu-surface-2)" }}>
              <Search size={16} aria-hidden style={{ color: "var(--lu-fg-muted)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                aria-label={`Rechercher ${label}`}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--lu-fg)" }}
              />
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto px-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-sm" style={{ color: "var(--lu-fg-muted)" }}>Aucun résultat</p>
              ) : (
                <LuOptionList options={filtered} value={value} onSelect={select} aria-label={label} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LuSelect;
