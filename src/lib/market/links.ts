import { nip19 } from 'nostr-tools';

import { MARKET_KIND } from './constants';
import type { Market } from './types';

/** bech32 naddr for a market. */
export function marketNaddr(market: Pick<Market, 'pubkey' | 'id'>): string {
  return nip19.naddrEncode({
    kind: MARKET_KIND,
    pubkey: market.pubkey,
    identifier: market.id,
  });
}

/** App route for a market page. */
export function marketPath(market: Pick<Market, 'pubkey' | 'id'>): string {
  return `/market/${marketNaddr(market)}`;
}
