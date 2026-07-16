const { API_KEY, LEAGUE_ID } = require("../sports.cjs");

module.exports = (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    ok: true,
    service: "striker-os",
    x402: "spec-402", // Vercel serverless uses the spec-compliant 402 handshake
    network: "eip155:1439",
    price: process.env.X402_PRICE || "0.01",
    leagueId: LEAGUE_ID,
    sportsKey: API_KEY === "3" ? "free-test" : "configured"
  });
};
