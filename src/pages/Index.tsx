import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ArrowLeftRight, CheckCircle2, Gavel, Lock, Plus, Search, TrendingUp, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MarketCard } from '@/components/market/MarketCard';
import { Chip } from '@/components/market/Chip';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLedger } from '@/hooks/useLedger';
import { isAdmin } from '@/lib/market/constants';
import { marketStatus } from '@/lib/market/ledger';
import { formatCompact } from '@/lib/market/format';
import { cn } from '@/lib/utils';

type SortKey = 'active' | 'newest' | 'soonest' | 'volume';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'active', label: 'Most active' },
  { value: 'newest', label: 'Newest' },
  { value: 'soonest', label: 'Ending soon' },
  { value: 'volume', label: 'Highest volume' },
];

function MarketCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex gap-6 border-t pt-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Index() {
  useSeoMeta({
    title: 'Team Oracle — company prediction markets',
    description:
      'Trade the outcomes of company initiatives with play credits. Kalshi-style prediction markets for your team.',
  });

  const { ledger, isPending } = useLedger();
  const { user } = useCurrentUser();
  const admin = isAdmin(user?.pubkey);

  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('active');

  const states = ledger ? [...ledger.markets.values()] : [];

  const openStates = states.filter((s) => {
    const status = marketStatus(s);
    return status === 'open' || status === 'closing-soon';
  });
  const resolvedStates = states
    .filter((s) => s.resolution)
    .sort((a, b) => b.resolution!.createdAt - a.resolution!.createdAt)
    .slice(0, 6);

  const allTags = (() => {
    const counts = new Map<string, number>();
    for (const s of openStates) {
      for (const t of s.market.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  })();

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    const list = openStates.filter((s) => {
      if (tag !== 'all' && !s.market.tags.includes(tag)) return false;
      if (q && !s.market.title.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'newest':
          return b.market.createdAt - a.market.createdAt;
        case 'soonest':
          return a.market.closeDate - b.market.closeDate;
        case 'volume':
          return b.volume - a.volume;
        default:
          return b.tradeCount - a.tradeCount;
      }
    });
  })();

  const traderCount = ledger
    ? [...ledger.accounts.values()].filter((a) => a.tradeCount > 0).length
    : 0;

  const stats = [
    { icon: TrendingUp, value: String(openStates.length), label: 'Open markets' },
    { icon: Users, value: String(traderCount), label: 'Traders' },
    { icon: ArrowLeftRight, value: formatCompact(ledger?.totalVolume ?? 0), label: 'Credits traded' },
    { icon: CheckCircle2, value: String(states.filter((s) => s.resolution).length), label: 'Resolved' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-indigo-50 via-background to-background dark:from-indigo-950/40 dark:via-background dark:to-background">
          <div
            className="pointer-events-none absolute -top-24 right-0 size-96 rounded-full bg-indigo-400/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="container relative py-12 sm:py-16">
            <Chip className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
              Company forecast market · play credits only
            </Chip>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              What does the team{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                really think
              </span>{' '}
              will happen?
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Buy YES or NO shares on company initiatives and let the live price reveal your
              team's collective forecast. Sharpest forecasters top the leaderboard.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border bg-card/60 p-4 backdrop-blur-sm">
                  <s.icon className="size-4 text-primary" />
                  <div className="mt-2 font-display text-2xl font-bold tabular-nums">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            {admin && (
              <Button asChild size="lg" className="mt-8 gap-2 rounded-full px-6 font-semibold">
                <Link to="/create">
                  <Plus className="size-4.5" />
                  Create a market
                </Link>
              </Button>
            )}
          </div>
        </section>

        {/* Markets */}
        <section className="container py-10">
          {!user ? (
            /* ── Logged-out gate ── */
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center px-8 py-16 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                  <Lock className="size-6 text-muted-foreground" />
                </div>
                <h2 className="mt-5 font-display text-xl font-bold tracking-tight">
                  Sign in to see markets
                </h2>
                <p className="mt-2 max-w-sm text-muted-foreground">
                  Team Oracle is for employees only. Sign in with your Nostr key to browse and trade on open markets.
                </p>
                <LoginArea className="mt-6 max-w-xs w-full" />
              </CardContent>
            </Card>
          ) : (
            /* ── Logged-in markets view ── */
            <>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <h2 className="font-display text-2xl font-bold tracking-tight">Open markets</h2>
                  <div className="sm:ml-auto flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search markets…"
                        className="w-full pl-9 sm:w-64"
                        aria-label="Search markets"
                      />
                    </div>
                    <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                      <SelectTrigger className="w-full sm:w-44" aria-label="Sort markets">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORTS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by tag">
                    <button type="button" onClick={() => setTag('all')}>
                      <Chip
                        className={cn(
                          'cursor-pointer transition-colors',
                          tag === 'all'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted',
                        )}
                      >
                        All
                      </Chip>
                    </button>
                    {allTags.map((t) => (
                      <button key={t} type="button" onClick={() => setTag(t)}>
                        <Chip
                          className={cn(
                            'cursor-pointer transition-colors',
                            tag === t
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-card text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {t}
                        </Chip>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6">
                {isPending ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }, (_, i) => (
                      <MarketCardSkeleton key={i} />
                    ))}
                  </div>
                ) : states.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="px-8 py-14 text-center">
                      <p className="mx-auto max-w-sm text-muted-foreground">
                        No markets yet.{' '}
                        {admin
                          ? 'Create the first market and let the forecasts roll in.'
                          : "Team leads haven't posted any questions yet — check back soon."}
                      </p>
                      {admin && (
                        <Button asChild className="mt-4 gap-2 rounded-full">
                          <Link to="/create">
                            <Plus className="size-4" />
                            Create the first market
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : filtered.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="px-8 py-14 text-center">
                      <p className="mx-auto max-w-sm text-muted-foreground">
                        No open markets match. Try clearing the search or picking another tag.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((state) => (
                      <MarketCard key={state.market.address} state={state} />
                    ))}
                  </div>
                )}
              </div>

              {/* Recently resolved */}
              {resolvedStates.length > 0 && (
                <div className="mt-12">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-2xl font-bold tracking-tight">Recently resolved</h2>
                  </div>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {resolvedStates.map((state) => (
                      <MarketCard key={state.market.address} state={state} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* How it works */}
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: Plus,
                title: 'Team leads post questions',
                body: 'Admins create markets like “Will Project Falcon ship by Oct 31?” with a close date.',
              },
              {
                icon: TrendingUp,
                title: 'Everyone trades',
                body: 'Buy YES or NO shares with play credits. The live price (in ¢) is the crowd’s forecast.',
              },
              {
                icon: Gavel,
                title: 'Winners get paid',
                body: 'When the market resolves, winning shares pay 100¢. Climb the leaderboard by forecasting well.',
              },
            ].map((s) => (
              <Card key={s.title} className="bg-muted/30">
                <CardContent className="p-5">
                  <s.icon className="size-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
