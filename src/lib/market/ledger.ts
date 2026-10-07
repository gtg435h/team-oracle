import type { NostrEvent } from '@nostrify/nostrify';

import {
  DEFAULT_LIQUIDITY_B,
  MARKET_KIND,
  MIN_TRADE_COST,
  COST_TOLERANCE,
  PAYOUT_PER_SHARE,
  RESOLUTION_KIND,
  STARTING_BALANCE,
  TRADE_KIND,
  MAX_SHARES_PER_TRADE,
  isAdmin,
} from './constants';
import { priceYes, round2, tradeCost } from './amm';
import type {
  Account,
  Ledger,
  Market,
  MarketState,
  MarketStatus,
  Position,
  Resolution,
  Trade,
} from './types';

function tagValue(event: NostrEvent, name: string): string | undefined {
  return event.tags.find(([n]) => n === name)?.[1];
}

/** Parse and validate a market event (kind MARKET_KIND). Returns null if malformed. */
export function parseMarketEvent(event: NostrEvent): Market | null {
  if (event.kind !== MARKET_KIND) return null;

  const id = tagValue(event, 'd')?.trim();
  const title = tagValue(event, 'title')?.trim();
  const close = Number(tagValue(event, 'close'));
  const liquidityRaw = Number(tagValue(event, 'liquidity'));

  if (!id || !title) return null;
  if (!Number.isFinite(close) || close < 1_600_000_000) return null; // sane unix timestamp
  if (title.length > 300) return null;

  const liquidityB =
    Number.isFinite(liquidityRaw) && liquidityRaw >= 10 && liquidityRaw <= 10_000
      ? liquidityRaw
      : DEFAULT_LIQUIDITY_B;

  const tags = [
    ...new Set(
      event.tags
        .filter(([n]) => n === 't')
        .map(([, v]) => v.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, 6);

  return {
    address: `${event.kind}:${event.pubkey}:${id}`,
    pubkey: event.pubkey,
    id,
    title,
    description: event.content.trim(),
    closeDate: close,
    tags,
    liquidityB,
    createdAt: event.created_at,
    event,
  };
}

/** Parse and validate a trade event (kind TRADE_KIND). Returns null if malformed. */
export function parseTradeEvent(event: NostrEvent): Trade | null {
  if (event.kind !== TRADE_KIND) return null;

  const market = tagValue(event, 'a')?.trim();
  const side = tagValue(event, 'side');
  const action = tagValue(event, 'action');
  const shares = Number(tagValue(event, 'shares'));
  const credits = Number(tagValue(event, 'credits'));

  if (!market) return null;
  if (side !== 'yes' && side !== 'no') return null;
  if (action !== 'buy' && action !== 'sell') return null;
  if (!Number.isInteger(shares) || shares < 1 || shares > MAX_SHARES_PER_TRADE) return null;
  if (!Number.isFinite(credits) || Math.abs(credits) > 1e9) return null;

  return {
    id: event.id,
    pubkey: event.pubkey,
    market,
    side,
    action,
    shares,
    credits: round2(credits),
    createdAt: event.created_at,
    event,
  };
}

/** Parse and validate a resolution event (kind RESOLUTION_KIND). Returns null if malformed. */
export function parseResolutionEvent(event: NostrEvent): Resolution | null {
  if (event.kind !== RESOLUTION_KIND) return null;

  const market = tagValue(event, 'a')?.trim();
  const outcome = tagValue(event, 'outcome');

  if (!market) return null;
  if (outcome !== 'yes' && outcome !== 'no' && outcome !== 'void') return null;

  return {
    id: event.id,
    pubkey: event.pubkey,
    market,
    outcome,
    note: event.content.trim(),
    createdAt: event.created_at,
    event,
  };
}

/**
 * Replays the full trade history into a validated ledger.
 *
 * Every account balance, position, and price is derived here — nothing is
 * trusted from the events themselves beyond what validation recomputes:
 *
 * 1. Markets are addressable: latest version per coordinate wins for
 *    metadata, but `openedAt` (earliest version) gates trade validity.
 * 2. Only admins or the market creator may resolve; latest valid
 *    resolution per market wins.
 * 3. Trades replay in (created_at, id) order. A trade is valid only if:
 *    - its market exists and the trade happened while the market was open
 *      (after `openedAt`, before `closeDate`, before the resolution);
 *    - its stored cost matches the AMM cost recomputed at that point in the
 *      replay (± COST_TOLERANCE) — a tampered or raced trade is rejected;
 *    - buys cost at least MIN_TRADE_COST and the trader had the credits;
 *    - sells don't exceed the shares the trader actually holds.
 * 4. Resolution pays PAYOUT_PER_SHARE per winning share (50 per share on a
 *    void), then closes the position.
 */
export function buildLedger(markets: Market[], trades: Trade[], resolutions: Resolution[]): Ledger {
  // --- Markets: latest version per address wins; track earliest created_at. ---
  const latestMarket = new Map<string, Market>();
  const openedAt = new Map<string, number>();
  for (const m of markets) {
    const existing = latestMarket.get(m.address);
    if (!existing || m.createdAt > existing.createdAt || (m.createdAt === existing.createdAt && m.id > existing.id)) {
      latestMarket.set(m.address, m);
    }
    const open = openedAt.get(m.address);
    if (open === undefined || m.createdAt < open) openedAt.set(m.address, m.createdAt);
  }

  // --- Resolutions: must be by an admin or the market creator; latest wins. ---
  const resolutionByMarket = new Map<string, Resolution>();
  for (const r of resolutions) {
    const market = latestMarket.get(r.market);
    if (!market) continue;
    if (r.pubkey !== market.pubkey && !isAdmin(r.pubkey)) continue;
    const existing = resolutionByMarket.get(r.market);
    if (!existing || r.createdAt > existing.createdAt || (r.createdAt === existing.createdAt && r.id > existing.id)) {
      resolutionByMarket.set(r.market, r);
    }
  }

  // --- Market state. ---
  const traders = new Map<string, Set<string>>();
  const states = new Map<string, MarketState>();
  for (const m of latestMarket.values()) {
    const resolution = resolutionByMarket.get(m.address) ?? null;
    states.set(m.address, {
      market: m,
      qYes: 0,
      qNo: 0,
      volume: 0,
      tradeCount: 0,
      traderCount: 0,
      history: [{ t: openedAt.get(m.address) ?? m.createdAt, p: priceYes(0, 0, m.liquidityB) }],
      resolution,
    });
    traders.set(m.address, new Set());
  }

  // --- Accounts. ---
  const accounts = new Map<string, Account>();
  const getAccount = (pubkey: string): Account => {
    let account = accounts.get(pubkey);
    if (!account) {
      account = {
        pubkey,
        balance: STARTING_BALANCE,
        positions: new Map(),
        resolvedPositions: [],
        tradeCount: 0,
        marketsTraded: new Set(),
        tradingProfit: 0,
      };
      accounts.set(pubkey, account);
    }
    return account;
  };
  const getPosition = (account: Account, market: string): Position => {
    let position = account.positions.get(market);
    if (!position) {
      position = {
        market,
        yesShares: 0,
        noShares: 0,
        yesCostBasis: 0,
        noCostBasis: 0,
        lastTradeAt: 0,
      };
      account.positions.set(market, position);
    }
    return position;
  };

  // --- Replay trades in deterministic order. ---
  const validTrades: Trade[] = [];
  let invalidTradeCount = 0;

  const sorted = [...trades].sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));

  for (const trade of sorted) {
    const state = states.get(trade.market);
    if (!state) {
      invalidTradeCount++;
      continue;
    }

    const market = state.market;
    const b = market.liquidityB;

    // Market must have been open for trading at the time of the trade.
    const marketOpen = openedAt.get(market.address) ?? market.createdAt;
    if (trade.createdAt < marketOpen) {
      invalidTradeCount++;
      continue;
    }
    if (trade.createdAt > market.closeDate) {
      invalidTradeCount++;
      continue;
    }
    const resolution = state.resolution;
    if (resolution && resolution.createdAt <= trade.createdAt) {
      invalidTradeCount++;
      continue;
    }

    // Recompute the signed cost at this point in the replay.
    const dYes =
      trade.side === 'yes' ? (trade.action === 'buy' ? trade.shares : -trade.shares) : 0;
    const dNo = trade.side === 'no' ? (trade.action === 'buy' ? trade.shares : -trade.shares) : 0;
    const expected = tradeCost(state.qYes, state.qNo, b, dYes, dNo);

    // The stored cost must match the recomputed cost (blocks tampering and
    // trades signed against a stale market state).
    if (Math.abs(trade.credits - expected) > COST_TOLERANCE) {
      invalidTradeCount++;
      continue;
    }

    const account = getAccount(trade.pubkey);
    const position = getPosition(account, trade.market);

    if (trade.action === 'buy') {
      if (expected < MIN_TRADE_COST) {
        invalidTradeCount++;
        continue;
      }
      if (account.balance + 1e-9 < trade.credits) {
        invalidTradeCount++;
        continue;
      }
      account.balance = round2(account.balance - trade.credits);
      if (trade.side === 'yes') {
        position.yesShares += trade.shares;
        position.yesCostBasis = round2(position.yesCostBasis + trade.credits);
      } else {
        position.noShares += trade.shares;
        position.noCostBasis = round2(position.noCostBasis + trade.credits);
      }
    } else {
      // Sell: can't sell more than held.
      const held = trade.side === 'yes' ? position.yesShares : position.noShares;
      if (trade.shares > held) {
        invalidTradeCount++;
        continue;
      }
      const refund = -trade.credits;
      const avgCost = held > 0
        ? (trade.side === 'yes' ? position.yesCostBasis : position.noCostBasis) / held
        : 0;
      const released = round2(avgCost * trade.shares);
      account.balance = round2(account.balance + refund);
      account.tradingProfit = round2(account.tradingProfit + refund - released);
      if (trade.side === 'yes') {
        position.yesShares -= trade.shares;
        position.yesCostBasis = round2(position.yesCostBasis - released);
      } else {
        position.noShares -= trade.shares;
        position.noCostBasis = round2(position.noCostBasis - released);
      }
    }

    // Apply the trade to the AMM and stats.
    state.qYes += dYes;
    state.qNo += dNo;
    state.volume = round2(state.volume + Math.abs(trade.credits));
    state.tradeCount++;
    traders.get(market.address)!.add(trade.pubkey);
    position.lastTradeAt = trade.createdAt;
    account.tradeCount++;
    account.marketsTraded.add(trade.market);
    state.history.push({ t: trade.createdAt, p: priceYes(state.qYes, state.qNo, b) });
    validTrades.push(trade);
  }

  // --- Apply resolutions: payouts + final price point. ---
  for (const state of states.values()) {
    const resolution = state.resolution;
    if (!resolution) continue;

    const finalPrice =
      resolution.outcome === 'yes'
        ? PAYOUT_PER_SHARE
        : resolution.outcome === 'no'
          ? 0
          : PAYOUT_PER_SHARE / 2;
    state.history.push({ t: resolution.createdAt, p: finalPrice });

    for (const account of accounts.values()) {
      const position = account.positions.get(state.market.address);
      if (!position) continue;

      const payout = round2(
        position.yesShares *
          (resolution.outcome === 'yes' ? PAYOUT_PER_SHARE : resolution.outcome === 'void' ? PAYOUT_PER_SHARE / 2 : 0) +
        position.noShares *
          (resolution.outcome === 'no' ? PAYOUT_PER_SHARE : resolution.outcome === 'void' ? PAYOUT_PER_SHARE / 2 : 0),
      );
      const basis = round2(position.yesCostBasis + position.noCostBasis);

      if (position.yesShares + position.noShares > 0) {
        account.balance = round2(account.balance + payout);
        account.resolvedPositions.push({
          market: state.market.address,
          outcome: resolution.outcome,
          profit: round2(payout - basis),
          payout,
          closedAt: resolution.createdAt,
        });
      }

      position.yesShares = 0;
      position.noShares = 0;
      position.yesCostBasis = 0;
      position.noCostBasis = 0;
    }
  }

  let totalVolume = 0;
  for (const state of states.values()) {
    state.traderCount = traders.get(state.market.address)?.size ?? 0;
    totalVolume = round2(totalVolume + state.volume);
  }

  return {
    markets: states,
    accounts,
    validTrades,
    invalidTradeCount,
    totalVolume,
  };
}

