import { Link } from 'react-router-dom';
import { Users, ArrowLeftRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Chip } from './Chip';
import { MarketStatusChip } from './MarketStatusChip';
import { Sparkline } from './Sparkline';
import { priceYes } from '@/lib/market/amm';
import { marketStatus } from '@/lib/market/ledger';
import { marketPath } from '@/lib/market/links';
import { formatCents, formatCompact, formatRelative, formatTimeLeft } from '@/lib/market/format';
import { PAYOUT_PER_SHARE } from '@/lib/market/constants';
import type { MarketState } from '@/lib/market/types';
import { cn } from '@/lib/utils';

/** Dashboard grid card for a single market. */
export function MarketCard({ state, className }: { state: MarketState; className?: string }) {
  const { market } = state;
  const b = market.liquidityB;
  const pYes = priceYes(state.qYes, state.qNo, b);
  const pNo = PAYOUT_PER_SHARE - pYes;
  const status = marketStatus(state);

  const resolved = state.resolution?.outcome;
  const displayYes = resolved ? (resolved === 'yes' ? 100 : resolved === 'no' ? 0 : 50) : pYes;

  const first = state.history[0]?.p ?? 50;
  const last = state.history[state.history.length - 1]?.p ?? 50;
  const trendUp = last > first;
  const trendFlat = Math.abs(last - first) < 0.5;

  return (
    <Card
      className={cn(
        'group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40',
        className,
      )}
    >
      <Link to={marketPath(market)} className="block">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <MarketStatusChip state={state} />
            <span className="text-xs text-muted-foreground">
              {status === 'resolved'
                ? `resolved ${formatRelative(state.resolution!.createdAt)}`
                : formatTimeLeft(market.closeDate)}
            </span>
          </div>

          <h3 className="line-clamp-2 min-h-11 text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            {market.title}
          </h3>

          {market.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {market.tags.slice(0, 3).map((tag) => (
                <Chip key={tag} className="border-border/80 bg-muted/60 text-muted-foreground">
                  {tag}
                </Chip>
              ))}
              {market.tags.length > 3 && (
                <Chip className="border-border/80 bg-muted/60 text-muted-foreground">
                  +{market.tags.length - 3}
                </Chip>
              )}
            </div>
          )}

          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-display text-4xl font-bold tabular-nums leading-none tracking-tight">
                {formatCents(displayYes)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">chance of YES</div>
            </div>
            <Sparkline
              points={state.history}
              className={cn(
                'h-9 w-24 shrink-0',
                trendFlat ? 'text-muted-foreground/50' : trendUp ? 'text-emerald-500' : 'text-rose-500',
              )}
            />
          </div>

          <div>
            <div className="flex h-2 overflow-hidden rounded-full" aria-hidden="true">
              <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(Math.max(displayYes, 0), 100)}%` }} />
              <div className="flex-1 bg-rose-400" />
            </div>
            <div className="mt-1.5 flex justify-between text-xs font-medium">
              <span className="text-emerald-600 dark:text-emerald-400">YES {formatCents(pYes)}</span>
              <span className="text-rose-600 dark:text-rose-400">NO {formatCents(pNo)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ArrowLeftRight className="size-3.5" />
              {formatCompact(state.volume)} cr volume
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {state.traderCount} {state.traderCount === 1 ? 'trader' : 'traders'}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
