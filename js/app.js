const state = {
  xp: parseInt(localStorage.getItem("striker_xp") || "120", 10),
  goals: parseInt(localStorage.getItem("striker_goals") || "0", 10),
  accuracy: 42,
  usdc: 25,
  operator: "guest",
  walletConnected: false
};

const API_ENDPOINT =
  window.STRIKER_API_ENDPOINT ||
  localStorage.getItem("striker_api_endpoint") ||
  "http://localhost:8787";
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
  strikePower: document.getElementById("strike-power")
};

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
  ui.walletBalance.textContent = `${state.usdc.toFixed(2)} USDC ${state.walletConnected ? "" : "(demo)"}`;
}

function addXp(amount) {
  state.xp += amount;
  localStorage.setItem("striker_xp", String(state.xp));
  updateStats();
}

async function connectWallet() {
  log("Initializing Injective wallet handshake...", "info");
  if (window.keplr) {
    try {
      await window.keplr.enable("injective-1");
      const signer = window.keplr.getOfflineSigner("injective-1");
      const accounts = await signer.getAccounts();
      const address = accounts[0]?.address || "inj_demo";
      state.walletConnected = true;
      state.operator = `${address.slice(0, 8)}...${address.slice(-4)}`;
      ui.walletConnect.textContent = "Wallet connected";
      ui.walletConnect.classList.add("btn-ghost");
      log(`Connected Keplr wallet ${state.operator}`, "success");
      addXp(20);
    } catch (error) {
      log(`Wallet connection canceled: ${error.message}`, "warn");
    }
  } else {
    state.walletConnected = false;
    state.operator = "demo_operator";
    log("Keplr not detected. Using demo operator.", "warn");
  }
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

async function payX402() {
  if (state.usdc < 0.01) {
    log("Insufficient USDC. Use CCTP to fund the wallet.", "warn");
    return;
  }
  const query = (ui.oracleInput.value || "match").slice(0, 40);
  log(`x402: requesting /api/match-intel?match=${query} ...`, "info");
  try {
    // Real x402 handshake: first request expects HTTP 402 + USDC quote.
    const first = await fetch(
      `${API_ENDPOINT}/api/match-intel?match=${encodeURIComponent(query)}`
    );
    if (first.status === 402) {
      const quote = await first.json();
      const req = quote.accepts?.[0];
      log(
        `x402: HTTP 402 quote → ${req?.maxAmountRequired || "0.01"} ${
          req?.asset || "USDC"
        } on ${req?.network || "injective"}.`,
        "info"
      );
      // Settle (facilitator in prod) and retry with the payment receipt.
      const paid = await fetch(
        `${API_ENDPOINT}/api/match-intel?match=${encodeURIComponent(query)}`,
        { headers: { "X-PAYMENT": `receipt-${Date.now()}` } }
      );
      const data = await paid.json();
      state.usdc = Math.max(0, state.usdc - 0.01);
      state.accuracy = Math.min(95, state.accuracy + 6);
      ui.oracleOut.textContent = data.intel || "Intel unlocked.";
      log("x402: payment settled, intel unlocked.", "success");
      addXp(10);
      updateStats();
      return;
    }
    if (first.ok) {
      const data = await first.json();
      ui.oracleOut.textContent = data.intel || "Intel unlocked.";
      log("x402: endpoint returned intel (already paid).", "success");
      return;
    }
    throw new Error(`status ${first.status}`);
  } catch (err) {
    // Backend not running — fall back to a local demo of the same flow.
    state.usdc = Math.max(0, state.usdc - 0.01);
    state.accuracy = Math.min(95, state.accuracy + 6);
    log(
      `x402: backend offline (${err.message}). Ran local 402 demo instead.`,
      "warn"
    );
    addXp(10);
    updateStats();
  }
}

function simulateCctp() {
  state.usdc += 50;
  log("CCTP demo: +50 USDC credited (burn → attest → mint).", "success");
  addXp(8);
  updateStats();
}

async function pingMcp() {
  log("Pinging Striker OS API /health ...", "info");
  try {
    const response = await fetch(`${MCP_ENDPOINT}/health`);
    if (response.ok) {
      const info = await response.json();
      ui.mcpStatus.textContent = "LIVE";
      log(
        `API healthy · x402: ${info.x402} · network: ${info.network} · league: ${info.leagueId}`,
        "success"
      );
      return;
    }
  } catch (error) {
    log("Backend not reachable. Start it: cd server && npm start", "warn");
  }
  ui.mcpStatus.textContent = "OFFLINE";
  log("MCP tools available via server/mcp-server.js (add to Cursor/Claude via mcp.json).", "info");
}

async function mcpUsdc() {
  log("Fetching live fixtures via backend /api/fixtures ...", "info");
  try {
    const response = await fetch(`${MCP_ENDPOINT}/api/fixtures`);
    if (response.ok) {
      const payload = await response.json();
      log(`Backend returned ${payload.count} live fixtures.`, "success");
      return;
    }
  } catch (error) {
    log("Backend offline. worldcup_fixtures is exposed as an MCP tool.", "warn");
  }
  log("MCP tool: worldcup_fixtures / worldcup_match / worldcup_teams (live data).", "info");
}

function runSkill(skill) {
  const label = {
    sentiment: "Sentiment scraper",
    prediction: "Probability solver",
    cctpSkill: "USDC / CCTP skill",
    mcpSkill: "MCP servers skill"
  }[skill];

  if (!label) return;
  log(`Agent skill activated: ${label}.`, "success");

  if (skill === "sentiment") {
    state.accuracy = Math.min(95, state.accuracy + 4);
  } else if (skill === "prediction") {
    addXp(6);
  } else if (skill === "cctpSkill") {
    addXp(4);
  } else if (skill === "mcpSkill") {
    addXp(4);
  }
  updateStats();
}

function answerFromPack(prompt) {
  const fallback =
    "Demo pack response: add a Gemini key for grounded live search. Use the fixtures panel for sample queries.";
  if (!window.WC2026_KNOWLEDGE) return fallback;
  const hit = window.WC2026_KNOWLEDGE.find((entry) =>
    entry.keywords.some((kw) => prompt.toLowerCase().includes(kw))
  );
  return hit ? hit.answer : fallback;
}

async function liveMatchIntel(prompt) {
  // Try to match the query against a live fixture and return real data.
  try {
    const fixtures = await fetchLiveFixtures(30);
    const q = prompt.toLowerCase();
    const hit = fixtures.find(
      (f) =>
        f.match.toLowerCase().split(" vs ").some((team) => q.includes(team.toLowerCase())) ||
        q.includes(f.match.toLowerCase())
    );
    if (hit) {
      return `LIVE: ${hit.match}\nStage: ${hit.stage}\nDate: ${hit.date}\nStatus: ${
        hit.played ? "Result " + hit.score : "Upcoming"
      }\nSource: live sports API`;
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
  ui.oracleOut.textContent = "Thinking...";

  // 1) Prefer real live match data.
  const live = await liveMatchIntel(prompt);
  if (live) {
    ui.oracleOut.textContent = live;
    log("Oracle answered from live sports data.", "success");
    return;
  }

  // 2) Optional Gemini grounding.
  if (!GEMINI_KEY) {
    const demo = answerFromPack(prompt);
    ui.oracleOut.textContent = demo;
    log("Oracle used offline demo pack (no live match; no Gemini key).", "info");
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
                  "You are Striker OS. Answer succinctly with World Cup context and cite only factual info."
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

function paintFixtures(fixtures, live) {
  ui.fixtureList.innerHTML = "";
  fixtures.forEach((fixture) => {
    const card = document.createElement("div");
    card.className = "fixture-card";
    card.innerHTML = `
      <div>
        <div class="fixture-title">${fixture.match}</div>
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
    badge.textContent = live ? "LIVE" : "DEMO";
    badge.className = live ? "chip chip-live" : "chip";
  }
}

async function renderFixtures() {
  const fallback = window.WC2026_FIXTURES || [];
  paintFixtures(fallback, false);
  try {
    const live = await fetchLiveFixtures(6);
    if (live.length) {
      paintFixtures(live, true);
      log(`Loaded ${live.length} live fixtures from sports API.`, "success");
    } else {
      log("Live sports API returned no fixtures; using demo pack.", "info");
    }
  } catch (err) {
    log(`Live fixtures unavailable (${err.message}); using demo pack.`, "warn");
  }
}

const arena = (() => {
  const canvas = document.getElementById("pitch");
  const ctx = canvas.getContext("2d");
  const ballStart = { x: 80, y: 130 };
  let ball = { x: ballStart.x, y: ballStart.y, vx: 0, vy: 0, r: 8, fired: false };
  let goalie = { x: 0, y: 120, dir: 1, speed: 1.8, w: 12, h: 36 };
  let dragging = false;
  let dragPoint = { x: 0, y: 0 };
  let message = "";
  let messageColor = "#2ee6a8";

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
  }

  function drawPitch() {
    ctx.fillStyle = "#0b1030";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(146, 204, 65, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    ctx.strokeRect(canvas.width - 80, canvas.height / 2 - 50, 70, 100);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 42, 0, Math.PI * 2);
    ctx.stroke();
  }

  function updateBall() {
    if (!ball.fired) return;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= 0.985;
    ball.vy *= 0.985;

    if (ball.y - ball.r < 6 || ball.y + ball.r > canvas.height - 6) {
      ball.vy *= -1;
    }
    if (ball.x - ball.r < 6) {
      ball.vx *= -1;
    }

    const gTop = goalie.y - goalie.h / 2;
    const gBottom = goalie.y + goalie.h / 2;
    if (ball.x + ball.r >= goalie.x && ball.x - ball.r <= goalie.x + goalie.w) {
      if (ball.y >= gTop && ball.y <= gBottom) {
        ball.vx = -Math.abs(ball.vx) * 1.2 - 1.2;
        message = "BLOCKED";
        messageColor = "#e76e55";
        setTimeout(reset, 1200);
      }
    }

    const goalTop = canvas.height / 2 - 35;
    const goalBottom = canvas.height / 2 + 35;
    if (ball.x + ball.r >= canvas.width - 14) {
      if (ball.y >= goalTop && ball.y <= goalBottom) {
        ball.vx = 0;
        ball.vy = 0;
        message = "GOAL!";
        messageColor = "#92cc41";
        state.goals += 1;
        localStorage.setItem("striker_goals", String(state.goals));
        addXp(10);
        updateStats();
        setTimeout(reset, 1200);
      } else {
        ball.vx *= -0.8;
      }
    }
  }

  function drawBall() {
    ctx.fillStyle = "#f7d51d";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a2300";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawGoalie() {
    if (!message) {
      goalie.y += goalie.speed * goalie.dir;
      if (goalie.y < canvas.height / 2 - 45 || goalie.y > canvas.height / 2 + 45) {
        goalie.dir *= -1;
      }
    }
    ctx.fillStyle = "#e76e55";
    ctx.fillRect(goalie.x, goalie.y - goalie.h / 2, goalie.w, goalie.h);
  }

  function drawMessage() {
    if (!message) return;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, canvas.height / 2 - 24, canvas.width, 48);
    ctx.fillStyle = messageColor;
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 + 6);
  }

  function drawDrag() {
    if (!dragging) return;
    ctx.strokeStyle = "#7ae3ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(dragPoint.x, dragPoint.y);
    ctx.stroke();
  }

  function loop() {
    drawPitch();
    drawGoalie();
    updateBall();
    drawBall();
    drawDrag();
    drawMessage();
    requestAnimationFrame(loop);
  }

  function kick(power, angle) {
    if (ball.fired) return;
    const rad = (angle * Math.PI) / 180;
    ball.vx = (power / 8) * Math.cos(rad);
    ball.vy = (power / 8) * Math.sin(rad);
    ball.fired = true;
    message = "";
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

  canvas.addEventListener("mousedown", (event) => {
    const pos = getPos(event);
    const dist = Math.hypot(pos.x - ball.x, pos.y - ball.y);
    if (dist < 20 && !ball.fired) {
      dragging = true;
      dragPoint = pos;
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    dragPoint = getPos(event);
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
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
  });

  window.addEventListener("resize", resize);

  resize();
  loop();

  return { kick };
})();

ui.walletConnect.addEventListener("click", connectWallet);
ui.techCards.forEach((card) =>
  card.addEventListener("click", () => toggleTech(card.dataset.tech))
);

document.getElementById("btn-x402").addEventListener("click", payX402);
const x402LogBtn = document.getElementById("btn-x402-log");
if (x402LogBtn) {
  x402LogBtn.addEventListener("click", () => {
    log("x402 demo receipt: tx# demo-402-001, status confirmed.", "success");
  });
}

document.getElementById("btn-cctp").addEventListener("click", simulateCctp);
const cctpLogBtn = document.getElementById("btn-cctp-log");
if (cctpLogBtn) {
  cctpLogBtn.addEventListener("click", () => {
    log("CCTP demo: burn → attestation → mint verified (demo).", "success");
  });
}

document.getElementById("btn-mcp-ping").addEventListener("click", pingMcp);
document.getElementById("btn-mcp-usdc").addEventListener("click", mcpUsdc);
document.getElementById("btn-oracle").addEventListener("click", runOracle);
document.getElementById("btn-shoot").addEventListener("click", () => {
  arena.kick(parseInt(ui.strikePower.value, 10), parseInt(ui.strikeAngle.value, 10));
});

document.querySelectorAll(".skill-btn").forEach((button) => {
  button.addEventListener("click", () => runSkill(button.dataset.skill));
});

ui.strikeAngle.addEventListener("input", (event) => {
  ui.angleVal.textContent = `${event.target.value}°`;
});
ui.strikePower.addEventListener("input", (event) => {
  ui.powerVal.textContent = `${event.target.value}`;
});

renderFixtures();
updateStats();
log("Striker OS ready. Demo mode active.", "success");
(() => {
  "use strict";

  const state = {
    xp: Number(localStorage.getItem("striker_xp")) || 120,
    goals: Number(localStorage.getItem("striker_goals")) || 0,
    usdc: Number(localStorage.getItem("striker_usdc")) || 25,
    accuracy: 42,
    walletConnected: false,
    walletAddress: "",
    x402Paid: false,
    cctpReady: false,
    mcpOnline: true,
    activeTech: "x402",
  };

  const els = {
    balance: document.getElementById("wallet-balance"),
    connectBtn: document.getElementById("wallet-connect"),
    operator: document.getElementById("operator-name"),
    xp: document.getElementById("stat-xp"),
    goals: document.getElementById("stat-goals"),
    accuracy: document.getElementById("stat-accuracy"),
    usdcStat: document.getElementById("stat-usdc"),
    console: document.getElementById("live-console"),
    fixtures: document.getElementById("fixture-list"),
    oracleOut: document.getElementById("oracle-output"),
    queryInput: document.getElementById("sports-query"),
    angle: document.getElementById("strike-angle"),
    power: document.getElementById("strike-power"),
    angleVal: document.getElementById("angle-val"),
    powerVal: document.getElementById("power-val"),
    mcpStatus: document.getElementById("mcp-status"),
  };

  function log(message, kind = "info") {
    const p = document.createElement("p");
    if (kind === "ok") p.className = "ok";
    else if (kind === "pay") p.className = "pay";
    else if (kind === "bridge") p.className = "bridge";
    else if (kind === "warn") p.className = "warn";
    p.textContent = `> ${message}`;
    els.console.appendChild(p);
    els.console.scrollTop = els.console.scrollHeight;
  }

  function persist() {
    localStorage.setItem("striker_xp", String(state.xp));
    localStorage.setItem("striker_goals", String(state.goals));
    localStorage.setItem("striker_usdc", String(state.usdc.toFixed(2)));
  }

  function refreshStats() {
    els.xp.textContent = String(state.xp);
    els.goals.textContent = String(state.goals);
    els.accuracy.textContent = `${state.accuracy}%`;
    els.usdcStat.textContent = `$${state.usdc.toFixed(2)}`;
    els.balance.textContent = state.walletConnected
      ? `${state.usdc.toFixed(2)} USDC`
      : `${state.usdc.toFixed(2)} USDC (demo)`;
  }

  function addXp(n) {
    state.xp += n;
    persist();
    refreshStats();
  }

  function beep(freq = 440, ms = 80) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, ms);
    } catch (_) {
      /* audio optional */
    }
  }

  /* ---------- World Cup fixtures ---------- */
  function renderFixtures() {
    const data = window.WC2026;
    if (!data) return;
    els.fixtures.innerHTML = "";
    data.fixtures.forEach((fx) => {
      const row = document.createElement("div");
      row.className = "fixture";
      row.innerHTML = `
        <div>
          <div class="teams">${fx.homeCode} vs ${fx.awayCode}</div>
          <div class="meta">${fx.round} · ${fx.date} · ${fx.venue}</div>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem;">
          <span class="score">${fx.score || fx.status}</span>
          <button class="btn" type="button" data-analyze="${fx.id}">Analyze</button>
        </div>`;
      els.fixtures.appendChild(row);
    });

    els.fixtures.querySelectorAll("[data-analyze]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fx = data.fixtures.find((f) => f.id === btn.getAttribute("data-analyze"));
        if (!fx) return;
        els.queryInput.value = `World Cup 2026 ${fx.round}: ${fx.home} vs ${fx.away} at ${fx.venue}. Current status: ${fx.score || fx.status}. ${fx.note}. Give concise fan intel and prediction angles.`;
        runOracle();
      });
    });
  }

  /* ---------- Tech tabs ---------- */
  function setTech(id) {
    state.activeTech = id;
    document.querySelectorAll(".tech-card").forEach((el) => {
      el.classList.toggle("active", el.dataset.tech === id);
    });
    document.querySelectorAll(".tech-demo").forEach((el) => {
      el.classList.toggle("active", el.dataset.demo === id);
    });
  }

  /* ---------- Wallet (Keplr / demo) ---------- */
  async function connectWallet() {
    log("Connecting Injective wallet (chain-id injective-1)...");
    if (window.keplr) {
      try {
        await window.keplr.enable("injective-1");
        const signer = window.keplr.getOfflineSigner("injective-1");
        const accounts = await signer.getAccounts();
        const addr = accounts[0].address;
        state.walletConnected = true;
        state.walletAddress = addr;
        els.operator.textContent = `${addr.slice(0, 10)}…${addr.slice(-4)}`;
        els.connectBtn.textContent = "Connected";
        log(`Keplr connected: ${addr}`, "ok");
        addXp(25);
        beep(620);
        refreshStats();
        return;
      } catch (err) {
        log(`Keplr aborted: ${err.message}`, "warn");
      }
    }
    const demo = "inj1demo" + Math.random().toString(16).slice(2, 10);
    state.walletConnected = true;
    state.walletAddress = demo;
    els.operator.textContent = `${demo.slice(0, 12)}…`;
    els.connectBtn.textContent = "Demo wallet";
    log(`No Keplr detected — using local demo address ${demo}`, "warn");
    refreshStats();
  }

  /* ---------- x402 flow (educational client demo) ---------- */
  /**
   * Mirrors the HTTP 402 Payment Required pattern used by x402 on Injective:
   * request → 402 quote → signed USDC payment → retry with receipt → data.
   * Production path: @injectivelabs/x402 middleware on an Express endpoint.
   */
  function runX402() {
    const fee = 0.01;
    log("GET /api/match-intel → HTTP 402 Payment Required", "pay");
    log(`Quote: ${fee} USDC on Injective · facilitator settles ~650ms`, "pay");

    if (state.usdc < fee) {
      log("Insufficient USDC. Run CCTP deposit first.", "warn");
      beep(180, 120);
      return;
    }

    state.usdc = Number((state.usdc - fee).toFixed(2));
    state.x402Paid = true;
    state.accuracy = Math.min(state.accuracy + 8, 95);
    persist();
    refreshStats();

    log("PAYMENT-SIGNATURE attached · facilitator confirmed receipt", "pay");
    log("200 OK · match intel unlocked for this session", "ok");
    els.oracleOut.textContent =
      "x402 receipt accepted.\n\nUnlocked: Final-week prediction pack (ESP path + ENG/ARG SF2).\nFee: 0.01 USDC · settlement model: Injective single-block finality.\n\nWire this to a real endpoint with @injectivelabs/x402 for mainnet payments.";
    addXp(15);
    beep(720);
  }

  /* ---------- CCTP flow ---------- */
  function runCctp() {
    log("CCTP V2: prepare native USDC deposit into Injective", "bridge");
    log("Tool map: cctp_supported_chains → burn on source → cctp_attestation_status → cctp_mint", "bridge");
    setTimeout(() => {
      state.usdc = Number((state.usdc + 50).toFixed(2));
      state.cctpReady = true;
      persist();
      refreshStats();
      log("Attestation complete · minted +50.00 native USDC on Injective (demo)", "ok");
      log("Wallet funded for x402 pay-per-query sports intel", "ok");
      addXp(10);
      beep(880, 100);
    }, 450);
  }

  /* ---------- MCP ---------- */
  function pingMcp() {
    log("MCP: listing Injective tools (docs + trading + USDC/CCTP)...");
    els.mcpStatus.textContent = "SYNCING";
    setTimeout(() => {
      state.mcpOnline = true;
      els.mcpStatus.textContent = "ACTIVE";
      log("MCP ok · sample tools: usdc_native_info, cctp_attestation_status, markets, bank balances", "ok");
      log("Pair with InjectiveLabs/mcp-server in Claude / Cursor for live chain calls", "ok");
      beep(520);
    }, 280);
  }

  function mcpUsdcInfo() {
    log("MCP tool call: usdc_native_info", "ok");
    els.oracleOut.textContent = [
      "usdc_native_info (demo response shape)",
      "─────────────────────────────",
      "symbol: USDC",
      "decimals: 6",
      "cctp_domain: Injective",
      "use: fund agent wallet → pay x402 match-intel fees",
      "",
      "Install: https://github.com/InjectiveLabs/mcp-server",
    ].join("\n");
    addXp(8);
  }

  /* ---------- Agent Skills ---------- */
  const skills = {
    sentiment: () => {
      log("Agent Skill: fan sentiment scraper (X + match threads)", "ok");
      state.accuracy = Math.min(state.accuracy + 4, 95);
      refreshStats();
      els.oracleOut.textContent =
        "Sentiment Skill\n───────────────\nESP final path: elevated confidence after SF win vs FRA.\nENG/ARG SF2: polarized fan volume — high engagement, volatile odds.\nSignal: prefer late markets once SF2 clears.";
      addXp(8);
    },
    prediction: () => {
      log("Agent Skill: probability matrix for Final week", "ok");
      const paid = state.x402Paid ? "x402 boost ON (+spread compression)" : "x402 boost OFF (pay fee for sharper band)";
      els.oracleOut.textContent = [
        "Probability Solver",
        "─────────────────",
        "Spain Final appearance: high (completed SF)",
        "ENG vs ARG SF2: near coin-flip band pending live form",
        "Final winner (pre-SF2): ESP slight favorite if ARG advances; tighter if ENG",
        paid,
      ].join("\n");
      addXp(10);
    },
    cctpSkill: () => {
      log("Agent Skill: injective-usdc-integration / CCTP recovery checklist", "ok");
      els.oracleOut.textContent = [
        "USDC / CCTP Skill",
        "─────────────────",
        "1. Confirm source chain burn tx",
        "2. Poll cctp_attestation_status (Iris)",
        "3. cctp_mint on Injective EVM when attested",
        "4. Map EVM address ↔ Cosmos denom for balances",
        "",
        "Skill pack: InjectiveLabs/agent-skills → injective-usdc-integration",
      ].join("\n");
      addXp(8);
    },
    mcpSkill: () => {
      log("Agent Skill: injective-mcp-servers setup guidance", "ok");
      els.oracleOut.textContent = [
        "MCP Servers Skill",
        "─────────────────",
        "npx skills add InjectiveLabs/agent-skills --skill injective-mcp-servers",
        "",
        "Servers:",
        "• Documentation MCP — grounded Injective docs",
        "• Main MCP — balances, markets, CCTP, trading",
        "",
        "Use in Cursor / Claude to operate this app’s chain side.",
      ].join("\n");
      addXp(8);
    },
  };

  /* ---------- Oracle (local WC pack + optional Gemini) ---------- */
  function localOracleAnswer(query) {
    const q = (query || "").toLowerCase();
    const wc = window.WC2026;
    const lines = [
      "Striker OS Oracle · World Cup 2026 pack",
      `Updated: ${wc.updated} · Stage: ${wc.stage}`,
      "",
    ];

    if (q.includes("spain") || q.includes("esp") || q.includes("france") || q.includes("fra")) {
      lines.push("FRA 0–2 ESP (Semi-final, Dallas) — Spain are in the Final.");
    }
    if (q.includes("england") || q.includes("eng") || q.includes("argentina") || q.includes("arg")) {
      lines.push("ENG vs ARG Semi-final (Atlanta) decides Spain’s Final opponent.");
    }
    if (q.includes("final") || q.includes("19")) {
      lines.push("Final: 19 July 2026 · Spain vs Winner(ENG/ARG) · NY/NJ MetLife area.");
    }
    if (lines.length === 3) {
      lines.push(wc.knowledge.format);
      lines.push("");
      lines.push(wc.knowledge.problem);
      lines.push("");
      lines.push("Tip: click a fixture Analyze button, or pay x402 for the sharpened pack.");
    }
    lines.push("");
    lines.push(state.x402Paid ? "Session: x402 intel unlocked." : "Session: free summary only — run x402 for paid pack.");
    return lines.join("\n");
  }

  async function runOracle(custom) {
    const input = (custom || els.queryInput.value || "").trim();
    if (!input) {
      log("Enter a World Cup query first.", "warn");
      return;
    }

    log("Oracle inquiry started...");
    els.oracleOut.textContent = "Compiling match intel…";

    const apiKey =
      window.STRIKER_GEMINI_KEY ||
      localStorage.getItem("striker_gemini_key") ||
      "";

    if (!apiKey) {
      els.oracleOut.textContent = localOracleAnswer(input);
      log("Used local World Cup 2026 knowledge pack (no Gemini key).", "ok");
      addXp(12);
      beep(440);
      return;
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: input }] }],
      tools: [{ google_search: {} }],
      systemInstruction: {
        parts: [
          {
            text: "You are Striker OS, a concise World Cup 2026 analyst for Injective fans. Prefer current knockout-stage facts. Keep answers short and useful.",
          },
        ],
      },
    };

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        els.oracleOut.textContent = text;
        log("Gemini grounded oracle returned.", "ok");
        addXp(20);
      } else {
        els.oracleOut.textContent = localOracleAnswer(input);
        log("Gemini empty — fell back to local pack.", "warn");
      }
    } catch (err) {
      els.oracleOut.textContent = localOracleAnswer(input);
      log(`Oracle network error (${err.message}) — local pack used.`, "warn");
    }
  }

  /* ---------- Goal Battle canvas ---------- */
  const canvas = document.getElementById("pitch");
  const ctx = canvas.getContext("2d");
  const ballStart = { x: 70, y: 140 };
  let ball = { x: 70, y: 140, vx: 0, vy: 0, r: 8, fired: false };
  let goalie = { x: 0, y: 140, dir: 1, speed: 2.1, w: 12, h: 34 };
  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragCur = { x: 0, y: 0 };
  let msg = "";
  let msgColor = "#fff";
  let particles = [];
  let W = 0;
  let H = 0;

  function resize() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    W = canvas.width;
    H = canvas.height;
    ballStart.y = H / 2;
    goalie.x = W - 44;
    if (!ball.fired) {
      ball.x = ballStart.x;
      ball.y = ballStart.y;
    }
  }

  function posFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (cx - rect.left) * (canvas.width / rect.width),
      y: (cy - rect.top) * (canvas.height / rect.height),
    };
  }

  function shoot(power, angleDeg) {
    if (ball.fired) return;
    const rad = (angleDeg * Math.PI) / 180;
    const boost = 1 + state.accuracy / 200;
    ball.vx = (power / 9) * Math.cos(rad) * boost;
    ball.vy = (power / 9) * Math.sin(rad);
    ball.fired = true;
    msg = "";
    log(`Strike: power ${Math.round(power)} · angle ${angleDeg}° · accuracy ${state.accuracy}%`);
    beep(300, 90);
  }

  function resetBall() {
    ball.x = ballStart.x;
    ball.y = H / 2;
    ball.vx = 0;
    ball.vy = 0;
    ball.fired = false;
    msg = "";
  }

  function burst(x, y, color) {
    for (let i = 0; i < 18; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.5) * 7,
        life: 28,
        color,
      });
    }
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    const dx = dragStart.x - dragCur.x;
    const dy = dragStart.y - dragCur.y;
    const dist = Math.min(Math.hypot(dx, dy), 120);
    if (dist <= 10) return;
    const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    const power = Math.min(dist * 0.9, 100);
    els.angle.value = String(Math.max(-35, Math.min(35, angleDeg)));
    els.power.value = String(Math.round(power));
    els.angleVal.textContent = `${els.angle.value}°`;
    els.powerVal.textContent = `${els.power.value}`;
    shoot(power, Number(els.angle.value));
  }

  canvas.addEventListener("mousedown", (e) => {
    const p = posFromEvent(e);
    if (Math.hypot(p.x - ball.x, p.y - ball.y) < 26 && !ball.fired) {
      dragging = true;
      dragStart = { x: ball.x, y: ball.y };
      dragCur = p;
    }
  });
  canvas.addEventListener("mousemove", (e) => {
    if (dragging) dragCur = posFromEvent(e);
  });
  window.addEventListener("mouseup", onDragEnd);

  canvas.addEventListener(
    "touchstart",
    (e) => {
      const p = posFromEvent(e);
      if (Math.hypot(p.x - ball.x, p.y - ball.y) < 30 && !ball.fired) {
        dragging = true;
        dragStart = { x: ball.x, y: ball.y };
        dragCur = p;
        e.preventDefault();
      }
    },
    { passive: false }
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (!dragging) return;
      dragCur = posFromEvent(e);
      e.preventDefault();
    },
    { passive: false }
  );
  canvas.addEventListener("touchend", onDragEnd);

  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0a3d24";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, W - 10, H - 10);
    ctx.strokeRect(W - 78, H / 2 - 52, 73, 104);
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(W - 14, H / 2 - 32, 14, 64);
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(W - 14, H / 2 - 32, 14, 64);

    // striker marker
    ctx.fillStyle = "#2ee6a8";
    ctx.fillRect(ballStart.x - 28, H / 2 - 10, 18, 22);

    if (!msg) {
      goalie.y += goalie.speed * goalie.dir;
      if (goalie.y < H / 2 - 42 || goalie.y > H / 2 + 42) goalie.dir *= -1;
    }
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(goalie.x, goalie.y - goalie.h / 2, goalie.w, goalie.h);

    if (dragging) {
      ctx.beginPath();
      ctx.strokeStyle = "#2ee6a8";
      ctx.lineWidth = 2;
      ctx.moveTo(dragStart.x, dragStart.y);
      ctx.lineTo(dragCur.x, dragCur.y);
      ctx.stroke();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 3, 3);
      if (p.life <= 0) particles.splice(i, 1);
    }

    if (ball.fired) {
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= 0.986;
      ball.vy *= 0.986;

      if (ball.y - ball.r < 5 || ball.y + ball.r > H - 5) {
        ball.vy *= -1;
      }
      if (ball.x - ball.r < 5) ball.vx *= -1;

      const gkTop = goalie.y - goalie.h / 2;
      const gkBot = goalie.y + goalie.h / 2;
      if (
        ball.x + ball.r >= goalie.x &&
        ball.x - ball.r <= goalie.x + goalie.w &&
        ball.y >= gkTop &&
        ball.y <= gkBot
      ) {
        ball.vx = -Math.abs(ball.vx) * 1.15 - 2;
        ball.vy = (ball.y - goalie.y) * 0.35;
        msg = "BLOCKED";
        msgColor = "#ff6b6b";
        burst(ball.x, ball.y, "#ff6b6b");
        log("Keeper saved the shot.", "warn");
        setTimeout(resetBall, 1400);
      }

      const gTop = H / 2 - 32;
      const gBot = H / 2 + 32;
      if (ball.x + ball.r >= W - 14) {
        if (ball.y < gTop || ball.y > gBot) {
          ball.vx *= -0.8;
        } else if (!msg) {
          ball.vx = 0;
          ball.vy = 0;
          msg = "GOAL";
          msgColor = "#2ee6a8";
          burst(W - 14, ball.y, "#2ee6a8");
          state.goals += 1;
          persist();
          refreshStats();
          log(`Goal! Total ${state.goals}`, "ok");
          addXp(20);
          beep(900, 120);
          setTimeout(resetBall, 1400);
        }
      }
    }

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111";
    ctx.stroke();

    if (msg) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, H / 2 - 24, W, 48);
      ctx.fillStyle = msgColor;
      ctx.font = "700 18px Syne, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(msg, W / 2, H / 2 + 6);
    }

    requestAnimationFrame(frame);
  }

  /* ---------- Wire UI ---------- */
  document.querySelectorAll(".tech-card").forEach((btn) => {
    btn.addEventListener("click", () => setTech(btn.dataset.tech));
  });

  els.connectBtn.addEventListener("click", connectWallet);
  document.getElementById("btn-x402").addEventListener("click", runX402);
  document.getElementById("btn-cctp").addEventListener("click", runCctp);
  document.getElementById("btn-mcp-ping").addEventListener("click", pingMcp);
  document.getElementById("btn-mcp-usdc").addEventListener("click", mcpUsdcInfo);
  document.getElementById("btn-oracle").addEventListener("click", () => runOracle());
  document.getElementById("btn-shoot").addEventListener("click", () => {
    shoot(Number(els.power.value), Number(els.angle.value));
  });

  document.querySelectorAll("[data-skill]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fn = skills[btn.dataset.skill];
      if (fn) fn();
    });
  });

  els.angle.addEventListener("input", () => {
    els.angleVal.textContent = `${els.angle.value}°`;
  });
  els.power.addEventListener("input", () => {
    els.powerVal.textContent = els.power.value;
  });

  window.addEventListener("resize", resize);

  // boot
  renderFixtures();
  refreshStats();
  setTech("x402");
  resize();
  frame();
  log("Striker OS ready · World Cup 2026 Final week pack loaded.");
  log("Tech demos: x402 · CCTP · MCP · Agent Skills");
})();
