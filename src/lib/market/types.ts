import type { NostrEvent } from '@nostrify/nostrify';

export type MarketOutcome = 'yes' | 'no' | 'void';
export type TradeSide = 'yes' | 'no';
export type TradeAction = 'buy' | 'sell';

export type MarketStatus = 'open' | 'closing-soon' | 'closed' | 'resolved';

/** A prediction market (kind MARKET_KIND, addressable — latest version per coordinate wins). */
export interface Market {
  /** Coordinate string `kind:pubkey:d`, used in `a` tags and matching. */
  address: string;
  pubkey: string;
  /** The `d` tag identifier. */
  id: string;
  title: string;
  description: string;
  /** Unix seconds — trading closes at this time. */
  closeDate: number;
  /** Lowercased category tags (`t` tags). */
  tags: string[];
  /** LMSR liquidity parameter in shares. */
  liquidityB: number;
  createdAt: number;
  event: NostrEvent;
}

/** An immutable trade record (kind TRADE_KIND). */
export interface Trade {
  id: string;
  pubkey: string;
  /** Market address (`a` tag). */
  market: string;
  side: TradeSide;
  action: TradeAction;
  /** Integer number of shares. */
  shares: number;
  /**
   * Signed credits as stored in the event (2 decimals):
   * positive = credits paid to the AMM (buy), negative = credits received (sell).
   */
  credits: number;
  createdAt: number;
  event: NostrEvent;
}

/** A market resolution (kind RESOLUTION_KIND). Latest valid one per market wins. */
export interface Resolution {
  id: string;
  pubkey: string;
  market: string;
  outcome: MarketOutcome;
  note: string;
  createdAt: number;
  event: NostrEvent;
}

/** A point on the YES price chart. `p` is in credits per share (0–100). */
export interface PricePoint {
  t: number;
  p: number;
}

/** A user's open position in a single market. */
export interface Position {
  market: string;
  yesShares: number;
  noShares: number;
  yesCostBasis: number;
  noCostBasis: number;
  lastTradeAt: number;
}

/** A closed position from a resolved market. */
export interface ResolvedPosition {
  market: string;
  outcome: MarketOutcome;
  profit: number;
  payout: number;
  closedAt: number;
}

/** A user's account, derived entirely from the replayed trade ledger. */
export interface Account {
  pubkey: string;
  balance: number;
  positions: Map<string, Position>;
  resolvedPositions: ResolvedPosition[];
  tradeCount: number;
  marketsTraded: Set<string>;
  /** Realized profit from selling shares back to the AMM. */
  tradingProfit: number;
}

/** AMM + aggregate state for a single market. */
export interface MarketState {
  market: Market;
  /** Net YES shares bought from the AMM (never negative). */
  qYes: number;
  /** Net NO shares bought from the AMM (never negative). */
  qNo: number;
  volume: number;
  tradeCount: number;
  traderCount: number;
  history: PricePoint[];
  resolution: Resolution | null;
}

/** The full validated state of the prediction market app. */
export interface Ledger {
  markets: Map<string, MarketState>;
  accounts: Map<string, Account>;
  /** Valid trades replayed into the ledger, sorted by (createdAt, id). */
  validTrades: Trade[];
  /** Number of trades rejected by validation. */
  invalidTradeCount: number;
  totalVolume: number;
}
