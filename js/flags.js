/**
 * Country flags + club badges.
 * - Nations: PNG from flagcdn.com (FIFA / ISO2 / common names)
 * - Clubs (Live soccer API): TheSportsDB team badges, then nation flag fallback
 */
(function () {
  const ISO_BY_FIFA = {
    FRA: "fr",
    ESP: "es",
    ENG: "gb-eng",
    ARG: "ar",
    GER: "de",
    BRA: "br",
    MEX: "mx",
    USA: "us",
    CAN: "ca",
    POR: "pt",
    NED: "nl",
    BEL: "be",
    CRO: "hr",
    URU: "uy",
    COL: "co",
    JPN: "jp",
    KOR: "kr",
    SEN: "sn",
    MAR: "ma",
    SUI: "ch",
    POL: "pl",
    WAL: "gb-wls",
    SCO: "gb-sct",
    IRN: "ir",
    AUS: "au",
    ECU: "ec",
    CRC: "cr",
    TUN: "tn",
    CMR: "cm",
    GHA: "gh",
    SRB: "rs",
    DEN: "dk",
    SWE: "se",
    NOR: "no",
    AUT: "at",
    CZE: "cz",
    UKR: "ua",
    RSA: "za",
    EGY: "eg",
    QAT: "qa",
    KSA: "sa",
    IRQ: "iq",
    PAN: "pa",
    PER: "pe",
    CHI: "cl",
    PAR: "py",
    BOL: "bo",
    VEN: "ve",
    HON: "hn",
    JAM: "jm",
    NZL: "nz",
    CHN: "cn",
    IDN: "id",
    THA: "th",
    VNM: "vn",
    IND: "in",
    TUR: "tr",
    RUS: "ru",
    ITA: "it"
  };

  const ISO_BY_NAME = {
    France: "fr",
    Spain: "es",
    England: "gb-eng",
    Argentina: "ar",
    Germany: "de",
    Brazil: "br",
    Mexico: "mx",
    "United States": "us",
    USA: "us",
    Canada: "ca",
    Portugal: "pt",
    Netherlands: "nl",
    Belgium: "be",
    Croatia: "hr",
    Uruguay: "uy",
    Colombia: "co",
    Japan: "jp",
    "South Korea": "kr",
    Senegal: "sn",
    Morocco: "ma",
    Switzerland: "ch",
    Poland: "pl",
    Wales: "gb-wls",
    Scotland: "gb-sct",
    Iran: "ir",
    Australia: "au",
    Ecuador: "ec",
    "Costa Rica": "cr",
    Tunisia: "tn",
    Cameroon: "cm",
    Ghana: "gh",
    Serbia: "rs",
    Denmark: "dk",
    Sweden: "se",
    Norway: "no",
    Austria: "at",
    "Czech Republic": "cz",
    Ukraine: "ua",
    "South Africa": "za",
    Egypt: "eg",
    Qatar: "qa",
    "Saudi Arabia": "sa",
    Iraq: "iq",
    Panama: "pa",
    Peru: "pe",
    Chile: "cl",
    Paraguay: "py",
    Bolivia: "bo",
    Venezuela: "ve",
    Italy: "it",
    Turkey: "tr",
    "New Zealand": "nz",
    // Common clubs (live soccer API) → home nation
    Arsenal: "gb-eng",
    "West Ham United": "gb-eng",
    "West Ham": "gb-eng",
    "Leeds United": "gb-eng",
    Leeds: "gb-eng",
    "Coventry City": "gb-eng",
    Coventry: "gb-eng",
    Liverpool: "gb-eng",
    Chelsea: "gb-eng",
    "Manchester United": "gb-eng",
    "Manchester City": "gb-eng",
    "Man United": "gb-eng",
    "Man City": "gb-eng",
    Tottenham: "gb-eng",
    "Tottenham Hotspur": "gb-eng",
    "Aston Villa": "gb-eng",
    "Newcastle United": "gb-eng",
    Brighton: "gb-eng",
    "Brighton & Hove Albion": "gb-eng",
    Fulham: "gb-eng",
    Brentford: "gb-eng",
    "Crystal Palace": "gb-eng",
    Everton: "gb-eng",
    "Wolverhampton Wanderers": "gb-eng",
    Wolves: "gb-eng",
    "Nottingham Forest": "gb-eng",
    Bournemouth: "gb-eng",
    "AFC Bournemouth": "gb-eng",
    "Ipswich Town": "gb-eng",
    "Leicester City": "gb-eng",
    Southampton: "gb-eng",
    Barcelona: "es",
    "Real Madrid": "es",
    "Atletico Madrid": "es",
    "Bayern Munich": "de",
    "Borussia Dortmund": "de",
    "Paris Saint-Germain": "fr",
    PSG: "fr",
    Juventus: "it",
    Inter: "it",
    "Inter Milan": "it",
    Milan: "it",
    "AC Milan": "it"
  };

  const ISO_BY_LEAGUE = {
    "english premier league": "gb-eng",
    "premier league": "gb-eng",
    "la liga": "es",
    "serie a": "it",
    bundesliga: "de",
    "ligue 1": "fr",
    "eredivisie": "nl",
    "primeira liga": "pt",
    mls: "us",
    "major league soccer": "us"
  };

  const PLACEHOLDER_SVG =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18" viewBox="0 0 24 18">' +
        '<rect width="24" height="18" fill="#1b2350"/>' +
        '<text x="12" y="12" text-anchor="middle" fill="#9aa6d6" font-size="8" font-family="sans-serif">?</text>' +
        "</svg>"
    );

  function resolveIso2(team, league) {
    if (!team || team === "TBD" || /winner|loser/i.test(String(team))) return null;
    const t = String(team).trim();
    const upper = t.toUpperCase();

    // Real FIFA / ISO codes only (not ARS from "Arsenal")
    if (/^[A-Z]{3}$/.test(upper) && ISO_BY_FIFA[upper]) return ISO_BY_FIFA[upper];
    if (/^[a-z]{2}(-[a-z]{3})?$/i.test(t) && t.length <= 6) return t.toLowerCase();

    if (ISO_BY_NAME[t]) return ISO_BY_NAME[t];

    // Case-insensitive / partial club match
    const lower = t.toLowerCase();
    for (const name of Object.keys(ISO_BY_NAME)) {
      if (name.toLowerCase() === lower) return ISO_BY_NAME[name];
    }
    for (const name of Object.keys(ISO_BY_NAME)) {
      const n = name.toLowerCase();
      if (lower.includes(n) || n.includes(lower)) return ISO_BY_NAME[name];
    }

    if (league) {
      const L = String(league).toLowerCase();
      for (const key of Object.keys(ISO_BY_LEAGUE)) {
        if (L.includes(key)) return ISO_BY_LEAGUE[key];
      }
    }
    return null;
  }

  function flagUrl(iso2, size) {
    if (!iso2) return PLACEHOLDER_SVG;
    const w = size || 40;
    return `https://flagcdn.com/w${w}/${iso2}.png`;
  }

  function flagSrcSet(iso2) {
    if (!iso2) return "";
    return `https://flagcdn.com/w40/${iso2}.png 1x, https://flagcdn.com/w80/${iso2}.png 2x`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function badgeImgHtml(badgeUrl, alt) {
    if (!badgeUrl) return "";
    const safe = escapeHtml(badgeUrl);
    return (
      `<img class="team-flag team-badge" src="${safe}"` +
      ` width="28" height="28" alt="${escapeHtml(alt)} badge" loading="lazy" decoding="async"` +
      ` onerror="this.onerror=null;this.classList.remove('team-badge');this.src='${PLACEHOLDER_SVG}'" />`
    );
  }

  function singleFlagImg(iso, alt) {
    if (!iso) {
      return `<span class="flag-fallback" title="${escapeHtml(alt)}">?</span>`;
    }
    const src = flagUrl(iso, 40);
    const srcset = flagSrcSet(iso);
    return (
      `<img class="team-flag" src="${src}"` +
      (srcset ? ` srcset="${srcset}"` : "") +
      ` width="28" height="21" alt="${escapeHtml(alt)} flag" loading="lazy" decoding="async"` +
      ` onerror="this.onerror=null;this.src='${PLACEHOLDER_SVG}'" />`
    );
  }

  function flagImgHtml(team, label, league) {
    const iso = resolveIso2(team, league);
    return singleFlagImg(iso, label || team || "Team");
  }

  /** Dual flags for TBD knockout slots (e.g. Winner SF2 = ENG|ARG). */
  function flagStackHtml(codes, label) {
    const list = (codes || []).map((c) => resolveIso2(c)).filter(Boolean);
    if (!list.length) {
      return `<span class="flag-fallback" title="${escapeHtml(label || "TBD")}">TBD</span>`;
    }
    if (list.length === 1) return singleFlagImg(list[0], label);
    return (
      `<span class="flag-stack" title="${escapeHtml(label || "")}" aria-label="${escapeHtml(label || "TBD")}">` +
      list.map((iso, i) => singleFlagImg(iso, (codes && codes[i]) || iso)).join("") +
      `</span>`
    );
  }

  /**
   * @param {string} codeOrName
   * @param {string} displayName
   * @param {string[]} [extraFlags]
   * @param {{ badge?: string, league?: string }} [opts]
   */
  function teamRowHtml(codeOrName, displayName, extraFlags, opts) {
    opts = opts || {};
    const name = displayName || codeOrName || "TBD";
    let flags;
    if (opts.badge) {
      flags = badgeImgHtml(opts.badge, name);
    } else if (Array.isArray(extraFlags) && extraFlags.length) {
      flags = flagStackHtml(extraFlags, name);
    } else {
      // Try code, then display name, then league nation
      const iso =
        resolveIso2(codeOrName, opts.league) ||
        resolveIso2(displayName, opts.league);
      flags = singleFlagImg(iso, name);
    }
    return `<div class="fixture-team">${flags}<span class="fixture-team-name">${escapeHtml(name)}</span></div>`;
  }

  window.StrikerFlags = {
    resolveIso2,
    flagUrl,
    flagImgHtml,
    flagStackHtml,
    teamRowHtml,
    ISO_BY_FIFA,
    ISO_BY_NAME,
    WC_HOSTS: [
      { name: "Canada", iso: "ca" },
      { name: "Mexico", iso: "mx" },
      { name: "United States", iso: "us" }
    ]
  };
})();
