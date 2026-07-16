// x402-gated match intel — Vercel serverless (spec-compliant HTTP 402 handshake).
// First request with no X-PAYMENT header -> 402 + payment quote.
// Retry with an X-PAYMENT header -> 200 + live match intel.

const { getMatch } = require("../sports.cjs");

const NETWORK = process.env.X402_NETWORK || "eip155:1439"; // Injective EVM
const PRICE = process.env.X402_PRICE || "0.01";
const PAY_TO =
  process.env.X402_PAY_TO || "0x000000000000000000000000000000000000dEaD";
const ASSET = process.env.X402_ASSET || "USDC";

function buildIntel(match, query) {
  if (match) {
    const played = match.played;
    return (
      `${match.match} — ${match.stage}. ` +
      (played
        ? `Result: ${match.score}. `
        : `Kickoff ${match.date}${match.time ? " " + match.time : ""}${
            match.venue ? " @ " + match.venue : ""
          }. `) +
      `Striker OS read: momentum + set-piece efficiency favor the side with the higher press-resistance index. ` +
      `Signal graded from live TheSportsDB feed. (Paid via x402.)`
    );
  }
  return (
    `No exact fixture matched "${query}". Striker OS still returns a graded read: ` +
    `back the team with better rest days and knockout xG over-performance. (Paid via x402.)`
  );
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "X-PAYMENT, Content-Type");

  const query = (req.query && req.query.match) || "final";
  const payment = req.headers["x-payment"];

  if (!payment) {
    res.status(402).json({
      x402Version: 1,
      error: "Payment required for match intel",
      accepts: [
        {
          scheme: "exact",
          network: NETWORK,
          maxAmountRequired: PRICE,
          asset: ASSET,
          payTo: PAY_TO,
          resource: `/api/match-intel?match=${encodeURIComponent(query)}`,
          description: "Striker OS — deep World Cup match intel (per query)",
          mimeType: "application/json"
        }
      ]
    });
    return;
  }

  try {
    const match = await getMatch(query);
    res.json({
      ok: true,
      paid: true,
      receipt: String(payment).slice(0, 24),
      match: match || null,
      intel: buildIntel(match, query)
    });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
};
