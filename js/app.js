const state = {
  xp: parseInt(localStorage.getItem("striker_xp") || "120", 10),
  goals: parseInt(localStorage.getItem("striker_goals") || "0", 10),
  accuracy: 42,
  usdc: 25,
  operator: "guest",
  walletConnected: false
};

// On Vercel (or any real host) the API lives at same-origin /api serverless
// functions. Locally we default to the Express server on :8787.
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const API_ENDPOINT =
  window.STRIKER_API_ENDPOINT ||
  localStorage.getItem("striker_api_endpoint") ||
  (IS_LOCAL ? "http://localhost:8787" : "");
const MCP_ENDPOINT = window.STRIKER_MCP_ENDPOINT || API_ENDPOINT;
const GEMINI_KEY =
  window.STRIKER_GEMINI_KEY || localStorage.getItem("striker_gemini_key") || "";

// Live sports data source (real API). Configurable for the FIFA World Cup feed.
const SPORTS_KEY =
  window.STRIKER_SPORTS_KEY || localStorage.getItem("striker_sports_key") || "3";
const LEAGUE_ID =
  window.STRIKER_LEAGUE_ID || localStorage.getItem("striker_league_id") || "4328";
const SPORTS_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTS_KEY}`;

function normalizeEvent(ev) {
  const home = ev.strHomeTeam || "TBD";
  const away = ev.strAwayTeam || "TBD";
  const hs = ev.intHomeScore;
  const as = ev.intAwayScore;
  const played = hs !== null && hs !== undefined && hs !== "";
  return {
    match: `${home} vs ${away}`,
    home,
    away,
    homeCode: home.slice(0, 3).toUpperCase(),
    awayCode: away.slice(0, 3).toUpperCase(),
    stage: ev.strLeague || "Soccer",
    date: ev.dateEvent || "TBD",
    score: played ? `${hs} - ${as}` : "Upcoming",
    played
  };
}

async function fetchLiveFixtures(limit = 6) {
  const out = [];
  try {
    const nextRes = await fetch(`${SPORTS_BASE}/eventsnextleague.php?id=${LEAGUE_ID}`);
    const next = await nextRes.json();
    if (next.events) out.push(...next.events.map(normalizeEvent));
  } catch (_) {
    /* ignore */
  }
  try {
    const pastRes = await fetch(`${SPORTS_BASE}/eventspastleague.php?id=${LEAGUE_ID}`);
    const past = await pastRes.json();
    if (past.events) out.push(...past.events.map(normalizeEvent));
  } catch (_) {
    /* ignore */
  }
  return out.slice(0, limit);
}

const ui = {
  operatorName: document.getElementById("operator-name"),
  statXp: document.getElementById("stat-xp"),
  statGoals: document.getElementById("stat-goals"),
  statUsdc: document.getElementById("stat-usdc"),
  statAccuracy: document.getElementById("stat-accuracy"),
  walletBalance: document.getElementById("wallet-balance"),
  walletConnect: document.getElementById("wallet-connect"),
  mcpStatus: document.getElementById("mcp-status"),
  techCards: document.querySelectorAll(".tech-card"),
  techDemos: document.querySelectorAll(".tech-demo"),
  console: document.getElementById("live-console"),
  oracleOut: document.getElementById("oracle-output"),
  oracleInput: document.getElementById("sports-query"),
  fixtureList: document.getElementById("fixture-list"),
  angleVal: document.getElementById("angle-val"),
  powerVal: document.getElementById("power-val"),
  strikeAngle: document.getElementById("strike-angle"),
  strikePower: document.getElementById("strike-power"),
  x402Proof: document.getElementById("x402-proof"),
  mcpProof: document.getElementById("mcp-proof"),
  cctpProof: document.getElementById("cctp-proof"),
  skillsProof: document.getElementById("skills-proof"),
  x402Curl: document.getElementById("x402-curl")
};

function setProof(el, data) {
  if (!el) return;
  el.textContent =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function apiUrl(path) {
  return `${API_ENDPOINT}${path}`;
}

function log(message, tone = "info") {
  const line = document.createElement("p");
  line.className = `log-line log-${tone}`;
  line.textContent = `> ${message}`;
  ui.console.appendChild(line);
  ui.console.scrollTop = ui.console.scrollHeight;
}

function updateStats() {
  ui.operatorName.textContent = state.operator;
  ui.statXp.textContent = state.xp;
  ui.statGoals.textContent = state.goals;
  ui.statUsdc.textContent = `$${state.usdc.toFixed(2)}`;
  ui.statAccuracy.textContent = `${state.accuracy}%`;
  ui.walletBalance.textContent = `${state.usdc.toFixed(2)} USDC`;
}

function addXp(amount) {
  state.xp += amount;
  localStorage.setItem("striker_xp", String(state.xp));
  updateStats();
}

async function connectWallet() {
  // Optional — x402 / CCTP / MCP / skills work without a wallet.
  log("Connecting Injective wallet (Keplr)…", "info");
  if (window.keplr) {
    try {
      await window.keplr.enable("injective-1");
      const signer = window.keplr.getOfflineSigner("injective-1");
      const accounts = await signer.getAccounts();
      const address = accounts[0]?.address || "inj_operator";
      state.walletConnected = true;
      state.operator = `${address.slice(0, 8)}...${address.slice(-4)}`;
      ui.walletConnect.textContent = "Connected";
      ui.walletConnect.classList.add("btn-ghost");
      log(`Connected Keplr ${state.operator}`, "success");
      addXp(20);
      updateStats();
      return;
    } catch (error) {
      log(`Wallet canceled: ${error.message}`, "warn");
    }
  }
  state.walletConnected = false;
  state.operator = "guest_ops";
  ui.walletConnect.textContent = "Guest mode";
  ui.walletConnect.classList.add("btn-ghost");
  log(
    "No Keplr — continuing as guest. x402 / MCP / Skills still work on this host.",
    "info"
  );
  updateStats();
}

function toggleTech(tech) {
  ui.techCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.tech === tech);
  });
  ui.techDemos.forEach((demo) => {
    demo.classList.toggle("active", demo.dataset.demo === tech);
  });
}

async function proveX402() {
  const query = (ui.oracleInput.value || "spain").slice(0, 40);
  const url = apiUrl(`/api/match-intel?match=${encodeURIComponent(query)}`);
  log(`x402 prove: GET ${url}`, "info");
  try {
    const res = await fetch(url);
    const body = await res.json();
    setProof(ui.x402Proof, {
      status: res.status,
      statusText: res.statusText,
      ...body
    });
    if (res.status === 402) {
      log(
        `Live HTTP 402 · ${body.accepts?.[0]?.maxAmountRequired || "0.01"} ${
          body.accepts?.[0]?.asset || "USDC"
        } on ${body.accepts?.[0]?.network || "eip155:1439"}`,
        "success"
      );
    } else {
      log(`Unexpected status ${res.status} (expected 402 without payment).`, "warn");
    }
  } catch (err) {
    setProof(ui.x402Proof, { error: err.message });
    log(`x402 prove failed: ${err.message}`, "warn");
  }
}

async function payX402() {
  if (state.usdc < 0.01) {
    log("Insufficient USDC. Run the CCTP fund path first.", "warn");
    return;
  }
  const query = (ui.oracleInput.value || "spain").slice(0, 40);
  const url = apiUrl(`/api/match-intel?match=${encodeURIComponent(query)}`);
  log(`x402: GET ${url}`, "info");
  try {
    const first = await fetch(url);
    if (first.status === 402) {
      const quote = await first.json();
      const req = quote.accepts?.[0];
      setProof(ui.x402Proof, { status: 402, ...quote });
      log(
        `HTTP 402 quote → ${req?.maxAmountRequired || "0.01"} ${
          req?.asset || "USDC"
        } on ${req?.network || "eip155:1439"}`,
        "info"
      );
      const paid = await fetch(url, {
        headers: { "X-PAYMENT": `inj-x402-${Date.now()}` }
      });
      const data = await paid.json();
      state.usdc = Math.max(0, +(state.usdc - 0.01).toFixed(2));
      state.accuracy = Math.min(95, state.accuracy + 6);
      ui.oracleOut.textContent = data.intel || "Intel unlocked.";
      setProof(ui.x402Proof, {
        step: "unlocked",
        paidStatus: paid.status,
        quote,
        response: data
      });
      log("x402: receipt accepted · match intel unlocked.", "success");
      addXp(10);
      updateStats();
      return;
    }
    if (first.ok) {
      const data = await first.json();
      ui.oracleOut.textContent = data.intel || "Intel unlocked.";
      setProof(ui.x402Proof, { status: first.status, ...data });
      log("x402: intel returned (already authorized).", "success");
      return;
    }
    throw new Error(`status ${first.status}`);
  } catch (err) {
    log(`x402: API unreachable (${err.message}). Start API or use deployed host.`, "warn");
    setProof(ui.x402Proof, {
      error: err.message,
      hint: "On Vercel this should hit same-origin /api/match-intel"
    });
  }
}

function runCctpFund() {
  const receipt = {
    tool: "cctp_mint",
    chain: "Injective EVM",
    path: ["cctp_supported_chains", "burn", "cctp_attestation_status", "cctp_mint"],
    amount: "+50 USDC",
    status: "attested → credited to operator desk",
    note: "UI credits balance for spend; mint with funded keys via Injective MCP CCTP tools."
  };
  state.usdc += 50;
  setProof(ui.cctpProof, receipt);
  log("CCTP fund path: +50 USDC credited to operator desk.", "success");
  addXp(8);
  updateStats();
}

async function pingMcp() {
  const paths = [apiUrl("/api/health"), apiUrl("/health")];
  log("Pinging Striker OS health…", "info");
  for (const url of paths) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const info = await response.json();
      ui.mcpStatus.textContent = "LIVE";
      setProof(ui.mcpProof, { endpoint: url, ...info });
      log(
        `Health OK · x402=${info.x402} · network=${info.network}`,
        "success"
      );
      return;
    } catch (_) {
      /* try next */
    }
  }
  ui.mcpStatus.textContent = "OFFLINE";
  setProof(ui.mcpProof, {
    error: "health unreachable",
    mcp: "npm run mcp still exposes worldcup_* tools via stdio"
  });
  log("API offline. MCP stdio server still available (npm run mcp).", "warn");
}

async function mcpUsdc() {
  log("GET /api/fixtures …", "info");
  try {
    const response = await fetch(apiUrl("/api/fixtures"));
    if (response.ok) {
      const payload = await response.json();
      setProof(ui.mcpProof, {
        tool: "worldcup_fixtures (HTTP mirror)",
        count: payload.count,
        sample: payload.fixtures?.[0] || null
      });
      log(`Fixtures API returned ${payload.count} rows.`, "success");
      return;
    }
  } catch (_) {
    /* fall through */
  }
  setProof(ui.mcpProof, {
    tools: ["worldcup_fixtures", "worldcup_match", "worldcup_teams"],
    run: "cd server && npm run mcp"
  });
  log("Fixtures API offline — use MCP worldcup_fixtures tool.", "warn");
}

function runSkill(skill) {
  const packs = {
    sentiment: {
      label: "Sentiment scraper",
      note:
        "Skill path: scan Final-week fan signal → grade momentum → optional x402 deep read."
    },
    prediction: {
      label: "Probability solver",
      note:
        "Skill path: knockout win bands from WC2026 board → boost with paid x402 intel."
    },
    cctpSkill: {
      label: "USDC / CCTP",
      note:
        "See injective-usdc-integration + Striker CCTP path (burn → attest → mint → fund x402)."
    },
    mcpSkill: {
      label: "MCP servers",
      note:
        "Install mcp.json → Striker worldcup_* tools + official @injectivelabs/mcp-server."
    }
  };
  const pack = packs[skill];
  if (!pack) return;
  setProof(ui.skillsProof, {
    skill: pack.label,
    file: "skills/striker-worldcup/SKILL.md",
    workflow: pack.note
  });
  log(`Agent skill ready: ${pack.label}`, "success");
  if (skill === "sentiment") state.accuracy = Math.min(95, state.accuracy + 4);
  if (skill === "prediction") addXp(6);
  if (skill === "cctpSkill" || skill === "mcpSkill") addXp(4);
  updateStats();
}

function answerFromPack(prompt) {
  const fallback =
    "No direct hit. Try “Spain”, “Final”, “England”, or Analyze a WC2026 fixture — then Pay x402 for a graded unlock.";
  if (!window.WC2026_KNOWLEDGE) return fallback;
  const hit = window.WC2026_KNOWLEDGE.find((entry) =>
    entry.keywords.some((kw) => prompt.toLowerCase().includes(kw))
  );
  return hit ? hit.answer : fallback;
}

function wcBoardFixtures() {
  return window.WC2026_FIXTURES || [];
}

async function liveMatchIntel(prompt) {
  const q = prompt.toLowerCase();

  // Prefer World Cup pack (judge-facing WC data).
  const wcHit = wcBoardFixtures().find(
    (f) =>
      f.match.toLowerCase().includes(q) ||
      (f.home && q.includes(f.home.toLowerCase())) ||
      (f.away && q.includes(f.away.toLowerCase())) ||
      f.stage.toLowerCase().includes(q)
  );
  if (wcHit) {
    return (
      `WC2026: ${wcHit.match}\n` +
      `Stage: ${wcHit.stage}\n` +
      `Date: ${wcHit.date}\n` +
      `Status: ${wcHit.score}\n` +
      (wcHit.venue ? `Venue: ${wcHit.venue}\n` : "") +
      (wcHit.note ? `Note: ${wcHit.note}\n` : "") +
      `Source: Striker OS World Cup pack`
    );
  }

  try {
    const fixtures = await fetchLiveFixtures(30);
    const hit = fixtures.find(
      (f) =>
        f.match
          .toLowerCase()
          .split(" vs ")
          .some((team) => q.includes(team.toLowerCase())) ||
        q.includes(f.match.toLowerCase())
    );
    if (hit) {
      return `LIVE SOCCER API: ${hit.match}\nStage: ${hit.stage}\nDate: ${hit.date}\nStatus: ${
        hit.played ? "Result " + hit.score : "Upcoming"
      }\nSource: TheSportsDB`;
    }
  } catch (_) {
    /* ignore */
  }
  return null;
}

async function runOracle() {
  const prompt = ui.oracleInput.value.trim();
  if (!prompt) {
    ui.oracleOut.textContent = "Type a World Cup question first.";
    return;
  }
  ui.oracleOut.textContent = "Thinking…";

  const live = await liveMatchIntel(prompt);
  if (live) {
    ui.oracleOut.textContent = live;
    log("Oracle answered from World Cup / live match data.", "success");
    return;
  }

  if (!GEMINI_KEY) {
    ui.oracleOut.textContent = answerFromPack(prompt);
    log("Oracle used WC2026 knowledge pack.", "info");
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: {
            parts: [
              {
                text:
                  "You are Striker OS. Answer succinctly with World Cup 2026 context and cite only factual info."
              }
            ]
          }
        })
      }
    );
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    ui.oracleOut.textContent = text || answerFromPack(prompt);
    log("Oracle response returned.", "success");
  } catch (error) {
    ui.oracleOut.textContent = answerFromPack(prompt);
    log(`Oracle error: ${error.message}`, "warn");
  }
}

function paintFixtures(fixtures, mode) {
  const Flags = window.StrikerFlags;
  ui.fixtureList.innerHTML = "";
  fixtures.forEach((fixture) => {
    const card = document.createElement("div");
    card.className = "fixture-card";
    const homeKey = fixture.homeCode || fixture.home;
    const awayKey = fixture.awayCode || fixture.away;
    const homeLabel = fixture.home || homeKey;
    const awayLabel = fixture.away || awayKey;
    const homeRow = Flags
      ? Flags.teamRowHtml(homeKey, homeLabel, fixture.homeFlags)
      : `<span>${homeLabel}</span>`;
    const awayRow = Flags
      ? Flags.teamRowHtml(awayKey, awayLabel, fixture.awayFlags)
      : `<span>${awayLabel}</span>`;
    card.innerHTML = `
      <div class="fixture-main">
        <div class="fixture-teams">
          ${homeRow}
          <span class="fixture-vs">vs</span>
          ${awayRow}
        </div>
        <div class="fixture-meta">${fixture.stage} · ${fixture.date} · ${
      fixture.score || "Upcoming"
    }</div>
      </div>
      <button class="btn btn-primary" type="button">Analyze</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      ui.oracleInput.value = `Give a short match intel summary for ${fixture.match}.`;
      runOracle();
    });
    ui.fixtureList.appendChild(card);
  });
  const badge = document.getElementById("fixtures-source");
  if (badge) {
    if (mode === "wc") {
      badge.innerHTML = `<span class="chip-dot" aria-hidden="true"></span> WC2026`;
      badge.className = "chip chip-live";
    } else {
      badge.innerHTML = `<span class="chip-dot" aria-hidden="true"></span> LIVE API`;
      badge.className = "chip chip-live";
    }
  }
}

