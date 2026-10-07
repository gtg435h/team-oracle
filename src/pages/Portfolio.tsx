import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { History, Wallet } from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/market/Chip';
import { MarketStatusChip } from '@/components/market/MarketStatusChip';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLedger } from '@/hooks/useLedger';
import { netWorth, positionStats } from '@/lib/market/ledger';
import { marketPath } from '@/lib/market/links';
import { STARTING_BALANCE } from '@/lib/market/constants';
import { formatCents, formatCredits, formatRelative, formatSignedCredits } from '@/lib/market/format';
import type { MarketState, Position } from '@/lib/market/types';
import { cn } from '@/lib/utils';

function Pnl({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        'font-semibold tabular-nums',
        value > 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : value < 0
            ? 'text-rose-600 dark:text-rose-400'
            : 'text-muted-foreground',
        className,
      )}
    >
      {formatSignedCredits(value)} cr
    </span>
  );
}

export default function Portfolio() {
  useSeoMeta({
    title: 'Portfolio — Team Oracle',
    description: 'Your open positions, balances, and trading history.',
  });

  const { ledger, isPending } = useLedger();
  const { user } = useCurrentUser();

  const account = user && ledger ? ledger.accounts.get(user.pubkey) : undefined;
  const worth = user && ledger ? netWorth(ledger, user.pubkey) : STARTING_BALANCE;
  const totalPnl = worth - STARTING_BALANCE;

  const openPositions = useMemo(() => {
    if (!ledger || !account) return [];
    const rows: { position: Position; state: MarketState }[] = [];
    for (const position of account.positions.values()) {
      if (position.yesShares + position.noShares === 0) continue;
      const state = ledger.markets.get(position.market);
      if (state) rows.push({ position, state });
    }
    return rows.sort((a, b) => b.position.lastTradeAt - a.position.lastTradeAt);
  }, [ledger, account]);

  const resolvedPositions = useMemo(() => {
    if (!account) return [];
    return [...account.resolvedPositions].sort((a, b) => b.closedAt - a.closedAt);
  }, [account]);

  const myTrades = useMemo(() => {
    if (!ledger || !user) return [];
    return ledger.validTrades.filter((t) => t.pubkey === user.pubkey).reverse().slice(0, 25);
  }, [ledger, user]);

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="container flex flex-1 items-center justify-center py-16">
          <Card className="border-dashed">
            <CardContent className="px-8 py-12 text-center">
              <h1 className="font-display text-2xl font-bold">Your portfolio</h1>
              <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
                Log in to track your positions, balance, and P&L across all markets.
              </p>
              <LoginArea className="mt-6 w-full [&>button]:w-full" />
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="container flex-1 py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">Portfolio</h1>

        {isPending || !ledger ? (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Card className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 dark:border-indigo-400/20">
                <CardContent className="p-5">
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Wallet className="size-4" />
                    Net worth
                  </div>
                  <div className="mt-2 font-display text-4xl font-bold tabular-nums">
                    {formatCredits(worth)}
                    <span className="text-lg font-medium text-white/80"> cr</span>
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    {totalPnl === 0 ? 'even since you joined' : <>{totalPnl > 0 ? 'up' : 'down'} {formatCredits(Math.abs(totalPnl))} cr all-time</>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground">Available credits</div>
                  <div className="mt-2 font-display text-3xl font-bold tabular-nums">
                    {formatCredits(account?.balance ?? STARTING_BALANCE)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">unspent, ready to trade</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="text-sm text-muted-foreground">Open positions</div>
                  <div className="mt-2 font-display text-3xl font-bold tabular-nums">{openPositions.length}</div>
                  <div className="mt-1 text-xs text-muted-foreground">across {account?.marketsTraded.size ?? 0} markets traded</div>
                </CardContent>
              </Card>
            </div>

            {/* Open positions */}
            <div className="mt-10">
              <h2 className="font-display text-xl font-bold">Open positions</h2>
              {openPositions.length === 0 ? (
                <Card className="mt-4 border-dashed">
                  <CardContent className="px-8 py-10 text-center text-muted-foreground">
                    No open positions yet — browse the{' '}
                    <Link to="/" className="font-medium text-foreground underline underline-offset-4">
                      markets
                    </Link>{' '}
                    and make your first trade.
                  </CardContent>
                </Card>
              ) : (
                <div className="mt-4 space-y-3">
                  {openPositions.map(({ position, state }) => {
                    const stats = positionStats(state, position);
                    return (
                      <Card key={position.market}>
                        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                          <div className="min-w-0 flex-1">
                            <Link
                              to={marketPath(state.market)}
                              className="font-semibold hover:text-primary hover:underline"
                            >
                              {state.market.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {position.yesShares > 0 && (
                                <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                                  {formatCredits(position.yesShares)} YES · avg {formatCents(position.yesShares ? position.yesCostBasis / position.yesShares : 0)}
                                </Chip>
                              )}
                              {position.noShares > 0 && (
                                <Chip className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
                                  {formatCredits(position.noShares)} NO · avg {formatCents(position.noShares ? position.noCostBasis / position.noShares : 0)}
                                </Chip>
                              )}
                              <MarketStatusChip state={state} />
                            </div>
                          </div>
                          <div className="flex items-center gap-8 sm:justify-end">
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Value</div>
                              <div className="font-semibold tabular-nums">{formatCredits(stats.value)} cr</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">P&L</div>
                              <Pnl value={stats.pnl} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Resolved */}
            {resolvedPositions.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl font-bold">Resolved markets</h2>
                <Card className="mt-4">
                  <CardContent className="p-0">
                    <ul className="divide-y">
                      {resolvedPositions.map((rp) => {
                        const state = ledger.markets.get(rp.market);
                        return (
                          <li key={`${rp.market}-${rp.closedAt}`} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                            <Link
                              to={state ? marketPath(state.market) : '#'}
                              className="min-w-0 flex-1 truncate font-medium hover:underline"
                            >
                              {state?.market.title ?? 'Market'}
                            </Link>
                            <Chip
                              className={cn(
                                'shrink-0',
                                rp.outcome === 'yes'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                                  : rp.outcome === 'no'
                                    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400'
                                    : 'border-border bg-muted text-muted-foreground',
                              )}
                            >
                              {rp.outcome.toUpperCase()}
                            </Chip>
                            <Pnl value={rp.profit} className="shrink-0" />
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Trade history */}
            <div className="mt-10">
              <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
                <History className="size-5 text-muted-foreground" />
                Trade history
              </h2>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Your last {myTrades.length} trades</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {myTrades.length === 0 ? (
                    <p className="px-6 pb-6 text-sm text-muted-foreground">No trades yet.</p>
                  ) : (
                    <ul className="divide-y">
                      {myTrades.map((trade) => {
                        const state = ledger.markets.get(trade.market);
                        return (
                          <li key={trade.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                            <span className="text-muted-foreground">
                              {trade.action === 'buy' ? 'Bought' : 'Sold'}{' '}
                              <span className={cn('font-semibold', trade.side === 'yes' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                {trade.shares} {trade.side.toUpperCase()}
                              </span>{' '}
                              on{' '}
                              {state ? (
                                <Link to={marketPath(state.market)} className="font-medium text-foreground hover:underline">
                                  {state.market.title}
                                </Link>
                              ) : (
                                'a market'
                              )}{' '}
                              {trade.action === 'buy' ? (
                                <>for {formatCredits(trade.credits)} cr</>
                              ) : (
                                <>for {formatCredits(-trade.credits)} cr</>
                              )}
                            </span>
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                              {formatRelative(trade.createdAt)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
