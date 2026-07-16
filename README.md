# Striker OS

**Live World Cup / soccer intel desk** built for [The Injective Global Cup](https://www.hackquest.io/).

Fans and AI agents get live match data, an MCP tool surface, and pay‑per‑query intel gated by **real Injective x402 payments** — in one lightweight app.

---

## What it does / problem it solves

During a tournament, fans juggle scores and paid data feeds across tabs, and AI agents can't sign up for API keys mid‑run. Striker OS gives both a single desk:

1. **Live match board** — real fixtures/results from a live sports API
2. **Pay‑per‑query intel** — gated by **x402** (HTTP 402 → USDC → unlock), no API keys
3. **MCP server** — live World Cup data exposed as callable agent tools
4. **Agent Skill** — an installable skill that wires the above together
5. **CCTP** — fund the agent wallet with native USDC on Injective
6. Goal Battle arena for demo/engagement clips

---

## How the Injective technologies are used (real, not mocked)

| Tech | Real integration in this repo |
|------|-------------------------------|
| **x402** | `server/index.js` mounts the official [`@injectivelabs/x402`](https://injective.com/blog/x402) `injectivePaymentMiddleware` on `/api/match-intel-live` using **live Injective testnet USDC** (`eip155:1439`). Returns a real HTTP `402` with payment requirements; fund an x402 client to settle and unlock. A spec‑compliant demo route (`/api/match-intel`) runs the same handshake for the UI without funds. |
| **MCP Server** | `server/mcp-server.js` is a **real, runnable MCP server** (`@modelcontextprotocol/sdk`) exposing `worldcup_fixtures`, `worldcup_match`, `worldcup_teams`, backed by live data. Add it to Cursor/Claude via `mcp.json`. Pair with the official `@injectivelabs/mcp-server` (also in `mcp.json`) for on‑chain actions. |
| **Agent Skills** | `skills/striker-worldcup/SKILL.md` is an installable Injective‑style skill that teaches an agent to read live fixtures and pay for intel via x402. Links to `injective-usdc-integration` and `injective-mcp-servers`. |
| **USDC CCTP** | Documented burn → attestation → mint path into native Injective USDC to fund x402 spend, using the official Injective CCTP tools (`cctp_supported_chains`, `cctp_attestation_status`, `cctp_mint`). |

### Live World Cup data

Match data is fetched live from [TheSportsDB](https://www.thesportsdb.com/). The free test key works out of the box; set `STRIKER_SPORTS_KEY` + `STRIKER_LEAGUE_ID` (or plug in football‑data.org) to point at the FIFA World Cup feed. The UI shows a **LIVE**/**DEMO** badge so it's always honest about the source.

---

## Quick start

### 1. Frontend (no build step)

```bash
python -m http.server 5173
# open http://localhost:5173
```

### 2. Backend — x402 API + live data

```bash
cd server
npm install
npm start          # http://localhost:8787
```

Test it:

```bash
curl http://localhost:8787/health
curl http://localhost:8787/api/fixtures                 # live fixtures
curl -i "http://localhost:8787/api/match-intel?match=United"   # 402 quote
curl -H "X-PAYMENT: receipt" "http://localhost:8787/api/match-intel?match=United"  # unlock
curl -i "http://localhost:8787/api/match-intel-live?match=United"  # REAL x402 402
```

### 3. MCP server — live World Cup tools

```bash
cd server
npm run mcp        # stdio MCP server
```

Add to Cursor/Claude with `mcp.json` (already in the repo), then ask:

> "Use worldcup_fixtures to list upcoming matches."

---

## Repo structure

```
striker-os/
├── index.html                     # App shell (Codedex-style 8-bit UI)
├── css/app.css                    # Theme
├── js/app.js                      # Wallet, x402 flow, live data, arena, oracle
├── data/worldcup-2026.js          # Offline fallback pack
├── server/
│   ├── index.js                   # x402-protected API (real @injectivelabs/x402)
│   ├── mcp-server.js              # Real MCP server (live World Cup tools)
│   ├── worldcup.js                # Live sports data module
│   └── package.json
├── skills/striker-worldcup/SKILL.md  # Installable Injective agent skill
├── mcp.json                       # MCP client config (Striker + Injective servers)
├── .env.example
└── README.md
```

---

## Config

Frontend (via `window.` or `localStorage`):

```js
localStorage.setItem("striker_api_endpoint", "http://localhost:8787");
localStorage.setItem("striker_sports_key", "3");     // TheSportsDB key
localStorage.setItem("striker_league_id", "4328");   // point at World Cup feed
localStorage.setItem("striker_gemini_key", "YOUR_KEY"); // optional oracle grounding
```

Backend: see `.env.example` (`X402_NETWORK`, `X402_PRICE`, `X402_PAY_TO`, `X402_FACILITATOR`, `X402_PRIVATE_KEY`).

---

## Demo path for judges (2 minutes)

1. **Live match board** → real fixtures load with a LIVE badge
2. **x402 tab** → click pay → app performs the real 402 handshake against the backend and unlocks intel
3. **MCP tab** → ping `/health` (shows `x402: live-middleware`) + pull live fixtures
4. `npm run mcp` → add to Cursor and call `worldcup_fixtures`
5. **Goal Battle** → drag‑shoot a goal for a social clip

---

## Submission checklist (Injective Global Cup)

- [ ] Typeform: https://xsxo494365r.typeform.com/to/TMaGb1du
- [ ] GitHub repo + demo link
- [ ] Demo video (live data → x402 → MCP → Goal Battle)
- [ ] X post with screenshots, GitHub link, tags `@injective` `@NinjaLabsHQ` `@NinjaLabsCN`, hashtag `#InjectiveGlobalCupHackathon`
- [ ] Mention all four tech names in the post for Points Contest bonuses
- [ ] Comment live match screenshots under the main post

---

## Honesty note for judges

- **Live data:** real API calls (LIVE/DEMO badge shown).
- **MCP server:** fully real and runnable — add it to your client and call the tools.
- **x402:** real `@injectivelabs/x402` middleware mounted on `/api/match-intel-live` with live testnet USDC; it returns genuine 402 payment requirements. Settling a real payment needs a funded x402 client + facilitator. The UI uses the spec‑compliant demo route so the flow is visible without funds.
- **CCTP:** documented, uses the official Injective CCTP tools; a mint needs funded keys.

---

## License

MIT — built for the Injective Global Cup hackathon.
