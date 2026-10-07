import { Card, CardContent } from '@/components/ui/card';
import { positionStats } from '@/lib/market/ledger';
import { formatCents, formatCredits, formatSignedCredits } from '@/lib/market/format';
import { PAYOUT_PER_SHARE } from '@/lib/market/constants';
import type { MarketState, Position } from '@/lib/market/types';
import { cn } from '@/lib/utils';

/** Your open position in a single market (market page). */
export function PositionCard({ state, position }: { state: MarketState; position: Position }) {
  const stats = positionStats(state, position);
  const hasShares = position.yesShares + position.noShares > 0;
  if (!hasShares) return null;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h3 className="font-semibold">Your position</h3>

        <div className="space-y-2 text-sm">
          {position.yesShares > 0 && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {formatCredits(position.yesShares)} YES
              </span>
              <span className="text-muted-foreground">
                avg {formatCents(position.yesShares ? position.yesCostBasis / position.yesShares : 0)} · worth{' '}
                <span className="font-medium tabular-nums text-foreground">{formatCredits(stats.yesValue)} cr</span>
              </span>
            </div>
          )}
          {position.noShares > 0 && (
            <div className="flex items-center justify-between">
              <span className="font-medium text-rose-600 dark:text-rose-400">
                {formatCredits(position.noShares)} NO
              </span>
              <span className="text-muted-foreground">
                avg {formatCents(position.noShares ? position.noCostBasis / position.noShares : 0)} · worth{' '}
                <span className="font-medium tabular-nums text-foreground">{formatCredits(stats.noValue)} cr</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">
            Total P&L (basis {formatCredits(stats.basis)} cr)
          </span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              stats.pnl > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : stats.pnl < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground',
            )}
          >
            {formatSignedCredits(stats.pnl)} cr
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          If resolved now, YES pays {formatCents(PAYOUT_PER_SHARE)} · NO pays{' '}
          {formatCents(PAYOUT_PER_SHARE)} per share to the winning side.
        </p>
      </CardContent>
    </Card>
  );
}
