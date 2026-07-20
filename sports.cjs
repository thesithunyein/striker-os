// Shared live sports data helper for Vercel serverless functions (CommonJS).
// Pulls REAL match data from TheSportsDB. Configurable to the FIFA World Cup
// feed via STRIKER_SPORTS_KEY + STRIKER_LEAGUE_ID.

const API_KEY = process.env.STRIKER_SPORTS_KEY || "3";
const LEAGUE_ID = process.env.STRIKER_LEAGUE_ID || "4328";
const BASE = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Sports API ${res.status}`);
  return res.json();
}

function normalizeEvent(event) {
  const home = event.strHomeTeam || "TBD";
  const away = event.strAwayTeam || "TBD";
  const hs = event.intHomeScore;
  const as = event.intAwayScore;
  const played = hs !== null && hs !== undefined && hs !== "";
  return {
    id: event.idEvent,
    match: `${home} vs ${away}`,
    home,
    away,
    homeCode: null,
    awayCode: null,
    homeBadge: event.strHomeTeamBadge || null,
    awayBadge: event.strAwayTeamBadge || null,
    date: event.dateEvent || "TBD",
    time: event.strTime || "",
    stage: event.strLeague || "Soccer",
    venue: event.strVenue || "",
    score: played ? `${hs} - ${as}` : "Upcoming",
    played,
    source: "TheSportsDB (live)"
  };
}

async function getFixtures(limit = 6) {
  const out = [];
  try {
    const next = await getJson(`${BASE}/eventsnextleague.php?id=${LEAGUE_ID}`);
    if (next.events) out.push(...next.events.map(normalizeEvent));
  } catch (_) {
    /* ignore */
  }
  try {
    const past = await getJson(`${BASE}/eventspastleague.php?id=${LEAGUE_ID}`);
    if (past.events) out.push(...past.events.map(normalizeEvent));
  } catch (_) {
    /* ignore */
  }
  return out.slice(0, limit);
}

async function getMatch(query) {
  const q = (query || "").toLowerCase();
  const fixtures = await getFixtures(30);
  return (
    fixtures.find(
      (f) =>
        f.match.toLowerCase().includes(q) ||
        f.home.toLowerCase().includes(q) ||
        f.away.toLowerCase().includes(q)
    ) || null
  );
}

module.exports = { getFixtures, getMatch, API_KEY, LEAGUE_ID };
