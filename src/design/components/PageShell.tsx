/**
 * PageShell — Conteneur de page standardisé pour le redesign Lumina.
 *
 * Fournit la structure commune à toutes les pages :
 *  - Fond canvas (thème sombre par défaut)
 *  - Espacement interne (px-6) et padding bas (safe-area + BottomNav)
 *  - TopHeader intégré (optionnel)
 *  - BottomNav intégré (optionnel)
 *
 * Usage :
 *   <PageShell title="Titre" showHeader showBottomNav>
 *     <Section title="Ma section">...</Section>
 *   </PageShell>
 */

import { IonContent, IonPage } from "@ionic/react";
import { TopHeader } from "@/components/TopHeader";
import BottomNav from "@/components/BottomNav";

interface PageShellProps {
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Conteneur de page avec fond, espacement et navigation. */
export function PageShell({
  title,
  subtitle,
  showHeader = true,
  showBottomNav = true,
  headerRight,
  children,
  className = "",
}: PageShellProps) {
  return (
    <IonPage>
      <IonContent fullscreen className="bg-canvas">
        <div className={`min-h-dvh flex flex-col ${className}`}>
          {showHeader && (
            <div className="flex items-center justify-between px-6 py-5">
              {title && (
                <div className="flex flex-col">
                  <h1
                    className="text-text-primary font-bold text-3xl tracking-tight mb-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="text-text-tertiary text-sm mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
              {headerRight}
            </div>
          )}

          <div className="flex-1 px-6 pt-2 pb-safe-calc">
            {children}
          </div>

          {showBottomNav && <BottomNav />}
        </div>
      </IonContent>
    </IonPage>
  );
}

/** Section de page : titre + contenu avec espacement cohérent. */
export function Section({
  title,
  titleClass = "text-text-primary font-semibold text-base uppercase tracking-wider mb-4",
  children,
  className = "",
}: {
  title?: string;
  titleClass?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-8 ${className}`}>
      {title && (
        <p className={titleClass}>{title}</p>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/** ActionCard — carte d'action principale avec dégradé accent ou couleur sémantique. */
export function ActionCard({
  tone = "primary",
  onClick,
  children,
  className = "",
  ariaLabel,
}: {
  tone?: "primary" | "income" | "expense" | "advance";
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const TONE_COLOR: Record<string, string> = {
    primary: "var(--accent-primary)",
    income: "var(--in)",
    expense: "var(--out)",
    advance: "var(--data-advance)",
  };
  return (
    <button
      onClick={onClick}
      className={`w-full py-5 rounded-2xl font-bold text-sm text-center flex items-center justify-center gap-3 transition-all active:scale-97 shadow-accent ${className}`}
      style={{
        backgroundColor: TONE_COLOR[tone],
        color: tone === "primary" ? "var(--on-accent)" : "var(--text-primary)",
      }}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/** InfoCard — carte d'information avec fond surface et bordure. */
export function InfoCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border border-border bg-surface transition-all hover:border-accent-primary/50 ${className}`}
      style={{
        boxShadow: "var(--shadow-card)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** StatCard — carte de statistique avec icône, valeur et label. */
export function StatCard({
  value,
  label,
  icon,
  tone = "primary",
  trend,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  tone?: "primary" | "income" | "expense" | "advance";
  trend?: { label: string; up: boolean };
}) {
  const TONE_COLOR: Record<string, string> = {
    primary: "var(--accent-primary)",
    income: "var(--in)",
    expense: "var(--out)",
    advance: "var(--data-advance)",
  };
  return (
    <div className="rounded-2xl p-5 border border-border bg-surface flex items-center justify-between">
      <div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
          }}
        >
          {icon}
        </div>
        <div className="text-text-tertiary text-xs font-semibold uppercase tracking-wide mb-1">
          {label}
        </div>
        <div className="text-2xl font-bold tabular-nums" style={{ color: TONE_COLOR[tone] }}>
          {value}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs font-medium">
          {trend.up ? (
            <span style={{ color: "var(--in)" }}>▲ {trend.label}</span>
          ) : (
            <span style={{ color: "var(--out)" }}>▼ {trend.label}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** FormField — champ de formulaire standardisé avec label flottant corrigé. */
export function FormField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  error,
  inputMode,
  ariaLabel,
  inputClass = "",
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  inputMode?: string;
  ariaLabel?: string;
  inputClass?: string;
}) {
  return (
    <div className="mb-5">
      <label
        className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </label>
      <div
        className="relative"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          transition: "all 0.2s ease",
        }}
      >
        <input
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-label={ariaLabel ?? label}
          className={`w-full pl-4 pr-4 py-3.5 text-text-primary text-sm bg-transparent border-none outline-none focus:ring-0 ${inputClass}`}
          style={{
            color: "var(--text-primary)",
          }}
        />
        {error && (
          <p className="text-xs mt-1.5 text-text-alert" style={{ color: "var(--data-alert)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/** ListItem — élément de liste avec icône, titre, sous-titre et action. */
export function ListItem({
  icon,
  title,
  subtitle,
  amount,
  amountTone = "primary",
  onClick,
  chevron = true,
  className = "",
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  amount?: string;
  amountTone?: "primary" | "income" | "expense";
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
}) {
  const TONE_COLOR: Record<string, string> = {
    primary: "var(--text-primary)",
    income: "var(--in)",
    expense: "var(--out)",
  };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border transition-all active:scale-98 ${className}`}
      aria-label={title}
    >
      {icon && (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
          }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-text-tertiary text-xs mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {amount && (
        <span
          className="text-sm font-semibold tabular-nums flex-shrink-0"
          style={{ color: TONE_COLOR[amountTone] }}
        >
          {amount}
        </span>
      )}
      {chevron && (
        <span className="text-text-tertiary text-xs flex-shrink-0">›</span>
      )}
    </button>
  );
}

/** EmptyState premium — état vide avec illustration et CTA. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  actionLabel = "Commencer",
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent-primary) 12%, transparent)",
        }}
      >
        {icon}
      </div>
      <h2 className="text-text-primary font-bold text-xl mb-2">{title}</h2>
      <p className="text-text-tertiary text-sm max-w-xs mb-6">{description}</p>
      {action && (
        <button
          onClick={action}
          className="w-auto py-3 px-6 rounded-full font-semibold text-sm text-on-accent transition-all active:scale-95"
          style={{ backgroundColor: "var(--accent-primary)" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
