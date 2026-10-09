import { useSeoMeta } from '@unhead/react';
import { Lock, ShieldCheck, Wifi } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RelayListManager } from '@/components/RelayListManager';
import { UserChip } from '@/components/market/UserChip';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAppContext } from '@/hooks/useAppContext';
import { isAdmin, ADMIN_PUBKEYS } from '@/lib/market/constants';

/** Read-only list of the configured relays shown to non-admins. */
function RelayReadOnlyList() {
  const { config } = useAppContext();
  const relays = config.relayMetadata.relays;

  return (
    <div className="space-y-2">
      {relays.map((relay) => (
        <div
          key={relay.url}
          className="flex items-center gap-3 rounded-md border bg-muted/20 p-3"
        >
          <Wifi className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-mono text-sm" title={relay.url}>
            {relay.url.replace(/^wss?:\/\//, '')}
          </span>
          <div className="flex shrink-0 gap-1.5 text-xs text-muted-foreground">
            {relay.read && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                read
              </span>
            )}
            {relay.write && (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
                write
              </span>
            )}
          </div>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted-foreground">
        Relay configuration is managed by your admins.
      </p>
    </div>
  );
}

export default function Settings() {
  useSeoMeta({
    title: 'Settings — Team Oracle',
    description: 'View relay configuration and the admin list.',
  });

  const { user } = useCurrentUser();
  const admin = isAdmin(user?.pubkey);

  // Non-admins have no business here — send them home silently.
  if (!admin) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="container flex-1 py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          {/* Relay section */}
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Wifi className="size-4 text-primary" />
                Relays
                {!admin && (
                  <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    <Lock className="size-3" />
                    Admin only
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {admin ? (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    All markets, trades, and balances flow through these relays. Changes
                    apply immediately for everyone connected to this app.
                  </p>
                  <RelayListManager />
                </>
              ) : (
                <RelayReadOnlyList />
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {admin && (
              <Card className="border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                <CardContent className="flex gap-3 p-5 text-sm">
                  <Lock className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-foreground">Going private:</span> spin
                    up a private relay (e.g. strfry with an allowlist), add it here, and
                    remove the public relays. Market data will only flow through your
                    infrastructure.
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-primary" />
                  Market admins
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  These team leads can create markets and resolve them (alongside each
                  market's creator).
                </p>
                <ul className="space-y-2">
                  {ADMIN_PUBKEYS.map((pubkey) => (
                    <li key={pubkey}>
                      <UserChip pubkey={pubkey} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
