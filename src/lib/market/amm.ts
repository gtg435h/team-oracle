import { PAYOUT_PER_SHARE } from './constants';

/**
 * LMSR (Logarithmic Market Scoring Rule) automated market maker.
 *
 * `qYes`/`qNo` are the net shares bought from the AMM on each side and `b` is
 * the liquidity parameter in shares. Money is in credits, where a winning
 * share pays out `PAYOUT_PER_SHARE` (100) credits — so prices are quoted in
 * cents: a YES price of 58 credits per share = 58¢ = 58% implied probability.
 */

/** Total LMSR cost function, in credits. */
export function lmsrCost(qYes: number, qNo: number, b: number): number {
  // log-sum-exp formulation for numerical stability.
  const m = Math.max(qYes / b, qNo / b);
  const logSumExp = m + Math.log(Math.exp(qYes / b - m) + Math.exp(qNo / b - m));
  return PAYOUT_PER_SHARE * b * logSumExp;
}

/** Current YES price in credits per share (0–100). NO price is `PAYOUT_PER_SHARE - p`. */
export function priceYes(qYes: number, qNo: number, b: number): number {
  return PAYOUT_PER_SHARE / (1 + Math.exp((qNo - qYes) / b));
}

/**
 * Signed credit delta for moving the AMM from (qYes, qNo) by (dYes, dNo).
 * Positive = the trader pays that many credits; negative = the trader receives.
 */
export function tradeCost(
  qYes: number,
  qNo: number,
  b: number,
  dYes: number,
  dNo: number,
): number {
  return lmsrCost(qYes + dYes, qNo + dNo, b) - lmsrCost(qYes, qNo, b);
}

/**
 * Maximum shares a user can buy on `side` given their balance, without
 * pushing that side's price beyond `maxPrice` credits per share.
 * Returns 0 when no purchase is possible.
 */
export function maxBuyShares(
  qYes: number,
  qNo: number,
  b: number,
  side: 'yes' | 'no',
  balance: number,
  maxPrice = 99,
): number {
  const q1 = side === 'yes' ? qYes : qNo;
  const q2 = side === 'yes' ? qNo : qYes;

  // Price cap: price(q1 + n) = 100 / (1 + e^(-(n + q1 - q2)/b)) <= maxPrice.
  const priceCap = Math.floor(q1 - q2 - b * Math.log(PAYOUT_PER_SHARE / maxPrice - 1));
  if (priceCap < 1) return 0;

  const dYes = side === 'yes' ? 1 : 0;
  const dNo = side === 'no' ? 1 : 0;

  // Balance cap: binary search the largest n whose cost fits the balance.
  let lo = 1;
  let hi = priceCap;
  if (tradeCost(qYes, qNo, b, dYes * hi, dNo * hi) <= balance) return hi;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (tradeCost(qYes, qNo, b, dYes * mid, dNo * mid) <= balance) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return tradeCost(qYes, qNo, b, dYes * lo, dNo * lo) <= balance ? lo : 0;
}

/** Smallest number of shares on `side` that costs at least `minCost` credits. */
export function minBuyShares(
  qYes: number,
  qNo: number,
  b: number,
  side: 'yes' | 'no',
  minCost: number,
): number {
  const dYes = side === 'yes' ? 1 : 0;
  const dNo = side === 'no' ? 1 : 0;
  let n = 1;
  while (tradeCost(qYes, qNo, b, dYes * n, dNo * n) < minCost) {
    n *= 2;
    if (n > 1_000_000) return n;
  }
  // Binary search down to the exact minimum.
  let lo = Math.max(1, Math.ceil(n / 2));
  let hi = n;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (tradeCost(qYes, qNo, b, dYes * mid, dNo * mid) >= minCost) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

/** Round to 2 decimal places — all credits in the ledger are kept at cent precision. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
