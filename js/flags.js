/**
 * Country flags — PNG from flagcdn.com (works in all major browsers; no emoji flags).
 * Maps FIFA codes, ISO2, and common team names → flag image URL.
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
    CRC2: "cr",
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
    // Common club names (live soccer API) → home nation
    Arsenal: "gb-eng",
    "West Ham United": "gb-eng",
    "Leeds United": "gb-eng",
    "Coventry City": "gb-eng",
    Liverpool: "gb-eng",
    Chelsea: "gb-eng",
    "Manchester United": "gb-eng",
    "Manchester City": "gb-eng",
    Tottenham: "gb-eng",
    Barcelona: "es",
    "Real Madrid": "es",
    "Bayern Munich": "de",
    "Paris Saint-Germain": "fr",
    PSG: "fr"
  };

  const PLACEHOLDER_SVG =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="18" viewBox="0 0 24 18">' +
        '<rect width="24" height="18" fill="#1b2350"/>' +
        '<text x="12" y="12" text-anchor="middle" fill="#9aa6d6" font-size="8" font-family="sans-serif">?</text>' +
        "</svg>"
    );

  function resolveIso2(team) {
    if (!team || team === "TBD" || /winner|loser/i.test(team)) return null;
    const t = String(team).trim();
    if (ISO_BY_FIFA[t.toUpperCase()]) return ISO_BY_FIFA[t.toUpperCase()];
    if (ISO_BY_NAME[t]) return ISO_BY_NAME[t];
    const upper = t.toUpperCase();
    if (ISO_BY_FIFA[upper]) return ISO_BY_FIFA[upper];
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

  function flagImgHtml(team, label) {
    const iso = resolveIso2(team);
    const alt = escapeHtml(label || team || "Team");
    if (!iso) {
      return `<span class="flag-fallback" title="${alt}">TBD</span>`;
    }
    const src = flagUrl(iso, 40);
    const srcset = flagSrcSet(iso);
    return (
      `<img class="team-flag" src="${src}"` +
      (srcset ? ` srcset="${srcset}"` : "") +
      ` width="28" height="21" alt="${alt} flag" loading="lazy" decoding="async"` +
      ` onerror="this.onerror=null;this.src='${PLACEHOLDER_SVG}'" />`
    );
  }

  function teamRowHtml(codeOrName, displayName) {
    const name = displayName || codeOrName || "TBD";
    return `<div class="fixture-team">${flagImgHtml(codeOrName, name)}<span class="fixture-team-name">${escapeHtml(name)}</span></div>`;
  }

  window.StrikerFlags = {
    resolveIso2,
    flagUrl,
    flagImgHtml,
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
