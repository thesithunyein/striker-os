/**
 * x402 match-intel handshake tests — zero deps.
 * Run:  node --test test/x402-match-intel.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/match-intel.js");

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(o) {
      this.body = o;
      return this;
    }
  };
}

describe("GET /api/match-intel x402 handshake", () => {
  it("returns 402 with signed quote when unpaid", async () => {
    const res = mockRes();
    await handler({ query: { match: "Spain vs Argentina" }, headers: {} }, res);
    assert.equal(res.statusCode, 402);
    assert.equal(res.body.x402Version, 1);
    const q = res.body.accepts[0];
    assert.ok(q.nonce);
    assert.ok(q.signature);
    assert.ok(q.expiresAt);
    assert.equal(q.network, "eip155:1439");
    assert.equal(q.maxAmountRequired, "0.01");
    assert.equal(q.asset, "USDC");
  });

  it("unlocks graded Striker Model signal after payment", async () => {
    const first = mockRes();
    await handler({ query: { match: "Spain vs Argentina" }, headers: {} }, first);
    const nonce = first.body.accepts[0].nonce;

    const paid = mockRes();
    await handler(
      {
        query: { match: "Spain vs Argentina" },
        headers: { "x-payment": "inj-x402-test", "x-payment-nonce": nonce }
      },
      paid
    );
    assert.equal(paid.statusCode, 200);
    assert.equal(paid.body.ok, true);
    assert.equal(paid.body.paid, true);
    assert.ok(paid.body.signal);
    assert.equal(paid.body.signal.matchup.home, "ESP");
    assert.equal(paid.body.signal.matchup.away, "ARG");
    assert.ok(paid.body.settlement.txHash.startsWith("0x"));
    assert.ok(paid.body.intel.includes("Striker Model"));
  });

  it("rejects replayed nonce with 409", async () => {
    const first = mockRes();
    await handler({ query: { match: "FRA vs ESP" }, headers: {} }, first);
    const nonce = first.body.accepts[0].nonce;
    const headers = {
      "x-payment": "inj-x402-replay",
      "x-payment-nonce": nonce
    };

    const ok = mockRes();
    await handler({ query: { match: "FRA vs ESP" }, headers }, ok);
    assert.equal(ok.statusCode, 200);

    const replay = mockRes();
    await handler({ query: { match: "FRA vs ESP" }, headers }, replay);
    assert.equal(replay.statusCode, 409);
    assert.match(replay.body.error, /Replay/i);
  });
});
