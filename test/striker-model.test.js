/**
 * Striker Model unit tests — zero deps, Node built-in test runner.
 * Run:  node --test test/striker-model.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const StrikerModel = require("../lib/striker-model.js");

function approxEqual(a, b, eps = 0.02) {
  assert.ok(
    Math.abs(a - b) <= eps,
    `expected ${a} ≈ ${b} (eps ${eps})`
  );
}

describe("StrikerModel.analyze", () => {
  it("returns a full signal for ESP vs ARG", () => {
    const s = StrikerModel.analyze("ESP", "ARG");
    assert.ok(s);
    assert.equal(s.matchup.home, "ESP");
    assert.equal(s.matchup.away, "ARG");
    assert.ok(s.probs);
    assert.ok(s.projected);
    assert.ok(s.markets);
    assert.ok(Array.isArray(s.factors) && s.factors.length >= 4);
    assert.ok(s.summary.includes("Striker Model"));
    assert.equal(s.model, "Elo + Poisson xG (Striker Model v1)");
  });

  it("probabilities sum to ~1", () => {
    const s = StrikerModel.analyze("FRA", "ESP");
    const sum = s.probs.home + s.probs.draw + s.probs.away;
    approxEqual(sum, 1, 0.02);
  });

  it("markets are in [0, 1]", () => {
    const s = StrikerModel.analyze("ENG", "ARG");
    assert.ok(s.markets.over25 >= 0 && s.markets.over25 <= 1);
    assert.ok(s.markets.btts >= 0 && s.markets.btts <= 1);
  });

  it("favours Spain over France (board SF result)", () => {
    const s = StrikerModel.analyze("FRA", "ESP");
    assert.equal(s.favourite, "ESP");
    assert.ok(s.probs.away > s.probs.home);
  });

  it("favours Argentina over England (board SF result)", () => {
    const s = StrikerModel.analyze("ENG", "ARG");
    assert.equal(s.favourite, "ARG");
    assert.ok(s.probs.away > s.probs.home);
  });

  it("higher Elo team is more likely to win in a clear mismatch", () => {
    const s = StrikerModel.analyze("ESP", "CAN");
    assert.equal(s.favourite, "ESP");
    assert.ok(s.probs.home > 0.55);
    assert.ok(["Medium", "High"].includes(s.confidence));
  });

  it("is deterministic", () => {
    const a = StrikerModel.analyze("ESP", "ARG");
    const b = StrikerModel.analyze("ESP", "ARG");
    assert.deepEqual(a.probs, b.probs);
    assert.deepEqual(a.projected, b.projected);
  });

  it("returns null for unknown codes", () => {
    assert.equal(StrikerModel.analyze("XXX", "YYY"), null);
  });
});

describe("StrikerModel.analyzeQuery", () => {
  it("parses FIFA codes", () => {
    const s = StrikerModel.analyzeQuery("Match intel: France vs Spain (FRA vs ESP)");
    assert.ok(s);
    assert.equal(s.matchup.home, "FRA");
    assert.equal(s.matchup.away, "ESP");
  });

  it("parses full names", () => {
    const s = StrikerModel.analyzeQuery("Spain vs Argentina");
    assert.ok(s);
    assert.equal(s.matchup.home, "ESP");
    assert.equal(s.matchup.away, "ARG");
  });

  it("does not false-match 'summary' to Morocco (mar)", () => {
    const s = StrikerModel.analyzeQuery("Give a short match intel summary for FRA vs ESP");
    assert.ok(s);
    assert.equal(s.matchup.home, "FRA");
    assert.equal(s.matchup.away, "ESP");
    assert.notEqual(s.matchup.home, "MAR");
  });

  it("returns null when fewer than two teams", () => {
    assert.equal(StrikerModel.analyzeQuery("just spain alone"), null);
  });
});

describe("StrikerModel.resolveTeams", () => {
  it("orders by appearance in the query", () => {
    const pair = StrikerModel.resolveTeams("ENG vs ARG");
    assert.deepEqual(pair, ["ENG", "ARG"]);
  });
});
