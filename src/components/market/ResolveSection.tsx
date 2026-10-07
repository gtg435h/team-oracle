import { useState } from 'react';
import { Gavel, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { UserChip } from './UserChip';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMarketActions } from '@/hooks/useMarketActions';
import { toast } from '@/hooks/useToast';
import { isAdmin } from '@/lib/market/constants';
import { marketStatus } from '@/lib/market/ledger';
import { formatDate } from '@/lib/market/format';
import type { MarketOutcome, MarketState } from '@/lib/market/types';
import { cn } from '@/lib/utils';

const OUTCOMES: { value: MarketOutcome; label: string; description: string; className: string }[] = [
  {
    value: 'yes',
    label: 'YES',
    description: 'The outcome happened. YES shares pay 100¢.',
    className: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-500/30',
  },
  {
    value: 'no',
    label: 'NO',
    description: 'The outcome did not happen. NO shares pay 100¢.',
    className: 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 ring-2 ring-rose-500/30',
  },
  {
    value: 'void',
    label: 'VOID',
    description: 'Undeterminable. Every share pays 50¢.',
    className: 'border-muted-foreground/50 bg-muted/60 ring-2 ring-muted-foreground/20',
  },
];

/** Resolution banner + resolve dialog (admins and market creators only). */
export function ResolveSection({ state }: { state: MarketState }) {
  const { user } = useCurrentUser();
  const { resolveMarket } = useMarketActions();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<MarketOutcome | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const { market } = state;
  const status = marketStatus(state);
  const resolution = state.resolution;
  const authorized = Boolean(user && (isAdmin(user.pubkey) || user.pubkey === market.pubkey));

  async function onResolve() {
    if (!outcome) return;
    setBusy(true);
    try {
      await resolveMarket(market, outcome, note);
      toast({ title: `Market resolved ${outcome.toUpperCase()}`, description: 'Payouts have been applied.' });
      setOpen(false);
      setOutcome(null);
      setNote('');
    } catch (err) {
      toast({
        title: 'Failed to resolve',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  if (resolution) {
    return (
      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Gavel className="size-4 text-muted-foreground" />
            Resolved {resolution.outcome.toUpperCase()} on {formatDate(resolution.createdAt)}
          </div>
          <div className="text-sm text-muted-foreground">
            by <UserChip pubkey={resolution.pubkey} size="sm" />
          </div>
          {resolution.note && (
            <p className="rounded-lg bg-muted/50 p-3 text-sm">{resolution.note}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!authorized) {
    if (status === 'closed') {
      return (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Trading closed {formatDate(market.closeDate)} — awaiting resolution.
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <Card>
      <CardContent className="p-5">
        {status === 'closed' ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Trading closed {formatDate(market.closeDate)} — resolve this market to pay out shares.
          </p>
        ) : null}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Gavel className="size-4" />
              Resolve market
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Resolve “{market.title}”</DialogTitle>
              <DialogDescription>
                Pick the outcome. Winners receive 100¢ per share; void refunds 50¢ per share on
                either side. This can be corrected later by publishing a new resolution.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  aria-pressed={outcome === o.value}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-all outline-none hover:bg-muted/50',
                    'focus-visible:ring-[3px] focus-visible:ring-ring/40',
                    outcome === o.value ? o.className : 'border-border',
                  )}
                >
                  <span className="font-semibold">{o.label}</span>
                  <span className="block text-xs text-muted-foreground">{o.description}</span>
                </button>
              ))}
            </div>

            <Textarea
              placeholder="Optional resolution note (e.g. shipped on Oct 1)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={onResolve} disabled={!outcome || busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Resolve {outcome ? outcome.toUpperCase() : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
