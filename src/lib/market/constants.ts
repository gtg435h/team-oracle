/**
 * Team Oracle — core configuration.
 *
 * Custom event kinds are documented in NIP.md at the project root.
 */

export const APP_NAME = 'Team Oracle';

/** Addressable kind: a prediction market. See NIP.md. */
export const MARKET_KIND = 39179;

/** Regular kind: a trade (buy/sell of YES/NO shares). See NIP.md. */
export const TRADE_KIND = 3371;

/** Regular kind: a market resolution. See NIP.md. */
export const RESOLUTION_KIND = 1319;

/**
 * Pubkeys allowed to create markets and (along with the market creator)
 * resolve them. Add your company's team leads here — edit this list and
 * redeploy. Only markets authored by these keys are shown in the app.
 */
export const ADMIN_PUBKEYS = [
  // Team lead (you) — replace with your company's admin pubkeys.
  '030b947c3af7a8d70e6e8c9d8508edd35638fb91eef1c85bf39721822f61d12b',
] as const;

export function isAdmin(pubkey: string | undefined): boolean {
  return pubkey ? (ADMIN_PUBKEYS as readonly string[]).includes(pubkey) : false;
}

/** Every employee starts with this many play credits. */
export const STARTING_BALANCE = 10_000;

/** A winning share pays out this many credits. Prices are quoted in ¢ (credits per share). */
export const PAYOUT_PER_SHARE = 100;

/** Minimum cost in credits for a valid buy trade (keeps dust trades out of the ledger). */
export const MIN_TRADE_COST = 0.05;

/** Default LMSR liquidity parameter (in shares). Higher = deeper, harder to move the price. */
export const DEFAULT_LIQUIDITY_B = 250;

/** Tolerance when re-validating a trade's stored cost against the recomputed AMM cost. */
export const COST_TOLERANCE = 0.02;

/** Maximum number of shares in a single trade. */
export const MAX_SHARES_PER_TRADE = 100_000;

/** Query limits — raise these when running on your own private relay. */
export const MARKETS_LIMIT = 500;
export const TRADES_LIMIT = 5000;
export const RESOLUTIONS_LIMIT = 500;

/** How often live data refreshes (ms). */
export const REFRESH_INTERVAL = 15_000;
