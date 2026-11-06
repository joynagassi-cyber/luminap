/**
 * LuChart — composite P3 (mini graphiques, spec §6 « graphiques »).
 *
 * Barres verticales tokenisées : `--lu-chart-1..6` selon l'index,
 * valeur max en `--lu-accent`, reste en `--lu-chart-muted-bar` ;
 * grille horizontale `--lu-chart-grid` ; libellés 10–11 muted.
 * SVG 100 % en jetons --lu-* (ratchet lint).
 */
import { LuAmount } from "./LuAmount";

export interface LuChartDatum {
  label: string;
  value: number;
  /** Montant affiché au-dessus de la barre (optionnel). */
  amount?: number;
}

export interface LuChartProps {
  data: LuChartDatum[];
  height?: number;
}

const BAR_COLORS = [
  "var(--lu-chart-1)",
  "var(--lu-chart-2)",
  "var(--lu-chart-3)",
  "var(--lu-chart-4)",
  "var(--lu-chart-5)",
  "var(--lu-chart-6)",
];

export function LuChart({ data, height = 160 }: LuChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 100; // viewBox width, étiré en 100 %
  const n = Math.max(1, data.length);
  const slot = W / n;
  const barW = Math.min(14, slot * 0.55);
  const labelY = height + 12;
  return (
    <div data-testid="lu-chart" className="w-full">
      <svg
        viewBox={`0 0 ${W} ${labelY}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Graphique en barres"
      >
        {/* grille horizontale */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={height * (1 - f)}
            y2={height * (1 - f)}
            stroke="var(--lu-chart-grid)"
            strokeWidth={0.4}
            strokeDasharray={f === 1 ? "none" : "2 2"}
          />
        ))}
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * height * 0.92);
          const x = i * slot + (slot - barW) / 2;
          const isMax = d.value === max && d.value > 0;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={height - h}
                width={barW}
                height={h}
                rx={barW / 3}
                fill={isMax ? "var(--lu-accent)" : BAR_COLORS[i % BAR_COLORS.length]}
              />
              <text
                x={i * slot + slot / 2}
                y={labelY}
                textAnchor="middle"
                fontSize={3.4}
                fill="var(--lu-fg-muted)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {data.some((d) => d.amount != null) && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {data.filter((d) => d.amount != null).map((d) => (
            <span key={d.label} className="text-xs" style={{ color: "var(--lu-fg-muted)" }}>
              {d.label} : <LuAmount amount={d.amount!} size="body" className="font-semibold" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default LuChart;
