import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { ArrowLeft, Clock } from 'lucide-react';

import NotFound from './NotFound';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Chip } from '@/components/market/Chip';
import { MarketStatusChip } from '@/components/market/MarketStatusChip';
import { PriceChart } from '@/components/market/PriceChart';
import { TradeWidget } from '@/components/market/TradeWidget';
import { PositionCard } from '@/components/market/PositionCard';
import { ResolveSection } from '@/components/market/ResolveSection';
import { ActivityFeed } from '@/components/market/ActivityFeed';
import { UserChip } from '@/components/market/UserChip';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLedger } from '@/hooks/useLedger';
import { marketStatus } from '@/lib/market/ledger';
import { MARKET_KIND } from '@/lib/market/constants';
import { priceYes } from '@/lib/market/amm';
import { formatCents, formatCompact, formatDate, formatTimeLeft } from '@/lib/market/format';
import type { MarketState } from '@/lib/market/types';

export default function MarketPage() {
  const { naddr } = useParams<{ naddr: string }>();
  const { ledger, isPending } = useLedger();
  const { user } = useCurrentUser();

  const address = useMemo<string | null>(() => {
    if (!naddr) return null;
    try {
      const decoded = nip19.decode(naddr);
      if (decoded.type === 'naddr' && decoded.data.kind === MARKET_KIND) {
        return `${decoded.data.kind}:${decoded.data.pubkey}:${decoded.data.identifier}`;
      }
    } catch {
      // fall through to null
    }
    return null;
  }, [naddr]);

  const state: MarketState | undefined = address ? ledger?.markets.get(address) : undefined;
  const account = user ? ledger?.accounts.get(user.pubkey) : undefined;
  const position = state && account ? account.positions.get(state.market.address) : undefined;

  const marketTrades = useMemo(() => {
    if (!ledger || !address) return [];
    return ledger.validTrades.filter((t) => t.market === address).reverse();
  }, [ledger, address]);

  useSeoMeta({
    title: state ? `${state.market.title} — Team Oracle` : 'Market — Team Oracle',
    description: state?.market.description || 'Trade the outcome of this company market.',
  });

  const market = state?.market;
  const pYes = state ? priceYes(state.qYes, state.qNo, market!.liquidityB) : 50;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="container flex-1 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Markets
        </Link>

        {isPending ? (
          <div className="mt-6 space-y-6">
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="h-12 w-3/4" />
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <Skeleton className="h-96 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" />
            </div>
          </div>
        ) : !state || !market ? (
          <div className="mt-6">
            <NotFound />
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-4">
              <MarketStatusChip state={state} />

              <h1 className="max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {market.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  by <UserChip pubkey={market.pubkey} size="sm" />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {marketStatus(state) === 'resolved'
                    ? `closed ${formatDate(state.resolution!.createdAt)}`
                    : `closes ${formatDate(market.closeDate)} · ${formatTimeLeft(market.closeDate)}`}
                </span>
                {market.tags.map((t) => (
                  <Chip key={t} className="border-border/80 bg-muted/60 text-muted-foreground">
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          YES
                        </div>
                        <div className="font-display text-4xl font-bold tabular-nums leading-none">
                          {formatCents(state.resolution?.outcome === 'yes' ? 100 : state.resolution?.outcome === 'no' ? 0 : pYes)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                          NO
                        </div>
                        <div className="font-display text-4xl font-bold tabular-nums leading-none text-muted-foreground">
                          {formatCents(state.resolution?.outcome === 'no' ? 100 : state.resolution?.outcome === 'yes' ? 0 : 100 - pYes)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5">
                      <PriceChart points={state.history} />
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-4 border-t pt-4 text-sm">
                      <div>
                        <div className="font-semibold tabular-nums">{formatCompact(state.volume)} cr</div>
                        <div className="text-xs text-muted-foreground">volume</div>
                      </div>
                      <div>
                        <div className="font-semibold tabular-nums">{state.tradeCount}</div>
                        <div className="text-xs text-muted-foreground">trades</div>
                      </div>
                      <div>
                        <div className="font-semibold tabular-nums">{state.traderCount}</div>
                        <div className="text-xs text-muted-foreground">traders</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {market.description && (
                  <Card>
                    <CardContent className="p-5">
                      <h2 className="mb-2 text-sm font-semibold">Description</h2>
                      <p className="whitespace-pre-line text-muted-foreground">{market.description}</p>
                    </CardContent>
                  </Card>
                )}

                <ActivityFeed trades={marketTrades} />
              </div>

              <div className="space-y-6 lg:sticky lg:top-20">
                <TradeWidget state={state} account={account} />
                {position && <PositionCard state={state} position={position} />}
                <ResolveSection state={state} />
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
