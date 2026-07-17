---
name: striker-worldcup
description: >
  Fetch live World Cup / soccer fixtures and match intel for Striker OS, and
  pay for premium intel using Injective x402 (USDC). Use when a user asks about
  World Cup matches, fixtures, scores, or wants to buy deep match analytics
  through an x402-protected endpoint on Injective.
---

# Striker World Cup Skill

An Injective-style agent skill that gives an AI agent two capabilities:

1. **Live World Cup data** via the Striker OS MCP server (`worldcup_fixtures`,
   `worldcup_match`, `worldcup_teams`).
2. **Pay-per-query intel** via the Striker OS x402-protected API on Injective.

## When to use

- "What World Cup matches are coming up?"
- "Give me intel on Brazil vs Germany."
- "Buy the deep analytics for the next final." (triggers x402 payment)

## Prerequisites

- Node 18+.
- Striker OS MCP server connected (see `mcp.json`).
- For paid intel: a funded Injective USDC wallet + the Injective x402 facilitator.

## How it works

### 1. Read live data (free)

Call the MCP tools exposed by `server/mcp-server.js`:

```
worldcup_fixtures { "limit": 6 }
worldcup_match    { "query": "Brazil" }
worldcup_teams    { "league": "English Premier League" }
worldcup_predict  { "query": "Spain vs Argentina" }
```

`worldcup_predict` runs the **Striker Model** (Elo win-probability + Poisson
expected goals) and returns win/draw/win probabilities, the most-likely
scoreline, Over 2.5 / BTTS markets, edge, confidence, and graded key factors.

Or hit the free HTTP endpoint:

```bash
curl http://localhost:8787/api/fixtures
```

### 2. Pay for deep intel (x402)

The `/api/match-intel` route is protected by Injective x402. A client without a
payment receipt gets an HTTP `402` with a **signed USDC quote** (HMAC signature,
nonce, 5-min expiry). After paying via the facilitator it retries with an
`X-PAYMENT` receipt and the matching `X-PAYMENT-NONCE`, and receives the full
**Striker Model** read plus a settlement receipt (tx hash). Reusing a nonce is
rejected as a replay.

```bash
# First call returns 402 + signed payment requirements (USDC on Injective)
curl -i "http://localhost:8787/api/match-intel?match=Spain%20vs%20Argentina"

# After settling via the Injective x402 facilitator, retry with the receipt + nonce
curl -H "X-PAYMENT: <receipt>" -H "X-PAYMENT-NONCE: <nonce>" \
  "http://localhost:8787/api/match-intel?match=Spain%20vs%20Argentina"
```

Production wiring uses [`@injectivelabs/x402`](https://injective.com/blog/x402)
`injectivePaymentMiddleware`; the server auto-detects it and falls back to a
spec-compliant 402 handshake when a facilitator/funds are unavailable.

## Related Injective skills

- `injective-usdc-integration` — USDC + Circle CCTP flows into native Injective USDC.
- `injective-mcp-servers` — set up the official Injective MCP server for on-chain actions.

Install those with:

```bash
npx skills add InjectiveLabs/agent-skills --skill injective-usdc-integration
npx skills add InjectiveLabs/agent-skills --skill injective-mcp-servers
```
