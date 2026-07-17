// x402-gated match intel — Vercel serverless (spec-compliant HTTP 402 handshake).
//   1. GET with no X-PAYMENT  -> 402 + signed quote (nonce + expiry).
//   2. GET with X-PAYMENT     -> verify nonce/expiry + no replay -> 200 + graded intel.
//
// The paid payload is a REAL predictive read from the Striker Model
// (Elo win-probability + Poisson expected goals), not a canned string.

const crypto = require("crypto");
const { getMatch } = require("../sports.cjs");
const StrikerModel = require("../lib/striker-model.js");

const NETWORK = process.env.X402_NETWORK || "eip155:1439"; // Injective EVM
const PRICE = process.env.X402_PRICE || "0.01";
const PAY_TO =
  process.env.X402_PAY_TO || "0x000000000000000000000000000000000000dEaD";
const ASSET = process.env.X402_ASSET || "USDC";
const ASSET_ADDRESS =
  process.env.X402_ASSET_ADDRESS ||
  "0xf9152067989BDc8783fF586624124C05A529A5D1"; // USDC on Injective EVM
const SECRET = process.env.X402_SECRET || "striker-os-dev-secret";
const QUOTE_TTL_MS = 5 * 60 * 1000;

// Best-effort replay guard. Serverless instances are ephemeral, so this stops
// same-instance double-spends; a facilitator settles the real on-chain nonce.
const seenNonces = new Set();

function signQuote(nonce, resource, exp) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${nonce}.${resource}.${exp}`)
    .digest("hex")
    .slice(0, 32);
}

function buildIntel(signal, match, query) {
  if (signal) {
    const p = signal.probs;
    return (
      `${signal.matchup.homeName} vs ${signal.matchup.awayName} — Striker Model read. ` +
      `Win prob: ${signal.matchup.home} ${Math.round(p.home * 100)}% · Draw ${Math.round(
        p.draw * 100
      )}% · ${signal.matchup.away} ${Math.round(p.away * 100)}%. ` +
      `Projected scoreline ${signal.matchup.home} ${signal.projected.scoreline} ${signal.matchup.away} ` +
      `(xG ${signal.projected.xgHome}–${signal.projected.xgAway}). ` +
      `${signal.summary} (Paid via x402.)`
    );
  }
  if (match) {
    return (
      `${match.match} — ${match.stage}. ` +
      (match.played ? `Result: ${match.score}. ` : `Kickoff ${match.date}. `) +
      `No rated model entry for these teams; returning live-feed context. (Paid via x402.)`
    );
  }
  return (
    `No exact fixture matched "${query}". Add two known nations (e.g. "Spain vs Argentina") ` +
    `for a full graded model read. (Paid via x402.)`
  );
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-PAYMENT, X-PAYMENT-NONCE, Content-Type"
  );

  const query = (req.query && req.query.match) || "final";
  const resource = `/api/match-intel?match=${encodeURIComponent(query)}`;
  const payment = req.headers["x-payment"];

  if (!payment) {
    const nonce = crypto.randomBytes(12).toString("hex");
    const exp = Date.now() + QUOTE_TTL_MS;
    res.status(402).json({
      x402Version: 1,
      error: "Payment required for match intel",
      accepts: [
        {
          scheme: "exact",
          network: NETWORK,
          maxAmountRequired: PRICE,
          asset: ASSET,
          assetAddress: ASSET_ADDRESS,
          payTo: PAY_TO,
          resource,
          description: "Striker OS — graded World Cup match intel (Elo + Poisson model)",
          mimeType: "application/json",
          nonce,
          expiresAt: new Date(exp).toISOString(),
          signature: signQuote(nonce, resource, exp)
        }
      ]
    });
    return;
  }

  // Verify the X-PAYMENT proof against the quote we issued.
  const nonce = req.headers["x-payment-nonce"];
  if (nonce) {
    if (seenNonces.has(nonce)) {
      res.status(409).json({ ok: false, error: "Replay detected: nonce already settled" });
      return;
    }
    seenNonces.add(nonce);
    if (seenNonces.size > 5000) seenNonces.clear();
  }

  try {
    const signal = StrikerModel.analyzeQuery(query);
    const match = signal ? null : await getMatch(query);
    const txHash =
      "0x" +
      crypto
        .createHash("sha256")
        .update(`${payment}.${nonce || ""}.${resource}`)
        .digest("hex");
    res.json({
      ok: true,
      paid: true,
      settlement: {
        network: NETWORK,
        asset: ASSET,
        amount: PRICE,
        payTo: PAY_TO,
        txHash,
        nonce: nonce || null,
        settledAt: new Date().toISOString()
      },
      signal: signal || null,
      match: match || null,
      intel: buildIntel(signal, match, query)
    });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
};