/** Market status relative to now. */
export function marketStatus(state: MarketState, now = Date.now() / 1000): MarketStatus {
  if (state.resolution) return 'resolved';
  if (now > state.market.closeDate) return 'closed';
  if (state.market.closeDate - now < 48 * 3600) return 'closing-soon';
  return 'open';
}

/** Value and P&L stats for an open position. */
export function positionStats(state: MarketState, position: Position) {
  const p = priceYes(state.qYes, state.qNo, state.market.liquidityB);
  const yesValue = round2(position.yesShares * p);
  const noValue = round2(position.noShares * (PAYOUT_PER_SHARE - p));
  const value = round2(yesValue + noValue);
  const basis = round2(position.yesCostBasis + position.noCostBasis);
  return {
    price: p,
    yesValue,
    noValue,
    value,
    basis,
    pnl: round2(value - basis),
  };
}

/** A user's total net worth: available credits + value of all open positions. */
export function netWorth(ledger: Ledger, pubkey: string): number {
  const account = ledger.accounts.get(pubkey);
  if (!account) return STARTING_BALANCE;

  let total = account.balance;
  for (const [address, position] of account.positions) {
    const state = ledger.markets.get(address);
    if (!state) continue;
    if (state.resolution) continue; // resolved positions are already paid out
    const p = priceYes(state.qYes, state.qNo, state.market.liquidityB);
    total += position.yesShares * p + position.noShares * (PAYOUT_PER_SHARE - p);
  }
  return round2(total);
}
