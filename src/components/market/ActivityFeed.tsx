import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserChip } from './UserChip';
import { formatCents, formatCredits, formatRelative } from '@/lib/market/format';
import type { Trade } from '@/lib/market/types';
import { cn } from '@/lib/utils';

interface ActivityFeedProps {
  trades: Trade[];
  limit?: number;
}

/** List of validated trades (most recent first). */
export function ActivityFeed({ trades, limit = 15 }: ActivityFeedProps) {
  const shown = trades.slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {shown.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No trades yet — be the first.</p>
        ) : (
          <ul className="divide-y">
            {shown.map((trade) => (
              <li key={trade.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                <UserChip pubkey={trade.pubkey} size="sm" className="min-w-24 flex-1" />
                <span className="text-muted-foreground">
                  {trade.action === 'buy' ? 'bought' : 'sold'}{' '}
                  <span className={cn('font-semibold', trade.side === 'yes' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {trade.shares} {trade.side.toUpperCase()}
                  </span>{' '}
                  {trade.action === 'buy' ? (
                    <>for <span className="font-medium tabular-nums text-foreground">{formatCredits(trade.credits)} cr</span></>
                  ) : (
                    <>for <span className="font-medium tabular-nums text-foreground">{formatCredits(-trade.credits)} cr</span></>
                  )}
                </span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground" title={`${formatCents(Math.abs(trade.credits) / trade.shares)} avg`}>
                  {formatRelative(trade.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
