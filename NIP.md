# Team Oracle — Custom Event Kinds

Team Oracle is an internal, play-money prediction market (a Kalshi-style clone)
for forecasting company initiatives. All state — markets, trades, resolutions —
lives on Nostr relays, and every client independently derives balances, prices,
and positions by replaying and validating the public trade history.

## Kinds

| Kind  | Range       | Purpose                       |
| ----- | ----------- | ----------------------------- |
| 39179 | Addressable | Prediction market             |
| 3371  | Regular     | Trade (buy/sell YES/NO shares)|
| 1319  | Regular     | Market resolution             |

All three kinds carry a NIP-31 `alt` tag with a human-readable description.

## Kind 39179 — Market (addressable)

Coordinate: `39179:<pubkey>:<d>`. The latest event per coordinate wins.
Only events authored by keys in the app's `ADMIN_PUBKEYS` list (see
`src/lib/market/constants.ts`) are queried and rendered — market creation is
restricted to admins/team leads.

Tags:

| Tag          | Required | Value                                            |
| ------------ | -------- | ------------------------------------------------ |
| `d`          | yes      | Unique slug (e.g. `will-project-x-ship-by-q4-a1b2c3`) |
| `title`      | yes      | The question (≤ 300 chars)                       |
| `close`      | yes      | Unix timestamp — trading closes at this time     |
| `liquidity`  | no       | LMSR `b` parameter in shares (default 250)       |
| `t`          | no       | Up to 6 lowercase category tags (e.g. `product`)|
| `alt`        | yes      | NIP-31 description                              |

`content`: freeform market description (optional).

## Kind 3371 — Trade (regular)

Immutable record of one trade against a market's automated market maker.

Tags:

| Tag       | Required | Value                                                     |
| --------- | -------- | --------------------------------------------------------- |
| `a`       | yes      | Market coordinate `39179:<pubkey>:<d>`                   |
| `side`    | yes      | `yes` \| `no`                                             |
| `action`  | yes      | `buy` \| `sell`                                           |
| `shares`  | yes      | Integer 1–100,000                                         |
| `credits` | yes      | Signed cost in credits, 2 decimals: positive = paid (buy), negative = received (sell) |
| `alt`     | yes      | NIP-31 description                                        |

`content`: empty.

## Kind 1319 — Resolution (regular)

Tags:

| Tag       | Required | Value                          |
| --------- | -------- | ------------------------------ |
| `a`       | yes      | Market coordinate              |
| `outcome` | yes      | `yes` \| `no` \| `void`        |
| `alt`     | yes      | NIP-31 description             |

`content`: optional resolution note.

Only events authored by an app-configured admin or the market creator are
valid. The **latest valid** resolution per market (by `created_at`, then `id`)
wins — this lets a mistaken resolution be corrected by publishing a newer one.

## Economics

- Every account starts with **10,000 play credits**. Credits have no monetary value.
- A share pays out **100 credits** at resolution (so prices are quoted in ¢:
  58¢/share = 58% implied probability).
- **Void** resolution refunds half: every share (either side) pays 50 credits.

### Pricing — LMSR

Prices are produced by a Hanson LMSR automated market maker with parameter `b`
(the market's `liquidity` tag, default 250):

```
priceYes = 100 / (1 + e^((qNo − qYes)/b))      credits per share
cost(qYes, qNo) = 100 · b · ln(e^(qYes/b) + e^(qNo/b))   credits
```

Buying `n` YES shares costs `cost(qYes+n, qNo) − cost(qYes, qNo)`; selling
returns credits symmetrically. The AMM is subsidized by design — total trader
profits can exceed total losses by at most `b · 100 · ln 2` credits, which is
fine for play money.

## Ledger validation (client-side consensus)

Balances are *not* stored anywhere — every client rebuilds them by replaying
all trade events in `(created_at, id)` order and validating each one:

1. The market must exist, and the trade must have happened after the market
   opened and before `close` (and before any valid resolution).
2. The stored `credits` must match the AMM cost recomputed at that point in
   the replay (± 0.02). This rejects tampered events **and** trades signed
   against a stale market state (e.g. a race with another trader) — the
   trader simply re-places the trade.
3. Buys must cost ≥ 0.05 credits and the account must have had the credits.
4. Sells may not exceed the shares the account actually holds on that side.
5. At resolution, winning shares pay 100 credits each (50 on void), then the
   position closes.

Invalid trades are ignored everywhere (leaderboard, prices, payouts).

## Relay policy

For the preview this app runs on public relays, so market questions are
publicly visible. For production use, run a **private relay** (e.g. strfry with
auth/allowlist), then have each employee add it as their only relay in
**Settings → Relays** (NIP-65 relay lists keep this in sync per user). Raise
the query limits in `src/lib/market/constants.ts` if your relay supports it —
the ledger needs the full trade history to validate balances.

## Admins

The admin list lives in `src/lib/market/constants.ts` (`ADMIN_PUBKEYS`).
Admins (and market creators) can create and resolve markets. Trades are open
to everyone with a Nostr account.
