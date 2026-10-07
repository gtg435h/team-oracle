import * as React from 'react';
import * as RechartsPrimitive from 'recharts';
import { Area, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCents, formatDateTime } from '@/lib/market/format';
import type { PricePoint } from '@/lib/market/types';

function PriceTooltip({
  active,
  payload,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip>) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as PricePoint | undefined;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="text-xl font-semibold tabular-nums text-foreground">{formatCents(point.p)}</div>
      <div className="text-muted-foreground">{formatDateTime(point.t)}</div>
    </div>
  );
}

/** Step-area chart of the YES price (in ¢) over the market's lifetime. */
export function PriceChart({ points, className }: { points: PricePoint[]; className?: string }) {
  const data: PricePoint[] =
    points.length >= 2
      ? points
      : [...points, ...points.slice(-1).map((p) => ({ t: p.t + 1, p: p.p }))];

  return (
    <div className={className}>
      <RechartsPrimitive.ResponsiveContainer
        width="100%"
        height={280}
        initialDimension={{ width: 320, height: 280 }}
      >
        <RechartsPrimitive.AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="oraclePriceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/60" />
          <XAxis
            dataKey="t"
            tickFormatter={(value: number) => formatDateTime(value)}
            minTickGap={48}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value: number) => `${value}¢`}
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'currentColor', fontSize: 11 }}
            className="text-muted-foreground"
          />
          <ReferenceLine y={50} strokeDasharray="4 4" stroke="currentColor" className="text-border" />
          <Tooltip content={<PriceTooltip />} cursor={{ stroke: 'currentColor', className: 'text-border', strokeDasharray: '3 3' }} />
          <Area
            type="stepAfter"
            dataKey="p"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#oraclePriceFill)"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
          />
        </RechartsPrimitive.AreaChart>
      </RechartsPrimitive.ResponsiveContainer>
    </div>
  );
}
