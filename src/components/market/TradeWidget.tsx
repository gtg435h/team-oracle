import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useMarketActions } from '@/hooks/useMarketActions';
import { toast } from '@/hooks/useToast';
import { MIN_TRADE_COST, PAYOUT_PER_SHARE, STARTING_BALANCE } from '@/lib/market/constants';
import { maxBuyShares, minBuyShares, priceYes, round2, tradeCost } from '@/lib/market/amm';
import { marketStatus } from '@/lib/market/ledger';
import { formatCents, formatCredits } from '@/lib/market/format';
import type { Account, MarketState, TradeAction, TradeSide } from '@/lib/market/types';
import { cn } from '@/lib/utils';

interface TradeWidgetProps {
  state: MarketState;
  account: Account | undefined;
}

const SIDE_CLASSES = {
  yes: {
    active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  no: {
    active: 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/30 dark:bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
  },
} as const;

/** Buy/sell YES/NO shares at the live LMSR price. */
export function TradeWidget({ state, account }: TradeWidgetProps) {
  const { user } = useCurrentUser();
  const { placeTrade } = useMarketActions();

  const [action, setAction] = useState<TradeAction>('buy');
  const [side, setSide] = useState<TradeSide>('yes');
  const [sharesStr, setSharesStr] = useState('10');
  const [busy, setBusy] = useState(false);

  const { market } = state;
  const b = market.liquidityB;
  const pYes = priceYes(state.qYes, state.qNo, b);
  const status = marketStatus(state);
  const tradable = status === 'open' || status === 'closing-soon';
  const balance = user ? account?.balance ?? STARTING_BALANCE : 0;

  const position = account?.positions.get(market.address);
  const held = side === 'yes' ? position?.yesShares ?? 0 : position?.noShares ?? 0;

  const shares = Math.max(0, Math.floor(Number(sharesStr.replace(/[^0-9]/g, '')) || 0));

  const cost = useMemo(() => {
    // Signed: positive = trader pays (buy), negative = trader receives (sell).
    if (shares <= 0) return 0;
    const dYes = side === 'yes' ? (action === 'buy' ? shares : -shares) : 0;
    const dNo = side === 'no' ? (action === 'buy' ? shares : -shares) : 0;
    return round2(tradeCost(state.qYes, state.qNo, b, dYes, dNo));
  }, [shares, side, action, state.qYes, state.qNo, b]);

  const maxShares = action === 'buy' ? maxBuyShares(state.qYes, state.qNo, b, side, balance) : held;
  const minShares = action === 'buy' ? minBuyShares(state.qYes, state.qNo, b, side, MIN_TRADE_COST) : 1;

  const dYes = side === 'yes' ? (action === 'buy' ? shares : -shares) : 0;
  const dNo = side === 'no' ? (action === 'buy' ? shares : -shares) : 0;
  const newPrice = shares > 0 ? priceYes(state.qYes + dYes, state.qNo + dNo, b) : pYes;

  let error: string | null = null;
  if (user && tradable) {
    if (action === 'buy' && shares > 0 && shares < minShares) {
      error = `Minimum buy is ${minShares} share${minShares === 1 ? '' : 's'} on this side.`;
    } else if (action === 'buy' && shares > maxShares) {
      error = maxShares === 0
        ? `Price is capped — you can't buy ${side.toUpperCase()} right now.`
        : `Max ${formatCredits(maxShares)} shares with your balance.`;
    } else if (action === 'sell' && shares > held) {
      error = `You only hold ${held} ${side.toUpperCase()} share${held === 1 ? '' : 's'}.`;
    } else if (action === 'sell' && held === 0) {
      error = `You hold no ${side.toUpperCase()} shares to sell.`;
    }
  }

  const canSubmit = Boolean(user) && tradable && shares > 0 && !error && !busy;

  async function onTrade() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await placeTrade(market, { side, action, shares, credits: cost });
      toast({
        title:
          action === 'buy'
            ? `Bought ${shares} ${side.toUpperCase()}`
            : `Sold ${shares} ${side.toUpperCase()}`,
        description:
          action === 'buy'
            ? `Paid ${formatCredits(cost)} credits at ~${formatCents(Math.abs(cost) / shares)} per share.`
            : `Received ${formatCredits(-cost)} credits.`,
      });
    } catch (err) {
      toast({
        title: 'Trade failed',
        description: err instanceof Error ? err.message : 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  const setShares = (n: number) => setSharesStr(String(Math.max(0, Math.floor(n))));

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Trade</h3>
          {user && (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wallet className="size-3.5" />
              <span className="font-medium tabular-nums text-foreground">{formatCredits(balance)}</span>
              cr
            </span>
          )}
        </div>

        {!user ? (
          <div className="space-y-3 py-2 text-center">
            <p className="text-sm text-muted-foreground">
              Join with a Nostr account to trade. You'll start with{' '}
              {formatCredits(STARTING_BALANCE)} play credits.
            </p>
            <LoginArea className="w-full [&>button]:w-full" />
          </div>
        ) : !tradable ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {status === 'resolved'
              ? 'This market has resolved — trading is closed.'
              : 'Trading has closed on this market. Awaiting resolution.'}
          </p>
        ) : (
          <>
            <Tabs value={action} onValueChange={(v) => setAction(v as TradeAction)}>
              <TabsList className="w-full">
                <TabsTrigger value="buy" className="flex-1">Buy</TabsTrigger>
                <TabsTrigger value="sell" className="flex-1">Sell</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pick a side">
              {(['yes', 'no'] as const).map((s) => {
                const selected = side === s;
                const price = s === 'yes' ? pYes : PAYOUT_PER_SHARE - pYes;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    aria-pressed={selected}
                    className={cn(
                      'flex flex-col items-center gap-0.5 rounded-xl border p-3 transition-all outline-none',
                      'hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/40',
                      selected ? SIDE_CLASSES[s].active : 'border-border bg-card',
                    )}
                  >
                    <span className={cn('text-sm font-semibold', SIDE_CLASSES[s].text)}>{s.toUpperCase()}</span>
                    <span className="font-display text-2xl font-bold tabular-nums">{formatCents(price)}</span>
                    <span className="text-[11px] text-muted-foreground">per share</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="trade-shares" className="text-sm font-medium">
                  Shares
                </label>
                <div className="flex gap-1">
                  {[10, 50, 100].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-full px-2.5 text-xs"
                      onClick={() => setShares(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2.5 text-xs"
                    disabled={maxShares < 1}
                    onClick={() => setShares(maxShares)}
                  >
                    Max
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0 rounded-lg"
                  aria-label="One fewer share"
                  disabled={shares <= 0}
                  onClick={() => setShares(shares - 1)}
                >
                  −
                </Button>
                <Input
                  id="trade-shares"
                  inputMode="numeric"
                  className="h-9 text-center font-display text-lg tabular-nums"
                  value={sharesStr}
                  onChange={(e) => setSharesStr(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => setShares(shares)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0 rounded-lg"
                  aria-label="One more share"
                  onClick={() => setShares(shares + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            {shares > 0 && (
              <div className="space-y-1.5 rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{action === 'buy' ? 'You pay' : 'You receive'}</span>
                  <span className="font-semibold tabular-nums">
                    {formatCredits(action === 'buy' ? cost : -cost)} cr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg price</span>
                  <span className="tabular-nums">{formatCents(Math.abs(cost) / shares)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price after</span>
                  <span className="tabular-nums">{formatCents(newPrice)}</span>
                </div>
              </div>
            )}

            <Button
              className="w-full font-semibold"
              size="lg"
              disabled={!canSubmit}
              onClick={onTrade}
            >
              {busy ? 'Placing trade…' : `${action === 'buy' ? 'Buy' : 'Sell'} ${shares || '…'} ${side.toUpperCase()}`}
            </Button>

            {error && <p className="text-center text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
