import { useSeoMeta } from '@unhead/react';
import { Lock, ShieldCheck } from 'lucide-react';

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RelayListManager } from '@/components/RelayListManager';
import { UserChip } from '@/components/market/UserChip';
import { ADMIN_PUBKEYS } from '@/lib/market/constants';

export default function Settings() {
  useSeoMeta({
    title: 'Settings — Team Oracle',
    description: 'Manage your relays and see the admin list.',
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="container flex-1 py-10">
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_380px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relays</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                All markets, trades, and balances live on the relays in this list. If you're
                signed in, changes also publish to your NIP-65 relay list.
              </p>
              <RelayListManager />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-indigo-200 bg-indigo-50/60 dark:border-indigo-500/30 dark:bg-indigo-500/10">
              <CardContent className="flex gap-3 p-5 text-sm">
                <Lock className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <div className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Going private:</span> run a
                  private relay for your company (e.g. strfry with an allowlist), then have each
                  employee add it here and remove the public relays. Market data will then only
                  flow through your infrastructure.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2 text-base">
                  <ShieldCheck className="size-4 text-primary" />
                  Market admins
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  These team leads can create markets and resolve them (alongside each market's
                  creator).
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
