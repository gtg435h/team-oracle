import { useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

import {
  ADMIN_PUBKEYS,
  MARKETS_LIMIT,
  MARKET_KIND,
  REFRESH_INTERVAL,
  RESOLUTIONS_LIMIT,
  RESOLUTION_KIND,
  TRADES_LIMIT,
  TRADE_KIND,
} from '@/lib/market/constants';
import {
  buildLedger,
  parseMarketEvent,
  parseResolutionEvent,
  parseTradeEvent,
} from '@/lib/market/ledger';
import type { Ledger } from '@/lib/market/types';

/** Query key for all Team Oracle events. */
export const oracleEventsKey = ['oracle', 'events'] as const;

/** Live query for all markets, trades, and resolutions. */
export function useOracleEvents() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: oracleEventsKey,
    queryFn: ({ signal }) =>
      nostr.query(
        [
          // Only markets authored by admins are trusted (see NIP.md).
          { kinds: [MARKET_KIND], authors: [...ADMIN_PUBKEYS], limit: MARKETS_LIMIT },
          { kinds: [TRADE_KIND], limit: TRADES_LIMIT },
          { kinds: [RESOLUTION_KIND], limit: RESOLUTIONS_LIMIT },
        ],
        { signal },
      ),
    refetchInterval: REFRESH_INTERVAL,
  });
}

/**
 * The validated ledger: every market, account, price, and position,
 * derived by replaying the full trade history.
 */
export function useLedger() {
  const { data, isPending } = useOracleEvents();

  const ledger = useMemo<Ledger | undefined>(() => {
    if (!data) return undefined;

    const markets = [];
    const trades = [];
    const resolutions = [];

    for (const event of data) {
      const market = parseMarketEvent(event);
      if (market) {
        markets.push(market);
        continue;
      }
      const trade = parseTradeEvent(event);
      if (trade) {
        trades.push(trade);
        continue;
      }
      const resolution = parseResolutionEvent(event);
      if (resolution) {
        resolutions.push(resolution);
      }
    }

    return buildLedger(markets, trades, resolutions);
  }, [data]);

  return { ledger, isPending };
}
