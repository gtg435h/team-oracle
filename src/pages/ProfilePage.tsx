import { useMemo, useState } from 'react';
import { nip19 } from 'nostr-tools';
import { Copy, ExternalLink, Globe, Pencil, ShieldCheck } from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EditProfileForm } from '@/components/EditProfileForm';
import { MarketCard } from '@/components/market/MarketCard';
import { Chip } from '@/components/market/Chip';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLedger } from '@/hooks/useLedger';
import { isAdmin } from '@/lib/market/constants';
import { netWorth } from '@/lib/market/ledger';
import { marketPath } from '@/lib/market/links';
import { STARTING_BALANCE } from '@/lib/market/constants';
import { formatCredits, formatRelative, formatSignedCredits } from '@/lib/market/format';
import { displayName, initials } from '@/lib/market/users';
import { sanitizeUrl } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface ProfilePageProps {
  pubkey: string;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast({ title: `${label} copied`, description: text.slice(0, 40) + (text.length > 40 ? '…' : '') });
  });
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center">
      <div className="font-display text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      {sub && <div className="mt-1 text-xs font-medium text-primary">{sub}</div>}
    </div>
  );
}

export function ProfilePage({ pubkey }: ProfilePageProps) {
  const author = useAuthor(pubkey);
  const { user } = useCurrentUser();
  const { ledger } = useLedger();
  const [editOpen, setEditOpen] = useState(false);

  const isMe = user?.pubkey === pubkey;
  const metadata = author.data?.metadata;
  const isPending = author.isPending;

  const name = displayName(metadata, pubkey);
  const picture = sanitizeUrl(metadata?.picture);
  const banner = sanitizeUrl(metadata?.banner);
  const website = sanitizeUrl(metadata?.website);
  const npub = nip19.npubEncode(pubkey);
  const admin = isAdmin(pubkey);

  // Ledger stats for this user
  const account = ledger?.accounts.get(pubkey);
  const worth = ledger ? netWorth(ledger, pubkey) : STARTING_BALANCE;
  const totalPnl = worth - STARTING_BALANCE;
  const openPositions = account
    ? [...account.positions.values()].filter((p) => p.yesShares + p.noShares > 0).length
    : 0;

  // Markets this user created
  const createdMarkets = useMemo(() => {
    if (!ledger) return [];
    return [...ledger.markets.values()]
      .filter((s) => s.market.pubkey === pubkey)
      .sort((a, b) => b.market.createdAt - a.market.createdAt)
      .slice(0, 6);
  }, [ledger, pubkey]);

  // Recent trades by this user
  const recentTrades = useMemo(() => {
    if (!ledger) return [];
    return ledger.validTrades
      .filter((t) => t.pubkey === pubkey)
      .reverse()
      .slice(0, 5);
  }, [ledger, pubkey]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Banner */}
        <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 sm:h-48">
          {banner && (
            <img
              src={banner}
              alt=""
              className="size-full object-cover"
              aria-hidden="true"
            />
          )}
          <div className="absolute inset-0 bg-black/10" aria-hidden="true" />
        </div>

        <div className="container">
          {/* Avatar row */}
          <div className="relative flex flex-wrap items-end justify-between gap-4 pb-4">
            <div className="-mt-12 sm:-mt-16">
              {isPending ? (
                <Skeleton className="size-24 rounded-full ring-4 ring-background sm:size-32" />
              ) : (
                <Avatar className="size-24 rounded-full ring-4 ring-background sm:size-32">
                  {picture && <AvatarImage src={picture} alt={name} />}
                  <AvatarFallback className="text-3xl font-bold sm:text-4xl">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            <div className="flex items-center gap-2 py-2">
              {isMe && (
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-full">
                      <Pencil className="size-3.5" />
                      Edit profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Edit profile</DialogTitle>
                    </DialogHeader>
                    <EditProfileForm />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Name + meta */}
          <div className="space-y-3">
            {isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {name}
                  </h1>
                  {admin && (
                    <Chip className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <ShieldCheck className="size-3" />
                      Admin
                    </Chip>
                  )}
                </div>

                {metadata?.about && (
                  <p className="max-w-2xl text-muted-foreground">{metadata.about}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {/* npub */}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(npub, 'npub')}
                    className="group inline-flex items-center gap-1.5 rounded-md font-mono text-xs transition-colors hover:text-foreground"
                    title="Click to copy npub"
                  >
                    <span className="truncate max-w-48 sm:max-w-64">{npub}</span>
                    <Copy className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>

                  {/* hex pubkey */}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(pubkey, 'Public key')}
                    className="group inline-flex items-center gap-1.5 rounded-md font-mono text-xs transition-colors hover:text-foreground"
                    title="Click to copy hex pubkey"
                  >
                    <span className="truncate max-w-28">{pubkey.slice(0, 12)}…</span>
                    <Copy className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>

                  {metadata?.nip05 && (
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-emerald-500" />
                      {metadata.nip05}
                    </span>
                  )}

                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                    >
                      <Globe className="size-3.5" />
                      {website.replace(/^https?:\/\//, '')}
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </>
            )}
          </div>

          <Separator className="my-6" />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Net worth"
              value={`${formatCredits(worth)} cr`}
              sub={
                totalPnl !== 0
                  ? `${totalPnl > 0 ? '+' : ''}${formatCredits(totalPnl)} cr`
                  : undefined
              }
            />
            <StatCard label="Trades made" value={String(account?.tradeCount ?? 0)} />
            <StatCard label="Markets traded" value={String(account?.marketsTraded.size ?? 0)} />
            <StatCard label="Open positions" value={String(openPositions)} />
          </div>

          <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_340px]">
            {/* Created markets */}
            {(admin || createdMarkets.length > 0) && (
              <section>
                <h2 className="font-display text-xl font-bold">Markets created</h2>
                {createdMarkets.length === 0 ? (
                  <Card className="mt-4 border-dashed">
                    <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No markets created yet.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {createdMarkets.map((state) => (
                      <MarketCard key={state.market.address} state={state} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Sidebar: recent trades + resolved P&L */}
            <div className="space-y-6">
              {/* Recent trades */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent trades</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {recentTrades.length === 0 ? (
                    <p className="px-6 pb-6 text-sm text-muted-foreground">No trades yet.</p>
                  ) : (
                    <ul className="divide-y">
                      {recentTrades.map((trade) => {
                        const state = ledger?.markets.get(trade.market);
                        return (
                          <li key={trade.id} className="px-5 py-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  'font-semibold',
                                  trade.side === 'yes'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400',
                                )}
                              >
                                {trade.action === 'buy' ? 'Bought' : 'Sold'} {trade.shares}{' '}
                                {trade.side.toUpperCase()}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatRelative(trade.createdAt)}
                              </span>
                            </div>
                            {state && (
                              <a
                                href={marketPath(state.market)}
                                className="mt-0.5 block truncate text-xs text-muted-foreground hover:underline"
                              >
                                {state.market.title}
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Resolved P&L */}
              {account && account.resolvedPositions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resolved markets</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y">
                      {account.resolvedPositions.slice(0, 5).map((rp) => {
                        const state = ledger?.markets.get(rp.market);
                        return (
                          <li
                            key={`${rp.market}-${rp.closedAt}`}
                            className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">
                              {state?.market.title ?? 'Market'}
                            </span>
                            <span
                              className={cn(
                                'shrink-0 font-semibold tabular-nums',
                                rp.profit > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : rp.profit < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-muted-foreground',
                              )}
                            >
                              {formatSignedCredits(rp.profit)} cr
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="h-12" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
