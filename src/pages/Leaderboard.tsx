import { useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Crown, Trophy } from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserChip } from '@/components/market/UserChip';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLedger } from '@/hooks/useLedger';
import { netWorth } from '@/lib/market/ledger';
import { STARTING_BALANCE } from '@/lib/market/constants';
import { formatCredits } from '@/lib/market/format';
import { cn } from '@/lib/utils';

interface Row {
  pubkey: string;
  worth: number;
  balance: number;
  trades: number;
  markets: number;
}

export default function Leaderboard() {
  useSeoMeta({
    title: 'Leaderboard — Team Oracle',
    description: 'Rank every forecaster by total net worth in play credits.',
  });

  const { ledger, isPending } = useLedger();
  const { user } = useCurrentUser();

  const rows = useMemo<Row[]>(() => {
    if (!ledger) return [];
    return [...ledger.accounts.values()]
      .filter((a) => a.tradeCount > 0)
      .map((a) => ({
        pubkey: a.pubkey,
        worth: netWorth(ledger, a.pubkey),
        balance: a.balance,
        trades: a.tradeCount,
        markets: a.marketsTraded.size,
      }))
      .sort((a, b) => b.worth - a.worth);
  }, [ledger]);

  const myIndex = user ? rows.findIndex((r) => r.pubkey === user.pubkey) : -1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="container flex-1 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="inline-flex items-center gap-3 font-display text-3xl font-bold tracking-tight">
              <Trophy className="size-8 text-amber-500" />
              Leaderboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Ranked by net worth — available credits plus the value of every open position.
              Everyone starts with {formatCredits(STARTING_BALANCE)} cr.
            </p>
          </div>
          {user && myIndex >= 0 && (
            <div className="rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium">
              You're <span className="font-bold text-primary">#{myIndex + 1}</span> of {rows.length}
            </div>
          )}
          {user && myIndex < 0 && rows.length > 0 && (
            <div className="rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              Make your first trade to enter the rankings
            </div>
          )}
        </div>

        <div className="mt-8">
          {isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="px-8 py-14 text-center text-muted-foreground">
                No traders yet — once people start trading, the sharpest forecasters appear here.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Forecaster</TableHead>
                      <TableHead className="text-right">Net worth</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Available</TableHead>
                      <TableHead className="hidden text-right md:table-cell">Trades</TableHead>
                      <TableHead className="hidden text-right md:table-cell">Markets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => {
                      const isMe = user && row.pubkey === user.pubkey;
                      const podium = i < 3;
                      return (
                        <TableRow key={row.pubkey} className={cn(isMe && 'bg-primary/5')}>
                          <TableCell className="font-semibold tabular-nums">
                            {podium ? (
                              <span
                                className={cn(
                                  'inline-flex size-8 items-center justify-center rounded-full font-bold',
                                  i === 0 && 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
                                  i === 1 && 'bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
                                  i === 2 && 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
                                )}
                                aria-label={`Rank ${i + 1}`}
                              >
                                {i === 0 ? <Crown className="size-4" /> : i + 1}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{i + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-64">
                            <UserChip pubkey={row.pubkey} />
                            {isMe && (
                              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                You
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCredits(row.worth)} cr
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                            {formatCredits(row.balance)} cr
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                            {row.trades}
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                            {row.markets}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
