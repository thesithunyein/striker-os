/**
 * Striker Model — a real, deterministic World Cup match predictor.
 *
 * Elo win probability + Poisson expected-goals scoreline model.
 * Runs in both Node (serverless / MCP) and the browser (same source of truth).
 *
 *   const m = StrikerModel.analyze("ESP", "ARG");
 *   m.probs        -> { home, draw, away }         (sums to 1)
 *   m.projected    -> { home, away, scoreline }    (most likely scoreline)
 *   m.markets      -> { over25, btts }             (0..1)
 *   m.edge         -> signed lean toward the favourite (0..1)
 *   m.confidence   -> "Low" | "Medium" | "High"
 *   m.factors      -> string[] of graded key factors
 *   m.summary      -> one-paragraph analyst read
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.StrikerModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // Elo + attacking/defending strength for WC2026 contenders.
  // form: last 5 results as 1 (win) / 0.5 (draw) / 0 (loss), most recent last.
  const TEAMS = {
    ESP: { name: "Spain", code: "ESP", elo: 2092, gf: 2.2, ga: 0.7, form: [1, 1, 1, 0.5, 1] },
    ARG: { name: "Argentina", code: "ARG", elo: 2088, gf: 2.0, ga: 0.8, form: [1, 1, 0.5, 1, 1] },
    FRA: { name: "France", code: "FRA", elo: 2074, gf: 2.1, ga: 0.9, form: [1, 0.5, 1, 1, 0] },
    BRA: { name: "Brazil", code: "BRA", elo: 2066, gf: 2.1, ga: 0.9, form: [1, 1, 0, 1, 0.5] },
    ENG: { name: "England", code: "ENG", elo: 2021, gf: 1.8, ga: 1.0, form: [0.5, 1, 1, 0, 0.5] },
    POR: { name: "Portugal", code: "POR", elo: 2015, gf: 1.9, ga: 1.0, form: [1, 0.5, 1, 0.5, 1] },
    NED: { name: "Netherlands", code: "NED", elo: 1998, gf: 1.8, ga: 1.0, form: [0.5, 1, 0.5, 1, 0] },
    GER: { name: "Germany", code: "GER", elo: 1994, gf: 1.9, ga: 1.1, form: [1, 0, 1, 0.5, 1] },
    CRO: { name: "Croatia", code: "CRO", elo: 1955, gf: 1.5, ga: 1.0, form: [0.5, 0.5, 1, 0, 1] },
    ITA: { name: "Italy", code: "ITA", elo: 1962, gf: 1.6, ga: 0.9, form: [1, 0.5, 0, 1, 0.5] },
    URU: { name: "Uruguay", code: "URU", elo: 1948, gf: 1.6, ga: 1.0, form: [1, 0, 0.5, 1, 0.5] },
    USA: { name: "USA", code: "USA", elo: 1868, gf: 1.5, ga: 1.2, form: [1, 0.5, 0, 0.5, 1] },
    MEX: { name: "Mexico", code: "MEX", elo: 1872, gf: 1.5, ga: 1.2, form: [0.5, 1, 0.5, 0, 1] },
    CAN: { name: "Canada", code: "CAN", elo: 1832, gf: 1.4, ga: 1.3, form: [0, 1, 0.5, 0.5, 1] },
    MAR: { name: "Morocco", code: "MAR", elo: 1904, gf: 1.5, ga: 0.9, form: [1, 1, 0.5, 0, 1] },
    JPN: { name: "Japan", code: "JPN", elo: 1888, gf: 1.6, ga: 1.0, form: [1, 0.5, 1, 0, 0.5] }
  };

  const ALIASES = {
    spain: "ESP", esp: "ESP",
    argentina: "ARG", arg: "ARG",
    france: "FRA", fra: "FRA",
    brazil: "BRA", bra: "BRA",
    england: "ENG", eng: "ENG",
    portugal: "POR", por: "POR",
    netherlands: "NED", holland: "NED", ned: "NED",
    germany: "GER", ger: "GER",
    croatia: "CRO", cro: "CRO",
    italy: "ITA", ita: "ITA",
    uruguay: "URU", uru: "URU",
    usa: "USA", "united states": "USA",
    mexico: "MEX", mex: "MEX",
    canada: "CAN", can: "CAN",
    morocco: "MAR", mar: "MAR",
    japan: "JPN", jpn: "JPN"
  };

  function formRating(form) {
    if (!form || !form.length) return 0.5;
    let weight = 0;
    let total = 0;
    form.forEach((r, i) => {
      const w = i + 1; // recent games count more
      total += r * w;
      weight += w;
    });
    return total / weight; // 0..1
  }

  // Elo expected score for A vs B (home advantage ~ neutral at a World Cup).
  function eloExpected(a, b, homeAdv) {
    return 1 / (1 + Math.pow(10, (b.elo - a.elo - homeAdv) / 400));
  }

  function poissonPmf(k, lambda) {
    let fact = 1;
    for (let i = 2; i <= k; i++) fact *= i;
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function resolveTeams(query) {
    if (!query) return null;
    const q = String(query).toLowerCase();
    const found = [];
    // Match aliases on word boundaries so "summary" can't match "mar" (Morocco).
    Object.keys(ALIASES).forEach((alias) => {
      const re = new RegExp("\\b" + alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
      const match = re.exec(q);
      if (match) found.push({ code: ALIASES[alias], idx: match.index, len: alias.length });
    });
    if (found.length < 2) return null;
    // De-dupe by team code, keep earliest position, then order by position.
    const byCode = {};
    found.forEach((f) => {
      if (!byCode[f.code] || f.idx < byCode[f.code].idx) byCode[f.code] = f;
    });
    const ordered = Object.values(byCode).sort((a, b) => a.idx - b.idx);
    if (ordered.length < 2) return null;
    return [ordered[0].code, ordered[1].code];
  }

  function analyze(homeCode, awayCode, opts) {
    opts = opts || {};
    const A = TEAMS[String(homeCode || "").toUpperCase()];
    const B = TEAMS[String(awayCode || "").toUpperCase()];
    if (!A || !B) return null;

    const homeAdv = opts.homeAdvantage || 0; // neutral WC venues
    const pA = eloExpected(A, B, homeAdv);
    const pB = 1 - pA;

    const formA = formRating(A.form);
    const formB = formRating(B.form);

    // Expected goals: blend team attack vs opponent defence, tilt by Elo & form.
    const baseA = (A.gf + B.ga) / 2;
    const baseB = (B.gf + A.ga) / 2;
    const tiltA = 0.85 + pA * 0.5 + (formA - 0.5) * 0.4;
    const tiltB = 0.85 + pB * 0.5 + (formB - 0.5) * 0.4;
    const lambdaA = Math.max(0.25, round2(baseA * tiltA));
    const lambdaB = Math.max(0.25, round2(baseB * tiltB));

    // Poisson scoreline grid.
    const MAX = 6;
    let pHomeWin = 0;
    let pDraw = 0;
    let pAwayWin = 0;
    let pOver25 = 0;
    let pBtts = 0;
    let best = { home: 0, away: 0, p: 0 };
    for (let h = 0; h <= MAX; h++) {
      for (let a = 0; a <= MAX; a++) {
        const p = poissonPmf(h, lambdaA) * poissonPmf(a, lambdaB);
        if (h > a) pHomeWin += p;
        else if (h === a) pDraw += p;
        else pAwayWin += p;
        if (h + a >= 3) pOver25 += p;
        if (h >= 1 && a >= 1) pBtts += p;
        if (p > best.p) best = { home: h, away: a, p };
      }
    }
    const norm = pHomeWin + pDraw + pAwayWin || 1;
    const probs = {
      home: round2(pHomeWin / norm),
      draw: round2(pDraw / norm),
      away: round2(pAwayWin / norm)
    };

    const favHome = probs.home >= probs.away;
    const edge = round2(Math.abs(probs.home - probs.away));
    const confidence = edge >= 0.28 ? "High" : edge >= 0.14 ? "Medium" : "Low";

    const factors = [];
    const eloGap = Math.round(A.elo - B.elo);
    factors.push(
      `Elo edge: ${eloGap >= 0 ? A.name : B.name} +${Math.abs(eloGap)} (${A.name} ${A.elo} vs ${B.name} ${B.elo}).`
    );
    factors.push(
      `Form (last 5): ${A.name} ${(formA * 100) | 0}% vs ${B.name} ${(formB * 100) | 0}%.`
    );
    factors.push(
      `Projected xG: ${A.name} ${lambdaA} — ${B.name} ${lambdaB}.`
    );
    factors.push(
      `Defensive solidity (GA/game): ${A.name} ${A.ga} vs ${B.name} ${B.ga}.`
    );
    factors.push(
      `Markets: Over 2.5 ${(round2(pOver25 / norm) * 100) | 0}% · BTTS ${(round2(pBtts / norm) * 100) | 0}%.`
    );

    const favName = favHome ? A.name : B.name;
    const favProb = Math.round((favHome ? probs.home : probs.away) * 100);
    const summary =
      `Striker Model leans ${favName} at ${favProb}% (${confidence.toLowerCase()} confidence). ` +
      `Most likely scoreline ${A.code} ${best.home}-${best.away} ${B.code}. ` +
      `Model = Elo win-probability + Poisson expected goals, graded on rolling form.`;

    return {
      matchup: { home: A.code, away: B.code, homeName: A.name, awayName: B.name },
      probs,
      projected: {
        home: best.home,
        away: best.away,
        scoreline: `${best.home}-${best.away}`,
        xgHome: lambdaA,
        xgAway: lambdaB
      },
      markets: {
        over25: round2(pOver25 / norm),
        btts: round2(pBtts / norm)
      },
      edge,
      favourite: favHome ? A.code : B.code,
      confidence,
      factors,
      summary,
      model: "Elo + Poisson xG (Striker Model v1)"
    };
  }

  function analyzeQuery(query) {
    const pair = resolveTeams(query);
    if (!pair) return null;
    return analyze(pair[0], pair[1]);
  }

  return { TEAMS, analyze, analyzeQuery, resolveTeams };
});
