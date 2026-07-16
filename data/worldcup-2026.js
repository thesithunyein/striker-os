window.WC2026_FIXTURES = [
  {
    match: "BRA vs GER",
    stage: "Quarter-final (demo)",
    date: "Jul 20, 2026"
  },
  {
    match: "ARG vs FRA",
    stage: "Quarter-final (demo)",
    date: "Jul 21, 2026"
  },
  {
    match: "ENG vs ESP",
    stage: "Semi-final (demo)",
    date: "Jul 25, 2026"
  }
];

window.WC2026_KNOWLEDGE = [
  {
    keywords: ["final", "champion", "winner"],
    answer:
      "Demo pack: The WC2026 final is a placeholder in this build. Replace this answer with your live data source or Gemini grounding."
  },
  {
    keywords: ["inj", "injective", "x402"],
    answer:
      "Striker OS uses x402 to gate match intel per query. The demo simulates HTTP 402 → USDC payment → receipt → unlock flow."
  },
  {
    keywords: ["cctp", "usdc", "bridge"],
    answer:
      "CCTP demo: burn USDC on the source chain, wait for attestation, mint native USDC on Injective, then fund x402 queries."
  },
  {
    keywords: ["fixtures", "schedule", "knockout"],
    answer:
      "Demo fixtures are loaded from a local WC2026 pack. Update `data/worldcup-2026.js` or connect a live API."
  }
];
/**
 * FIFA World Cup 2026 — knockout snapshot for Striker OS demos.
 * Hosts: Canada, Mexico, USA · Final: 19 July 2026 (MetLife / NY-NJ area)
 * Update results as the tournament progresses for live screenshots.
 */
window.WC2026 = {
  tournament: "FIFA World Cup 2026",
  hosts: ["Canada", "Mexico", "United States"],
  stage: "Knockout — Semi-finals / Final week",
  updated: "2026-07-16",
  fixtures: [
    {
      id: "sf1",
      round: "Semi-final",
      date: "2026-07-14",
      home: "France",
      away: "Spain",
      homeCode: "FRA",
      awayCode: "ESP",
      venue: "Dallas Stadium",
      score: "0–2",
      status: "FT",
      note: "Spain advance to the Final"
    },
    {
      id: "sf2",
      round: "Semi-final",
      date: "2026-07-15",
      home: "England",
      away: "Argentina",
      homeCode: "ENG",
      awayCode: "ARG",
      venue: "Atlanta Stadium",
      score: null,
      status: "Scheduled / Live window",
      note: "Winner faces Spain in the Final"
    },
    {
      id: "b3",
      round: "Third-place",
      date: "2026-07-18",
      home: "France",
      away: "Loser SF2",
      homeCode: "FRA",
      awayCode: "TBD",
      venue: "Miami Stadium",
      score: null,
      status: "Upcoming",
      note: "Bronze final"
    },
    {
      id: "final",
      round: "Final",
      date: "2026-07-19",
      home: "Spain",
      away: "Winner SF2",
      homeCode: "ESP",
      awayCode: "TBD",
      venue: "New York / New Jersey (MetLife area)",
      score: null,
      status: "Upcoming",
      note: "World Cup Final · 19 July 2026"
    }
  ],
  knowledge: {
    format:
      "48 teams · 12 groups · Round of 32 through Final. Group stage 11–27 June; knockout from 28 June; Final 19 July.",
    problem:
      "Fans need one place to combine live match context, prediction signals, and pay-per-query sports intel without API-key sprawl — especially during Final week.",
    injectiveAngle:
      "x402 pays for match intel per request; CCTP funds the agent wallet with native USDC; MCP exposes chain tools to AI; Agent Skills encode reusable Injective workflows."
  }
};
