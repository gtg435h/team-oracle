import { useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

import {
  ADMIN_PUBKEYS,
  CREATOR_GRANT_D_TAG,
  CREATOR_GRANT_KIND,
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

/**
 * Fetches the union of all pubkeys granted market-creation permission by admins.
 * Separate lightweight query so it can be fetched independently of the full ledger.
 */
function useGrantedCreators(): Set<string> {
  const { nostr } = useNostr();

  const { data } = useQuery({
    queryKey: ['oracle', 'creator-grants'],
    queryFn: async ({ signal }) => {
      const events = await nostr.query(
        [{
          kinds: [CREATOR_GRANT_KIND],
          authors: [...ADMIN_PUBKEYS],
          '#d': [CREATOR_GRANT_D_TAG],
          limit: ADMIN_PUBKEYS.length,
        }],
        { signal },
      );
      const granted = new Set<string>();
      for (const event of events) {
        for (const [name, value] of event.tags) {
          if (name === 'p' && value) granted.add(value);
        }
      }
      return granted;
    },
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 30_000,
  });

  return data ?? new Set();
}

/** Live query for all markets, trades, and resolutions. */
export function useOracleEvents() {
  const { nostr } = useNostr();
  const grantedCreators = useGrantedCreators();

  // Trusted market authors = hardcoded admins + relay-stored granted creators.
  const trustedAuthors = useMemo(
    () => [...new Set([...ADMIN_PUBKEYS, ...grantedCreators])],
    [grantedCreators],
  );

  return useQuery({
    queryKey: [...oracleEventsKey, trustedAuthors.join(',')],
    queryFn: ({ signal }) =>
      nostr.query(
        [
          { kinds: [MARKET_KIND], authors: trustedAuthors, limit: MARKETS_LIMIT },
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
  const { data, isPending, isFetching } = useOracleEvents();

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

  return { ledger, isPending, isFetching };
}
