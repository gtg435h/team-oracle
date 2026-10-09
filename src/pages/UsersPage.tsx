import { useEffect, useMemo, useRef, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Download, Shield, Users } from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chip } from '@/components/market/Chip';
import { UserChip } from '@/components/market/UserChip';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLedger } from '@/hooks/useLedger';
import { isAdmin, ADMIN_PUBKEYS } from '@/lib/market/constants';
import { formatRelative } from '@/lib/market/format';
import { toast } from '@/hooks/useToast';

const SEEN_USERS_KEY = 'oracle:seen-users';

function getSeenUsers(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_USERS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeenUsers(pubkeys: Set<string>) {
  try {
    localStorage.setItem(SEEN_USERS_KEY, JSON.stringify([...pubkeys]));
  } catch {
    // ignore storage errors
  }
}

interface UserRow {
  pubkey: string;
  firstTradeAt: number;
  tradeCount: number;
  isNew: boolean;
}

export default function UsersPage() {
  useSeoMeta({
    title: 'User Registry — Team Oracle',
    description: 'All registered users — export pubkeys for relay whitelist.',
  });

  const { user } = useCurrentUser();
  const admin = isAdmin(user?.pubkey);
  const { ledger, isPending } = useLedger();

  // Track which pubkeys we've seen before to flag new arrivals.
  const [seenUsers, setSeenUsers] = useState<Set<string>>(getSeenUsers);
  const notifiedRef = useRef(false);

  const rows = useMemo<UserRow[]>(() => {
    if (!ledger) return [];

    // Collect first-trade timestamp per pubkey from validTrades.
    const firstTrade = new Map<string, number>();
    const tradeCounts = new Map<string, number>();
    for (const trade of ledger.validTrades) {
      const existing = firstTrade.get(trade.pubkey);
      if (existing === undefined || trade.createdAt < existing) {
        firstTrade.set(trade.pubkey, trade.createdAt);
      }
      tradeCounts.set(trade.pubkey, (tradeCounts.get(trade.pubkey) ?? 0) + 1);
    }

    return [...firstTrade.keys()]
      .map((pubkey) => ({
        pubkey,
        firstTradeAt: firstTrade.get(pubkey)!,
        tradeCount: tradeCounts.get(pubkey) ?? 0,
        isNew: !seenUsers.has(pubkey),
      }))
      .sort((a, b) => a.firstTradeAt - b.firstTradeAt);
  }, [ledger, seenUsers]);

  // Notify admin of any new users since they last visited, then mark all as seen.
  useEffect(() => {
    if (!admin || isPending || rows.length === 0 || notifiedRef.current) return;
    notifiedRef.current = true;

    const newUsers = rows.filter((r) => r.isNew);
    if (newUsers.length > 0) {
      toast({
        title: `${newUsers.length} new user${newUsers.length === 1 ? '' : 's'} registered`,
        description: `Add their pubkeys to your relay whitelist to grant access.`,
      });
    }

    // Mark all current users as seen.
    const updated = new Set([...seenUsers, ...rows.map((r) => r.pubkey)]);
    setSeenUsers(updated);
    saveSeenUsers(updated);
  }, [admin, isPending, rows, seenUsers]);

  // All pubkeys that need relay access: traders + admins.
  const allPubkeys = useMemo(() => {
    const set = new Set([...ADMIN_PUBKEYS, ...rows.map((r) => r.pubkey)]);
    return [...set];
  }, [rows]);

  function exportWhitelist() {
    const lines = allPubkeys.join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relay-whitelist.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Whitelist exported',
      description: `${allPubkeys.length} pubkeys saved to relay-whitelist.txt`,
    });
  }

  function copyWhitelist() {
    navigator.clipboard.writeText(allPubkeys.join('\n')).then(() => {
      toast({
        title: 'Copied to clipboard',
        description: `${allPubkeys.length} pubkeys copied.`,
      });
    });
  }

  const newCount = rows.filter((r) => r.isNew).length;

  if (!admin) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="container flex flex-1 items-center justify-center py-16">
          <Card className="border-dashed">
            <CardContent className="px-8 py-12 text-center">
              <Shield className="mx-auto mb-3 size-10 text-muted-foreground" />
              <h1 className="font-display text-2xl font-bold">Admins only</h1>
              <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
                The user registry is restricted to admins.
              </p>
              {!user && <LoginArea className="mt-6 w-full [&>button]:w-full" />}
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="inline-flex items-center gap-3 font-display text-3xl font-bold tracking-tight">
              <Users className="size-7 text-primary" />
              User Registry
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Every user who has placed a trade needs write access to{' '}
              <span className="font-mono text-sm text-foreground">
                nostr.honeypoocakes.net:50668
              </span>
              . Export this list and import it into your relay's pubkey whitelist.
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={copyWhitelist} disabled={allPubkeys.length === 0}>
              Copy pubkeys
            </Button>
            <Button className="gap-2" onClick={exportWhitelist} disabled={allPubkeys.length === 0}>
              <Download className="size-4" />
              Export whitelist
            </Button>
          </div>
        </div>

        {/* Summary chips */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Chip className="border-border bg-muted/50 text-muted-foreground">
            {allPubkeys.length} total pubkeys
          </Chip>
          <Chip className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
            {ADMIN_PUBKEYS.length} admin{ADMIN_PUBKEYS.length === 1 ? '' : 's'}
          </Chip>
          <Chip className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
            {rows.length} trader{rows.length === 1 ? '' : 's'}
          </Chip>
          {newCount > 0 && (
            <Chip className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              ✦ {newCount} new since last visit
            </Chip>
          )}
        </div>

        <div className="mt-6 space-y-8">
          {/* Traders table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Traders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isPending ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No trades yet — users will appear here once they make their first trade.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden sm:table-cell">Pubkey (hex)</TableHead>
                      <TableHead className="hidden md:table-cell text-right">Trades</TableHead>
                      <TableHead className="text-right">First trade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.pubkey}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserChip pubkey={row.pubkey} />
                            {row.isNew && (
                              <Chip className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 text-[10px]">
                                New
                              </Chip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="font-mono text-xs text-muted-foreground select-all">
                            {row.pubkey}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right tabular-nums text-muted-foreground">
                          {row.tradeCount}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatRelative(row.firstTradeAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Admins table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admins (always whitelisted)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Pubkey (hex)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ADMIN_PUBKEYS.map((pubkey) => (
                    <TableRow key={pubkey}>
                      <TableCell>
                        <UserChip pubkey={pubkey} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="font-mono text-xs text-muted-foreground select-all">
                          {pubkey}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* How to import */}
          <Card className="bg-muted/30">
            <CardContent className="p-5 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">How to apply the whitelist</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Click <strong>Export whitelist</strong> to download <code className="rounded bg-muted px-1">relay-whitelist.txt</code> — one hex pubkey per line.</li>
                <li>
                  On your strfry relay, add each pubkey to your whitelist policy or paste them
                  into your allowlist config and reload the relay.
                </li>
                <li>
                  Repeat whenever the <strong>New</strong> badge appears — you'll also see a
                  notification at the top of this page when you visit after a new user joins.
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
