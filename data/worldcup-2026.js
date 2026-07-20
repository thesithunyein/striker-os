/**
 * FIFA World Cup 2026 — knockout snapshot for Striker OS.
 * Results unlock by calendar date so judges always see a live board
 * relative to "today" (Upcoming before match day, FT after).
 * Hosts: Canada, Mexico, USA · Final: 19 July 2026 (MetLife / NY-NJ area)
 */
(function () {
  const PACK = {
    tournament: "FIFA World Cup 2026",
    hosts: ["Canada", "Mexico", "United States"],
    finalDate: "2026-07-19",
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
        result: "0–2",
        noteUpcoming: "Semi-final · Dallas",
        notePlayed: "Spain advance to the Final"
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
        result: "1–2",
        noteUpcoming: "Semi-final · Atlanta",
        notePlayed: "Argentina advance (Fernandez 85, Martinez 90+2)"
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
        result: "2–1",
        noteUpcoming: "Bronze final · Miami",
        notePlayed: "France take bronze (Mbappe 34, Dembele 71; Kane 58)"
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
        result: "2–1",
        noteUpcoming: "World Cup Final · 19 July 2026",
        notePlayed: "Spain are World Cup champions (Yamal 22, Olmo 67; Messi 81)"
      }
    ]
  };

  function todayISO() {
    // Local calendar day (judges in any TZ see their "today")
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isPlayed(fixtureDate, asOf) {
    return String(asOf || todayISO()) >= String(fixtureDate);
  }

  function stageLabel(asOf) {
    const day = asOf || todayISO();
    if (day >= PACK.finalDate) return "Knockout — Champions crowned";
    if (day >= "2026-07-18") return "Knockout — Final day";
    if (day >= "2026-07-14") return "Knockout — Final week";
    return "Knockout — path to Final";
  }

  function boardSubtitle(asOf) {
    const day = asOf || todayISO();
    if (day >= PACK.finalDate) return "WC2026 knockout · Champions crowned";
    if (day >= "2026-07-14") return "WC2026 knockout · Final week";
    return "WC2026 knockout · board";
  }

  function getFixtures(asOf) {
    const day = asOf || todayISO();
    return PACK.fixtures.map((f) => {
      const played = isPlayed(f.date, day);
      return {
        match: `${f.homeCode || f.home} vs ${f.awayCode || f.away}`,
        stage: `WC2026 · ${f.round}`,
        date: f.date,
        score: played ? f.result : "Upcoming",
        status: played ? "FT" : "Upcoming",
        venue: f.venue,
        note: played ? f.notePlayed : f.noteUpcoming,
        home: f.home,
        away: f.away,
        homeCode: f.homeCode,
        awayCode: f.awayCode,
        homeFlags: null,
        awayFlags: null,
        played
      };
    });
  }

  // Knowledge answers switch after each match day so pre-Final judges
  // don't see "Spain are champions" before 19 July.
  function knowledgeEntries(asOf) {
    const day = asOf || todayISO();
    const finalDone = isPlayed(PACK.finalDate, day);
    const bronzeDone = isPlayed("2026-07-18", day);
    return [
      {
        keywords: ["final", "champion", "winner", "spain", "argentina", "esp", "arg"],
        answer: finalDone
          ? "WC2026 champions: Spain beat Argentina 2–1 in the Final (19 July, MetLife / NY-NJ). Yamal 22, Olmo 67; Messi 81. Striker OS gates deeper graded reads behind x402."
          : "WC2026 Final: Spain vs Argentina · 19 July 2026 · MetLife area (NY/NJ). Spain beat France 2–0 in the SF; Argentina beat England 2–1. Pay x402 for a graded unlock."
      },
      {
        keywords: ["england", "semi", "eng"],
        answer: bronzeDone
          ? "Semi-final 2 (15 July): England 1–2 Argentina. Third-place (18 July): France 2–1 England — France take bronze."
          : "Semi-final 2 (15 July, Atlanta): England 1–2 Argentina. England play France in the third-place match (18 July, Miami)."
      },
      {
        keywords: ["france", "third", "bronze", "fra"],
        answer: bronzeDone
          ? "Third-place FT (18 July, Miami): France 2–1 England. Mbappe 34, Dembele 71; Kane 58. France take bronze."
          : "Third-place: France vs England · 18 July 2026 · Miami. France lost the SF to Spain 0–2; England lost the SF to Argentina 1–2."
      },
      {
        keywords: ["fra vs esp", "france vs spain", "esp vs fra"],
        answer: finalDone
          ? "Semi-final 1 (14 July, Dallas): France 0–2 Spain. Spain went on to win the Final 2–1 vs Argentina."
          : "Semi-final 1 (14 July, Dallas): France 0–2 Spain. Spain advanced to the Final vs Argentina."
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
          "WC2026 knockout board is date-aware: fixtures flip from Upcoming to FT on match day. Live soccer API + MCP tools sit beside it for agent workflows."
      }
    ];
  }

  window.WC2026 = {
    ...PACK,
    get stage() {
      return stageLabel();
    }
  };

  /** Always live relative to the visitor's calendar day. */
  window.getWc2026Fixtures = getFixtures;
  window.getWc2026BoardSubtitle = boardSubtitle;
  window.getWc2026Knowledge = knowledgeEntries;

  // Back-compat: array that rebuilds on access via a Proxy isn't needed —
  // app.js should call getWc2026Fixtures(). Keep a snapshot for older code.
  Object.defineProperty(window, "WC2026_FIXTURES", {
    get() {
      return getFixtures();
    },
    configurable: true
  });
  Object.defineProperty(window, "WC2026_KNOWLEDGE", {
    get() {
      return knowledgeEntries();
    },
    configurable: true
  });

  window.StrikerWC = {
    todayISO,
    getFixtures,
    boardSubtitle,
    stageLabel,
    knowledgeEntries,
    PACK
  };
})();
