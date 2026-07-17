/**
 * FIFA World Cup 2026 — knockout snapshot for Striker OS.
 * Primary board data for judges / screenshots (Final week context).
 * Hosts: Canada, Mexico, USA · Final: 19 July 2026 (MetLife / NY-NJ area)
 */
window.WC2026 = {
  tournament: "FIFA World Cup 2026",
  hosts: ["Canada", "Mexico", "United States"],
  stage: "Knockout — Semi-finals / Final week",
  updated: "2026-07-17",
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
      score: "1–2",
      status: "FT",
      note: "Argentina advance (Fernandez 85, Martinez 90+2)"
    },
    {
      id: "b3",
      round: "Third-place",
      date: "2026-07-18",
      home: "France",
      away: "England",
      homeCode: "FRA",
      awayCode: "ENG",
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
      away: "Argentina",
      homeCode: "ESP",
      awayCode: "ARG",
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
      "Fans need one place for live match context, prediction signals, and pay-per-query sports intel without API-key sprawl — especially during Final week.",
    injectiveAngle:
      "x402 pays for match intel per request; CCTP funds the agent wallet with native USDC; MCP exposes chain tools to AI; Agent Skills encode reusable Injective workflows."
  }
};

window.WC2026_FIXTURES = (window.WC2026.fixtures || []).map((f) => ({
  match: `${f.homeCode || f.home} vs ${f.awayCode || f.away}`,
  stage: `WC2026 · ${f.round}`,
  date: f.date,
  score: f.score || f.status || "Upcoming",
  venue: f.venue,
  note: f.note,
  home: f.home,
  away: f.away,
  homeCode: f.homeCode,
  awayCode: f.awayCode,
  homeFlags: f.homeFlags || null,
  awayFlags: f.awayFlags || null
}));

window.WC2026_KNOWLEDGE = [
  {
    keywords: ["final", "champion", "winner", "spain", "argentina"],
    answer:
      "WC2026 Final: Spain vs Argentina · 19 July 2026 · MetLife area (NY/NJ). Spain beat France 2–0 in the SF; Argentina beat England 2–1 (late comeback). Striker OS gates deeper win-probability reads behind x402."
  },
  {
    keywords: ["england", "semi"],
    answer:
      "Semi-final 2 (15 July, Atlanta): England 1–2 Argentina. Gordon 55; Fernandez 85, Martinez 90+2. England play France in the third-place match (18 July, Miami)."
  },
  {
    keywords: ["france", "third", "bronze"],
    answer:
      "Third-place: France vs England · 18 July 2026 · Miami. France lost the SF to Spain 0–2; England lost the SF to Argentina 1–2."
  },
  {
    keywords: ["inj", "injective", "x402"],
    answer:
      "Striker OS gates match intel with x402: GET /api/match-intel → HTTP 402 + USDC quote on Injective (eip155:1439) → retry with X-PAYMENT → intel unlocked. No API key signup."
  },
  {
    keywords: ["cctp", "usdc", "bridge"],
    answer:
      "CCTP path: pick source chain → burn USDC → Iris attestation → cctp_mint on Injective EVM → native USDC funds x402 spend. Wired to Injective MCP CCTP tools."
  },
  {
    keywords: ["fixtures", "schedule", "knockout", "world cup"],
    answer:
      "WC2026 knockout board is loaded from the Striker OS World Cup pack. Live soccer API + MCP tools (worldcup_fixtures) sit beside it for agent workflows."
  }
];
