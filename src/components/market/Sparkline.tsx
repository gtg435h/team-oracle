import type { PricePoint } from '@/lib/market/types';

interface SparklineProps {
  points: PricePoint[];
  width?: number;
  height?: number;
  className?: string;
}

/** Tiny inline SVG line of the YES price over time. Color via `className` (text-*). */
export function Sparkline({ points, width = 120, height = 36, className }: SparklineProps) {
  const pts = points.length >= 2 ? points : [...points, ...points.slice(-1).map((p) => ({ t: p.t + 1, p: p.p }))];

  let minT = Infinity;
  let maxT = -Infinity;
  for (const p of pts) {
    if (p.t < minT) minT = p.t;
    if (p.t > maxT) maxT = p.t;
  }
  const span = Math.max(maxT - minT, 1);

  const d = pts
    .map((p, i) => {
      const x = ((p.t - minT) / span) * width;
      const y = height - (Math.min(Math.max(p.p, 0), 100) / 100) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
