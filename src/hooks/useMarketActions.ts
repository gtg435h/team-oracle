import { useQueryClient } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';

import { useNostrPublish } from './useNostrPublish';
import { oracleEventsKey } from './useLedger';
import { MARKET_KIND, RESOLUTION_KIND, TRADE_KIND } from '@/lib/market/constants';
import { round2 } from '@/lib/market/amm';
import type { MarketOutcome, Market, TradeAction, TradeSide } from '@/lib/market/types';

function slugify(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'market';
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export interface CreateMarketInput {
  title: string;
  description: string;
  tags: string[];
  /** Unix seconds — trading closes at this time. */
  closeDate: number;
  liquidityB: number;
}

export interface PlaceTradeInput {
  side: TradeSide;
  action: TradeAction;
  shares: number;
  /** Signed credits: positive = paid (buy), negative = received (sell). */
  credits: number;
}

/** Publishing actions for markets, trades, and resolutions. */
export function useMarketActions() {
  const { mutateAsync: publish } = useNostrPublish();
  const queryClient = useQueryClient();

  // Delay invalidation slightly so the caller can navigate first.
  // Without this, invalidating immediately clears the cache before the
  // new market page loads, causing MarketPage to briefly see an empty
  // ledger and flash a 404.
  const invalidate = (delayMs = 1500) => {
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: oracleEventsKey });
    }, delayMs);
  };

  /** Create a market. Returns the created event and its naddr. */
  async function createMarket(input: CreateMarketInput) {
    const id = `${slugify(input.title)}-${randomSuffix()}`;
    const event = await publish({
      kind: MARKET_KIND,
      content: input.description,
      tags: [
        ['d', id],
        ['title', input.title],
        ['close', String(Math.floor(input.closeDate))],
        ['liquidity', String(input.liquidityB)],
        ...input.tags.map((t) => ['t', t.toLowerCase()]),
        ['alt', `Prediction market: ${input.title}`],
      ],
    });
    invalidate();
    const naddr = nip19.naddrEncode({
      kind: MARKET_KIND,
      pubkey: event.pubkey,
      identifier: id,
    });
    return { event, naddr };
  }

  /** Place a trade on a market. `credits` must be computed from the live ledger. */
  async function placeTrade(market: Pick<Market, 'address' | 'title'>, input: PlaceTradeInput) {
    const credits = round2(input.credits);
    const event = await publish({
      kind: TRADE_KIND,
      content: '',
      tags: [
        ['a', market.address],
        ['side', input.side],
        ['action', input.action],
        ['shares', String(input.shares)],
        ['credits', credits.toFixed(2)],
        [
          'alt',
          `Trade: ${input.action} ${input.shares} ${input.side.toUpperCase()} shares on "${market.title}"`,
        ],
      ],
    });
    invalidate();
    return event;
  }

  /** Resolve a market. Only admins or the market creator may call this. */
  async function resolveMarket(
    market: Pick<Market, 'address' | 'title'>,
    outcome: MarketOutcome,
    note: string,
  ) {
    const event = await publish({
      kind: RESOLUTION_KIND,
      content: note,
      tags: [
        ['a', market.address],
        ['outcome', outcome],
        ['alt', `Resolution: "${market.title}" resolved ${outcome.toUpperCase()}`],
      ],
    });
    invalidate();
    return event;
  }

  return { createMarket, placeTrade, resolveMarket };
}
