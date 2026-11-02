/**
 * FormField — Champ de formulaire stylisé avec @tailwindcss/forms.
 *
 * Angles du design couverts :
 *  - Saisie : input, select, textarea stylés de façon cohérente
 *  - Accessibilité : label associé, message d'erreur, focus visible
 *  - États : default, hover, focus, error, disabled
 *
 * Usage :
 *   <FormField label="Nom" error="Ce champ est requis">
 *     <input type="text" className="form-input" />
 *   </FormField>
 */

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactElement;
  className?: string;
}

export function FormField({
  label,
  error,
  helperText,
  required = false,
  children,
  className,
}: FormFieldProps) {
  const inputClasses = cn(
    "form-input w-full rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-placeholder focus:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:outline-none transition-all",
    error ? "border-out focus:ring-out" : "",
    disabledClass(children.props.disabled),
    children.props.className,
  );

  return (
    <div className={cn("space-y-1", className)}>
      <label
        className={cn(
          "flex items-center gap-1 text-sm font-medium text-text-primary",
          error && "text-out",
        )}
      >
        {label}
        {required && <span className="text-xs text-out">*</span>}
      </label>

      <div className="relative">
        {React.cloneElement(children, { className: inputClasses })}
        {error && (
          <div className="absolute -right-3 top-2 text-text-tertiary pointer-events-none">
            <AlertCircle size={14} />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-out font-medium flex items-center gap-1.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {helperText && !error && (
        <p className="text-xs text-text-tertiary">{helperText}</p>
      )}
    </div>
  );
}

function disabledClass(disabled?: boolean): string {
  if (disabled) {
    return "bg-surface-hover text-text-tertiary cursor-not-allowed";
  }
  return "";
}

export default FormField;
