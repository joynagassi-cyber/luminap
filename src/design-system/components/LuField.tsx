/**
 * LuField — primitive P2 (spec §6 « Formulaires »).
 *
 * Fond `--lu-surface-2`, rayon 14 (radius-md), hauteur 56, **label au-dessus
 * de la valeur à l'intérieur du champ** (12 muted) — supprime le défaut des
 * labels superposés (réf. 4). Sans bordure au repos en clair, bordure 1px en
 * sombre. États : focus (bordure accent + anneau), erreur (bordure
 * `--lu-expense` + message avec icône SOUS le champ), disabled, readonly.
 * Aide / erreur toujours sous le champ, jamais en superposition.
 *
 * 100 % jetons --lu-* (ratchet lint).
 */
import { useContext, useState, type CSSProperties, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { ThemeContext } from "@/design-system/theme/theme-context";

export interface LuFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  error?: string;
  helper?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  type?: string;
  inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
  autoComplete?: string;
  name?: string;
  id?: string;
  /** Slot trailing (icône calendrier, « T »…). */
  trailing?: ReactNode;
}

export function LuField({
  label,
  value,
  onChange,
  error,
  helper,
  disabled,
  readOnly,
  required,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  name,
  id,
  trailing,
}: LuFieldProps) {
  const [focused, setFocused] = useState(false);
  const mode = useContext(ThemeContext)?.mode ?? "dark";
  const fieldId = id ?? name ?? `lu-field-${label}`;

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 56,
    padding: "6px 16px",
    background: "var(--lu-surface-2)",
    borderRadius: "var(--lu-radius-md)",
    border: `1px solid ${
      error ? "var(--lu-expense)" : focused ? "var(--lu-accent)" : mode === "dark" ? "var(--lu-border)" : "transparent"
    }`,
    outline: focused ? "2px solid var(--lu-focus-ring)" : "none",
    outlineOffset: 2,
    opacity: disabled ? 0.4 : 1,
  };

  return (
    <div className="w-full">
      <label htmlFor={fieldId} className="block w-full">
        <span
          className="mb-0.5 block px-1 text-xs font-medium"
          style={{ color: error ? "var(--lu-expense)" : "var(--lu-fg-muted)" }}
        >
          {label}
          {required && <span aria-hidden style={{ color: "var(--lu-expense)" }}> *</span>}
        </span>
        <span style={containerStyle} data-testid="lu-field-box">
          <input
            id={fieldId}
            name={name}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : helper ? `${fieldId}-helper` : undefined}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            style={{ color: "var(--lu-fg)" }}
          />
          {trailing && <span className="shrink-0" style={{ color: "var(--lu-fg-muted)" }}>{trailing}</span>}
        </span>
      </label>
      {error ? (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="mt-1 flex items-center gap-1 px-1 text-xs"
          style={{ color: "var(--lu-expense)" }}
        >
          <AlertCircle size={14} aria-hidden />
          {error}
        </p>
      ) : helper ? (
        <p id={`${fieldId}-helper`} className="mt-1 px-1 text-xs" style={{ color: "var(--lu-fg-muted)" }}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export default LuField;
