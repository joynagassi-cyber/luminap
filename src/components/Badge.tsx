/**
 * Badge — pastille d'état premium, tokenisée (thème clair/sombre + accent org).
 *
 * Rendu : `rounded-full`, icône optionnelle (prête à l'emploi, lucide-react),
 * libellé FR explicite, teinte de fond dérivée du TON par `tint()` (color-mix).
 * La couleur de texte et l'icône pointent un token CSS Lumina — donc le badge
 * s'adapte automatiquement au mode (`--data-*`/`--text-*` basculent via
 * `[data-theme]`) et à la couleur de marque (`--accent-*`, poussée par
 * `applyTheme`). Aucune couleur brute n'est acceptée.
 *
 * Deux formes d'usage :
 *   - `<Badge tone="success" label="Actif" icon="checkCircle" />` ;
 *   - `<Badge spec={MEMBER_BADGES[m.status]} />` ou
 *     `<Badge table={MEMBER_BADGES} value={m.status} />` (repli neutre).
 *
 * `variant` : `soft` (fond teinté — défaut) ou `outline` (bordure + texte).
 */

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Award,
  Ban,
  Calendar,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CirclePause,
  CirclePlay,
  CircleX,
  Clock,
  Coins,
  Eye,
  FileText,
  Flag,
  Hourglass,
  Info,
  Inbox,
  Lock,
  Receipt,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  UserCheck,
  UserPlus,
  UserX,
  Wallet,
  X,
  Zap,
} from "lucide-react";

import { cn, tint } from "@/lib/utils";
import {
  BADGE_TONE_TOKEN,
  resolveBadge,
  type BadgeIconName,
  type BadgeSpec,
  type BadgeTone,
} from "@/lib/badges";

/** Registre d'icônes prêtes à l'emploi (clé stable → composant lucide). */
const ICONS: Record<BadgeIconName, LucideIcon> = {
  circle: Circle,
  dot: CircleDashed,
  check: CircleCheck,
  checkCircle: CircleCheck,
  x: X,
  xCircle: CircleX,
  minus: CircleMinus,
  alert: TriangleAlert,
  info: Info,
  clock: Clock,
  pause: CirclePause,
  play: CirclePlay,
  ban: Ban,
  archive: Archive,
  refresh: RefreshCw,
  file: FileText,
  send: Send,
  inbox: Inbox,
  eye: Eye,
  userPlus: UserPlus,
  userCheck: UserCheck,
  userX: UserX,
  shield: ShieldCheck,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
  award: Award,
  rocket: Rocket,
  flag: Flag,
  lock: Lock,
  star: Star,
  zap: Zap,
  target: Target,
  coins: Coins,
  receipt: Receipt,
  wallet: Wallet,
  trendUp: TrendingUp,
  trendDown: TrendingDown,
  hourglass: Hourglass,
  calendar: Calendar,
};

export type BadgeSize = "xs" | "sm" | "md";
export type BadgeVariant = "soft" | "outline";

const SIZES: Record<BadgeSize, { pill: string; icon: number }> = {
  xs: { pill: "text-[10px] px-1.5 py-0.5 gap-1", icon: 10 },
  sm: { pill: "text-xs px-2 py-0.5 gap-1", icon: 12 },
  md: { pill: "text-sm px-3 py-1 gap-1.5", icon: 14 },
};

export interface BadgeProps {
  /** Spécification complète (alternative à `tone`/`label`/`icon`). */
  spec?: BadgeSpec;
  /** Table de badges + valeur : le repli neutre affiche la valeur brute. */
  table?: Record<string, BadgeSpec>;
  value?: string | null;
  tone?: BadgeTone;
  label?: string;
  icon?: BadgeIconName | null;
  size?: BadgeSize;
  variant?: BadgeVariant;
  /** Pastille ronde colorée avant le libellé (au lieu d'une icône). */
  dot?: boolean;
  className?: string;
  /** Exposé aux lecteurs d'écran comme région de statut vivante. */
  live?: boolean;
}

const Badge = memo(function Badge({
  spec,
  table,
  value,
  tone,
  label,
  icon,
  size = "sm",
  variant = "soft",
  dot = false,
  className,
  live = false,
}: BadgeProps) {
  const resolved: BadgeSpec =
    spec ??
    (table ? resolveBadge(table, value) : { label: label ?? "—", tone: tone ?? "neutral", icon: icon ?? undefined });

  const token = BADGE_TONE_TOKEN[resolved.tone];
  const Icon = resolved.icon ? ICONS[resolved.icon] : undefined;
  const showIcon = !dot && icon !== null && Boolean(Icon);
  const iconSize = SIZES[size].icon;

  const style =
    variant === "outline"
      ? { color: token, border: `1px solid ${tint(token, 45)}`, backgroundColor: "transparent" }
      : { color: token, backgroundColor: tint(token, 12) };

  return (
    <span
      role={live ? "status" : undefined}
      aria-label={`Statut : ${resolved.label}`}
      className={cn(
        "inline-flex items-center font-medium rounded-full whitespace-nowrap align-middle",
        SIZES[size].pill,
        className,
      )}
      style={style}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="rounded-full flex-shrink-0"
          style={{ width: iconSize / 2 + 2, height: iconSize / 2 + 2, backgroundColor: token }}
        />
      )}
      {showIcon && Icon && <Icon size={iconSize} strokeWidth={2.5} aria-hidden="true" />}
      {resolved.label}
    </span>
  );
});

export default Badge;
