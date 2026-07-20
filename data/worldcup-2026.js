/**
 * FIFA World Cup 2026 — knockout snapshot for Striker OS.
 * Primary board data for judges / screenshots (post-Final, updated 20 July 2026).
 * Hosts: Canada, Mexico, USA · Final: 19 July 2026 (MetLife / NY-NJ area)
 */
window.WC2026 = {
  tournament: "FIFA World Cup 2026",
  hosts: ["Canada", "Mexico", "United States"],
  stage: "Knockout — Champions crowned",
  updated: "2026-07-20",
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
      score: "2–1",
      status: "FT",
      note: "France take bronze (Mbappe 34, Dembele 71; Kane 58)"
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
      score: "2–1",
      status: "FT",
      note: "Spain are World Cup champions (Yamal 22, Olmo 67; Messi 81)"
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
    keywords: ["final", "champion", "winner", "spain", "argentina", "esp", "arg"],
    answer:
      "WC2026 champions: Spain beat Argentina 2–1 in the Final (19 July, MetLife / NY-NJ). Yamal 22, Olmo 67; Messi 81. Spain also beat France 2–0 in the SF; Argentina beat England 2–1. Striker OS gates deeper graded reads behind x402."
  },
  {
    keywords: ["england", "semi", "eng"],
    answer:
      "Semi-final 2 (15 July, Atlanta): England 1–2 Argentina. Third-place (18 July, Miami): France 2–1 England — France take bronze."
  },
  {
    keywords: ["france", "third", "bronze", "fra"],
    answer:
      "Third-place FT (18 July, Miami): France 2–1 England. Mbappe 34, Dembele 71; Kane 58. France take bronze; England finish fourth."
  },
  {
    keywords: ["fra vs esp", "france vs spain", "esp vs fra"],
    answer:
      "Semi-final 1 (14 July, Dallas): France 0–2 Spain. Spain went on to win the Final 2–1 vs Argentina."
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
      "WC2026 knockout board is loaded from the Striker OS World Cup pack (updated post-Final). Live soccer API + MCP tools (worldcup_fixtures) sit beside it for agent workflows."
  }
];
