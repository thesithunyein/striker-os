// Shared live World Cup / soccer data module.
// Pulls REAL match data from TheSportsDB. Works with the free test key out of
// the box; point STRIKER_SPORTS_KEY + STRIKER_LEAGUE_ID at the FIFA World Cup
// feed (or football-data.org) for full tournament data.

const API_KEY = process.env.STRIKER_SPORTS_KEY || "3";
const LEAGUE_ID = process.env.STRIKER_LEAGUE_ID || "4328"; // default: live soccer feed
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
  const collected = [];
  try {
    const next = await getJson(`${BASE}/eventsnextleague.php?id=${LEAGUE_ID}`);
    if (next.events) collected.push(...next.events.map(normalizeEvent));
  } catch (_) {
    /* ignore, try past */
  }
  try {
    const past = await getJson(`${BASE}/eventspastleague.php?id=${LEAGUE_ID}`);
    if (past.events) collected.push(...past.events.map(normalizeEvent));
  } catch (_) {
    /* ignore */
  }
  return collected.slice(0, limit);
}

async function getMatch(query) {
  const q = (query || "").toLowerCase();
  const fixtures = await getFixtures(30);
  const hit = fixtures.find(
    (f) =>
      f.match.toLowerCase().includes(q) ||
      f.home.toLowerCase().includes(q) ||
      f.away.toLowerCase().includes(q)
  );
  return hit || null;
}

async function getTeams(leagueName = "English Premier League") {
  const data = await getJson(
    `${BASE}/search_all_teams.php?l=${encodeURIComponent(leagueName)}`
  );
  return (data.teams || []).map((t) => ({
    name: t.strTeam,
    stadium: t.strStadium,
    formed: t.intFormedYear,
    country: t.strCountry,
    badge: t.strBadge
  }));
}

export { getFixtures, getMatch, getTeams, API_KEY, LEAGUE_ID };
