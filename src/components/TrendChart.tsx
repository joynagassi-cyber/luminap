/**
 * TrendChart — recharts AreaChart wrapper pour les sparklines du dashboard.
 *
 * Usage : <TrendChart points={points} height={96} color="var(--data-income)" />
 * Les points sont des nombres (y-values). Le composant construit lui-même
 * l'axe x à partir de labels optionnels (mois courts).
 *
 * Design :
 * - 100% sans état (props → SVG)
 * - ResponsiveContainer de recharts avec une hauteur fixe (px, pas %)
 * - Tooltip/axes masqués (sparkline) pour rester lisible à 390 px
 * - Fill = gradient du token Lumina (color-mix inline, jamais de couleur brute)
 */
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface TrendChartProps {
  /** Valeurs Y, en cents FCFA ou en unités. */
  values: number[];
  /** Labels de l'axe X (un par value). Si absents, un index 0..n-1 est utilisé. */
  labels?: string[];
  /** Couleur de stroke (token Lumina recommandé). */
  color?: string;
  /** Hauteur en pixels (défaut 96 px). */
  height?: number;
  /** Affiche le tooltip au survol (desktop). Défaut : masqué. */
  withTooltip?: boolean;
}

export default function TrendChart({
  values,
  labels,
  color = "var(--accent-primary)",
  height = 96,
  withTooltip = false,
}: TrendChartProps) {
  const data = values.map((v, i) => ({ i, value: v, label: labels?.[i] ?? String(i) }));

  const gid = `trend-grad-${color.replace(/[^a-z0-9]/gi, "").slice(0, 8)}`;

  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Tendance">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Tooltip
            content={
              withTooltip
                ? (props: any) => {
                    const active = props.active;
                    if (!active || !props.payload?.length) return null;
                    const p = props.payload[0];
                    return (
                      <div
                        className="px-2 py-1 rounded-md text-xs"
                        style={{
                          backgroundColor: "var(--surface)",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {p.label ?? ""} · {p.value}
                      </div>
                    );
                  }
                : false
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gid})`}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
