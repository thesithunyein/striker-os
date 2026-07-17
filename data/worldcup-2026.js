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
      score: null,
      status: "Scheduled",
      note: "Winner faces Spain in the Final"
    },
    {
      id: "b3",
      round: "Third-place",
      date: "2026-07-18",
      home: "France",
      away: "Loser SF2 (ENG / ARG)",
      homeCode: "FRA",
      awayCode: "SF2L",
      awayFlags: ["ENG", "ARG"],
      venue: "Miami Stadium",
      score: null,
      status: "Upcoming",
      note: "Bronze final · loser of England vs Argentina"
    },
    {
      id: "final",
      round: "Final",
      date: "2026-07-19",
      home: "Spain",
      away: "Winner SF2 (ENG / ARG)",
      homeCode: "ESP",
      awayCode: "SF2W",
      awayFlags: ["ENG", "ARG"],
      venue: "New York / New Jersey (MetLife area)",
      score: null,
      status: "Upcoming",
      note: "World Cup Final · winner of England vs Argentina"
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
    keywords: ["final", "champion", "winner", "spain"],
    answer:
      "WC2026 Final week: Spain are in the Final (beat France 2–0 in the SF). The other finalist is the winner of England vs Argentina. Kickoff 19 July 2026 · MetLife area (NY/NJ). Striker OS gates deeper win-probability reads behind x402."
  },
  {
    keywords: ["england", "argentina", "semi"],
    answer:
      "Semi-final 2: England vs Argentina (15 July 2026, Atlanta). Winner meets Spain in the Final. Use Analyze → Pay x402 for a graded intel unlock."
  },
  {
    keywords: ["france", "third", "bronze"],
    answer:
      "France lost the SF to Spain (0–2) and may play the third-place match on 18 July in Miami against the loser of England/Argentina."
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