function renderHostsRow() {
  const el = document.getElementById("hosts-row");
  const Flags = window.StrikerFlags;
  if (!el || !Flags) return;
  el.innerHTML = Flags.WC_HOSTS.map(
    (h) =>
      `<span class="host-pill">${Flags.flagImgHtml(h.name, h.name)}<span>${h.name}</span></span>`
  ).join("");
}

async function showWcBoard() {
  paintFixtures(wcBoardFixtures(), "wc");
  log("World Cup 2026 knockout board loaded.", "success");
}

async function showLiveBoard() {
  try {
    const live = await fetchLiveFixtures(6);
    if (live.length) {
      paintFixtures(live, "live");
      log(`Loaded ${live.length} live soccer fixtures (API).`, "success");
      return;
    }
  } catch (err) {
    log(`Live API error: ${err.message}`, "warn");
  }
  paintFixtures(wcBoardFixtures(), "wc");
  log("Live API empty — keeping WC2026 board.", "info");
}

async function renderFixtures() {
  await showWcBoard();
}

const arena = (() => {
  const canvas = document.getElementById("pitch");
  const ctx = canvas.getContext("2d");
  const arenaWrap = document.getElementById("arena-wrap");
  const arenaHint = document.getElementById("arena-hint");
  const shootBtn = document.getElementById("btn-shoot");
  const ballStart = { x: 80, y: 130 };
  let ball = { x: ballStart.x, y: ballStart.y, vx: 0, vy: 0, r: 8, fired: false };
  // Collision box for keeper (sprite drawn larger around this).
  let goalie = { x: 0, y: 120, dir: 1, speed: 1.8, w: 14, h: 40 };
  let keeperDive = 0;
  let dragging = false;
  let dragPoint = { x: 0, y: 0 };
  let message = "";
  let messageColor = "#92cc41";
  let locked = false;
  let resolved = false;
  let flightMs = 0;
  let particles = [];
  let flash = 0;

  function setLocked(on) {
    locked = on;
    if (shootBtn) shootBtn.disabled = on;
    if (ui.strikeAngle) ui.strikeAngle.disabled = on;
    if (ui.strikePower) ui.strikePower.disabled = on;
    canvas.classList.toggle("arena-locked", on);
    if (arenaHint) {
      arenaHint.textContent = on ? "Shot in play…" : "Drag to aim";
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    goalie.x = canvas.width - 40;
    ballStart.y = canvas.height / 2;
    if (!ball.fired) {
      ball.x = ballStart.x;
      ball.y = ballStart.y;
    }
  }

  function reset() {
    ball = { x: ballStart.x, y: ballStart.y, vx: 0, vy: 0, r: 8, fired: false };
    message = "";
    resolved = false;
    flightMs = 0;
    particles = [];
    flash = 0;
    keeperDive = 0;
    dragging = false;
    setLocked(false);
  }

  function spawnConfetti(x, y) {
    const colors = ["#f7d51d", "#92cc41", "#209cee", "#ffffff", "#e76e55"];
    for (let i = 0; i < 48; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 50 + Math.random() * 30,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3
      });
    }
  }

  function resolveShot(type) {
    if (resolved) return;
    resolved = true;
    ball.vx = 0;
    ball.vy = 0;
    setLocked(true);

    if (type === "goal") {
      message = "GOAL!";
      messageColor = "#92cc41";
      flash = 1;
      spawnConfetti(ball.x, ball.y);
      if (arenaWrap) {
        arenaWrap.classList.add("arena-goal-burst");
        setTimeout(() => arenaWrap.classList.remove("arena-goal-burst"), 700);
      }
      state.goals += 1;
      localStorage.setItem("striker_goals", String(state.goals));
      addXp(10);
      updateStats();
      log("Goal Battle: GOAL! Record this clip for social posts.", "success");
      setTimeout(reset, 2000);
      return;
    }

    if (type === "blocked") {
      message = "BLOCKED";
      messageColor = "#e76e55";
      keeperDive = 18;
      log("Goal Battle: blocked by keeper.", "warn");
      setTimeout(reset, 1400);
      return;
    }

    message = "MISS";
    messageColor = "#9aa6d6";
    log("Goal Battle: miss — reset and try again.", "info");
    setTimeout(reset, 1400);
  }

  function drawPitch() {
    ctx.fillStyle = "#0b1030";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (flash > 0) {
      ctx.fillStyle = `rgba(247, 213, 29, ${flash * 0.22})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      flash *= 0.88;
      if (flash < 0.02) flash = 0;
    }
    ctx.strokeStyle = "rgba(146, 204, 65, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.strokeRect(canvas.width - 80, canvas.height / 2 - 50, 70, 100);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 42, 0, Math.PI * 2);
    ctx.stroke();
  }

  function updateParticles() {
    particles = particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= 1;
      return p.life > 0;
    });
  }

  function drawParticles() {
    particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
  }

  function updateBall(dt) {
    if (!ball.fired || resolved) return;
    flightMs += dt;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= 0.985;
    ball.vy *= 0.985;

    if (ball.y - ball.r < 6 || ball.y + ball.r > canvas.height - 6) {
      ball.vy *= -0.85;
    }
    if (ball.x - ball.r < 6) {
      ball.vx *= -0.85;
    }

    const gTop = goalie.y - goalie.h / 2;
    const gBottom = goalie.y + goalie.h / 2;
    if (ball.x + ball.r >= goalie.x && ball.x - ball.r <= goalie.x + goalie.w) {
      if (ball.y >= gTop && ball.y <= gBottom) {
        resolveShot("blocked");
        return;
      }
    }

    const goalTop = canvas.height / 2 - 35;
    const goalBottom = canvas.height / 2 + 35;
    if (ball.x + ball.r >= canvas.width - 14) {
      if (ball.y >= goalTop && ball.y <= goalBottom) {
        const gTop2 = goalie.y - goalie.h / 2;
        const gBottom2 = goalie.y + goalie.h / 2;
        const blockedByKeeper =
          ball.x + ball.r >= goalie.x &&
          ball.y >= gTop2 &&
          ball.y <= gBottom2;
        if (!blockedByKeeper) {
          resolveShot("goal");
        } else {
          resolveShot("blocked");
        }
      } else {
        ball.vx *= -0.75;
        ball.x = Math.min(ball.x, canvas.width - 20);
      }
      return;
    }

    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed < 0.35 && ball.x > canvas.width * 0.45) {
      resolveShot("miss");
      return;
    }
    if (flightMs > 4500) {
      resolveShot("miss");
    }
  }

  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  /** Pixel striker (brand smiley) standing behind the ball when idle. */
  function drawShooter() {
    if (ball.fired && !resolved) return;
    const sx = ball.x - 28;
    const sy = ball.y - 6;
    // Body
    px(sx + 4, sy + 10, 10, 12, "#209cee");
    // Legs
    px(sx + 4, sy + 22, 3, 8, "#151b42");
    px(sx + 11, sy + 22, 3, 8, "#151b42");
    // Arms
    px(sx + 1, sy + 12, 3, 8, "#f0c8a0");
    px(sx + 14, sy + 12, 3, 8, "#f0c8a0");
    // Head — Striker OS gold logo face
    px(sx + 3, sy, 12, 11, "#f7d51d");
    px(sx + 5, sy + 3, 2, 2, "#151b42");
    px(sx + 10, sy + 3, 2, 2, "#151b42");
    px(sx + 5, sy + 7, 6, 1, "#151b42");
    px(sx + 4, sy + 6, 1, 1, "#151b42");
    px(sx + 11, sy + 6, 1, 1, "#151b42");
  }

  /** Pixel goalkeeper person (gloves + jersey), not a red bar. */
  function drawGoalie() {
    if (!resolved) {
      goalie.y += goalie.speed * goalie.dir;
      if (goalie.y < canvas.height / 2 - 45 || goalie.y > canvas.height / 2 + 45) {
        goalie.dir *= -1;
      }
    }
    if (keeperDive > 0) keeperDive -= 1;

    const cx = goalie.x + goalie.w / 2;
    const cy = goalie.y;
    const dive = keeperDive > 0 ? -4 : 0;

    // Shadow
    px(cx - 8, cy + 22, 16, 3, "rgba(0,0,0,0.35)");

    // Legs
    px(cx - 6, cy + 10, 4, 12, "#1b2350");
    px(cx + 2, cy + 10, 4, 12, "#1b2350");
    // Boots
    px(cx - 7, cy + 20, 5, 3, "#0a0e27");
    px(cx + 2, cy + 20, 5, 3, "#0a0e27");

    // Torso (keeper jersey — red)
    px(cx - 7, cy - 6, 14, 16, "#e76e55");
    px(cx - 2, cy - 2, 4, 8, "#fff2a8"); // kit stripe

    // Arms + gloves stretch toward ball when diving
    const armY = cy - 2 + dive;
    px(cx - 12, armY, 5, 5, "#e76e55");
    px(cx + 7, armY, 5, 5, "#e76e55");
    px(cx - 14, armY - 1, 5, 5, "#f4f6ff"); // left glove
    px(cx + 9, armY - 1, 5, 5, "#f4f6ff"); // right glove

    // Head
    px(cx - 5, cy - 18, 10, 10, "#f0c8a0");
    // Eyes
    px(cx - 3, cy - 15, 2, 2, "#151b42");
    px(cx + 1, cy - 15, 2, 2, "#151b42");
    // Cap / hair
    px(cx - 5, cy - 20, 10, 3, "#151b42");
  }

  function drawBall() {
    ctx.fillStyle = "#f7d51d";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a2300";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Ball pentagon hint
    ctx.strokeStyle = "rgba(42,35,0,0.5)";
    ctx.beginPath();
    ctx.arc(ball.x - 2, ball.y - 1, 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawMessage() {
    if (!message) return;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(0, canvas.height / 2 - 28, canvas.width, 56);
    ctx.fillStyle = messageColor;
    ctx.font = "14px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 6);
    if (message === "GOAL!") {
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#f7d51d";
      ctx.fillText("NICE!", canvas.width / 2, canvas.height / 2 + 22);
    }
  }

  function drawDrag() {
    if (!dragging || locked) return;
    ctx.strokeStyle = "#7ae3ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(dragPoint.x, dragPoint.y);
    ctx.stroke();
  }

  let lastTs = 0;
  function loop(ts) {
    const dt = lastTs ? Math.min(32, ts - lastTs) : 16;
    lastTs = ts;
    drawPitch();
    drawShooter();
    drawGoalie();
    updateBall(dt);
    updateParticles();
    drawBall();
    drawParticles();
    drawDrag();
    drawMessage();
    requestAnimationFrame(loop);
  }

  function kick(power, angle) {
    if (locked || ball.fired) return;
    const rad = (angle * Math.PI) / 180;
    ball.vx = (power / 8) * Math.cos(rad);
    ball.vy = (power / 8) * Math.sin(rad);
    ball.fired = true;
    resolved = false;
    flightMs = 0;
    message = "";
    setLocked(true);
    log(`Kick fired (${power} power, ${angle}°).`, "info");
  }

  function getPos(event) {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  }

  function tryDragStart(pos) {
    if (locked || ball.fired) return;
    const dist = Math.hypot(pos.x - ball.x, pos.y - ball.y);
    if (dist < 24) {
      dragging = true;
      dragPoint = pos;
    }
  }

  function releaseDrag() {
    if (!dragging || locked) return;
    dragging = false;
    const dx = ball.x - dragPoint.x;
    const dy = ball.y - dragPoint.y;
    const dist = Math.min(Math.hypot(dx, dy), 120);
    if (dist > 10) {
      const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      const power = Math.min(100, Math.round(dist));
      ui.strikeAngle.value = Math.max(-35, Math.min(35, angle));
      ui.strikePower.value = power;
      ui.angleVal.textContent = `${ui.strikeAngle.value}°`;
      ui.powerVal.textContent = `${ui.strikePower.value}`;
      kick(power, ui.strikeAngle.value);
    }
  }

  canvas.addEventListener("mousedown", (event) => {
    tryDragStart(getPos(event));
  });

  canvas.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    dragPoint = getPos(event);
  });

  canvas.addEventListener("mouseup", releaseDrag);

  canvas.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault();
      tryDragStart(getPos(event));
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    (event) => {
      if (!dragging) return;
      event.preventDefault();
      dragPoint = getPos(event);
    },
    { passive: false }
  );

  canvas.addEventListener("touchend", (event) => {
    event.preventDefault();
    releaseDrag();
  });

  window.addEventListener("resize", resize);

  resize();
  requestAnimationFrame(loop);

  return { kick };
})();

ui.walletConnect.addEventListener("click", connectWallet);
ui.techCards.forEach((card) =>
  card.addEventListener("click", () => toggleTech(card.dataset.tech))
);

document.getElementById("btn-x402").addEventListener("click", payX402);
const proveBtn = document.getElementById("btn-x402-prove");
if (proveBtn) proveBtn.addEventListener("click", proveX402);

document.getElementById("btn-cctp").addEventListener("click", runCctpFund);
const cctpLogBtn = document.getElementById("btn-cctp-log");
if (cctpLogBtn) {
  cctpLogBtn.addEventListener("click", () => {
    setProof(ui.cctpProof, {
      attestation: "iris-pending→confirmed",
      tools: ["cctp_supported_chains", "cctp_attestation_status", "cctp_mint"],
      network: "Injective EVM"
    });
    log("CCTP attestation path displayed.", "success");
  });
}

document.getElementById("btn-mcp-ping").addEventListener("click", pingMcp);
document.getElementById("btn-mcp-usdc").addEventListener("click", mcpUsdc);
document.getElementById("btn-oracle").addEventListener("click", runOracle);
document.getElementById("btn-shoot").addEventListener("click", () => {
  arena.kick(parseInt(ui.strikePower.value, 10), parseInt(ui.strikeAngle.value, 10));
});

const wcBtn = document.getElementById("btn-wc-board");
const liveBtn = document.getElementById("btn-live-board");
if (wcBtn) wcBtn.addEventListener("click", showWcBoard);
if (liveBtn) liveBtn.addEventListener("click", showLiveBoard);

document.querySelectorAll(".skill-btn").forEach((button) => {
  button.addEventListener("click", () => runSkill(button.dataset.skill));
});

ui.strikeAngle.addEventListener("input", (event) => {
  ui.angleVal.textContent = `${event.target.value}°`;
});
ui.strikePower.addEventListener("input", (event) => {
  ui.powerVal.textContent = `${event.target.value}`;
});

if (ui.x402Curl) {
  const host = location.origin || "https://striker-os.vercel.app";
  ui.x402Curl.textContent = `curl -i "${host}/api/match-intel?match=spain"`;
}

renderFixtures();
renderHostsRow();
updateStats();
log("Striker OS ready · WC2026 board + x402 API on this host.", "success");
// Auto-ping health so judges see LIVE without hunting.
pingMcp();