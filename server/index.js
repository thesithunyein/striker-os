// Striker OS backend — x402-protected World Cup intel API on Injective.
//
// GET /health              -> service + x402 status
// GET /api/fixtures        -> FREE: live fixtures (proof of live World Cup data)
// GET /api/match-intel     -> DEMO: spec-compliant HTTP 402 handshake (frontend)
// GET /api/match-intel-live-> REAL: @injectivelabs/x402 middleware (fund a client to test)
//
// The real Injective x402 middleware is mounted on /api/match-intel-live using
// live testnet USDC. The /api/match-intel route runs the same 402 handshake
// without requiring a funded facilitator, so the UI demo always works.

import express from "express";
import cors from "cors";
import { createRequire } from "module";
import { getFixtures, getMatch, API_KEY, LEAGUE_ID } from "./worldcup.js";
import { injectivePaymentMiddleware } from "@injectivelabs/x402/middleware";
import { INJECTIVE_TESTNET_CAIP2, TOKENS } from "@injectivelabs/x402/networks";

const require = createRequire(import.meta.url);
const StrikerModel = require("../lib/striker-model.js");

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

const NETWORK = INJECTIVE_TESTNET_CAIP2; // eip155:1439
const USDC = TOKENS[NETWORK].USDC;
const PRICE_USDC = process.env.X402_PRICE || "0.01";
const AMOUNT = String(Math.round(parseFloat(PRICE_USDC) * 10 ** USDC.decimals));
const PAY_TO = process.env.X402_PAY_TO || "0x0000000000000000000000000000000000000000";
const FACILITATOR = process.env.X402_FACILITATOR || "https://x402.injective.network";

// ---- Real Injective x402 middleware ----
let x402Mode = "unavailable";
let realMiddleware = null;
try {
  const options = process.env.X402_PRIVATE_KEY
    ? { facilitator: { privateKey: process.env.X402_PRIVATE_KEY } }
    : { facilitatorUrl: FACILITATOR };
  realMiddleware = injectivePaymentMiddleware(
    {
      "GET /api/match-intel-live": {
        description: "Striker OS — deep World Cup match intel",
        payTo: PAY_TO,
        accepts: [
          { network: NETWORK, asset: USDC.address, amount: AMOUNT, payTo: PAY_TO }
        ]
      }
    },
    options
  );
  x402Mode = "live-middleware";
} catch (err) {
  console.error("x402 middleware init failed:", err.message);
}

// ---- Spec-compliant fallback 402 (used by the UI demo) ----
function demo402(req, res, next) {
  if (req.header("X-PAYMENT")) {
    res.setHeader("X-PAYMENT-RESPONSE", `settled:${NETWORK}`);
    return next();
  }
  return res.status(402).json({
    x402Version: 1,
    error: "Payment Required",
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        maxAmountRequired: AMOUNT,
        asset: USDC.address,
        assetSymbol: USDC.symbol,
        payTo: PAY_TO,
        resource: "/api/match-intel",
        description: "Deep World Cup match intel (Striker OS)"
      }
    ]
  });
}

async function serveIntel(req, res) {
  const query = req.query.match || "";
  try {
    const signal = StrikerModel.analyzeQuery(query);
    if (signal) {
      const p = signal.probs;
      const intel =
        `${signal.matchup.homeName} vs ${signal.matchup.awayName} — Striker Model\n` +
        `Win prob: ${signal.matchup.home} ${Math.round(p.home * 100)}% · Draw ${Math.round(
          p.draw * 100
        )}% · ${signal.matchup.away} ${Math.round(p.away * 100)}%\n` +
        `Projected: ${signal.projected.scoreline} (xG ${signal.projected.xgHome}–${signal.projected.xgAway})\n` +
        `Confidence: ${signal.confidence} · x402: ${PRICE_USDC} USDC on ${NETWORK}.`;
      return res.json({ ok: true, paid: true, signal, intel });
    }
    const match = await getMatch(query);
    if (!match) {
      return res.json({
        ok: true,
        paid: true,
        intel: `No rated matchup or live fixture for "${query}". Try e.g. "Spain vs Argentina".`
      });
    }
    const intel =
      `${match.match} — ${match.stage}\n` +
      `Date: ${match.date} ${match.time}\n` +
      `Venue: ${match.venue || "TBD"}\n` +
      `Status: ${match.played ? "Result " + match.score : "Upcoming"}\n` +
      `Source: ${match.source}\n` +
      `x402: ${PRICE_USDC} USDC on ${NETWORK}.`;
    res.json({ ok: true, paid: true, match, intel });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "striker-os",
    x402: x402Mode,
    network: NETWORK,
    usdc: USDC.address,
    price: PRICE_USDC,
    leagueId: LEAGUE_ID,
    sportsKey: API_KEY === "3" ? "free-test" : "configured"
  });
});

// FREE — proves live World Cup data.
app.get("/api/fixtures", async (_req, res) => {
  try {
    const fixtures = await getFixtures(8);
    res.json({ ok: true, count: fixtures.length, fixtures });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

// REAL x402 — mount the Injective middleware, then serve intel.
if (realMiddleware) {
  app.get("/api/match-intel-live", realMiddleware, serveIntel);
}

// DEMO x402 — spec-compliant handshake for the UI.
app.get("/api/match-intel", demo402, serveIntel);

app.listen(PORT, () => {
  console.log(`Striker OS API on http://localhost:${PORT}`);
  console.log(`x402 mode: ${x402Mode} | network: ${NETWORK} | USDC: ${USDC.address}`);
  console.log(`price: ${PRICE_USDC} USDC (${AMOUNT} base units)`);
});
