/**
 * Striker OS — lightweight Web Audio SFX (no external files).
 * Works in all modern browsers; respects mute + reduced-motion preference for volume.
 */
(function () {
  const KEY = "striker_sfx_muted";
  let ctx = null;
  let muted = localStorage.getItem(KEY) === "1";

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    const c = ac();
    if (!c || muted) return;
    const t0 = when != null ? when : c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    }
    const v = (vol != null ? vol : 0.08) * (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.5 : 1);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol) {
    const c = ac();
    if (!c || muted) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    src.buffer = buf;
    gain.gain.value = vol != null ? vol : 0.12;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    src.start();
  }

  const Sfx = {
    isMuted() {
      return muted;
    },
    setMuted(on) {
      muted = !!on;
      localStorage.setItem(KEY, muted ? "1" : "0");
      if (!muted) ac();
      return muted;
    },
    toggle() {
      return Sfx.setMuted(!muted);
    },
    unlock() {
      ac();
    },
    click() {
      tone(880, 0.04, "square", 0.04);
    },
    tab() {
      tone(520, 0.05, "triangle", 0.05);
      tone(780, 0.06, "triangle", 0.03, ac()?.currentTime + 0.04);
    },
    kick() {
      noiseBurst(0.08, 0.1);
      tone(120, 0.12, "sine", 0.14, undefined, 40);
    },
    goal() {
      const c = ac();
      if (!c || muted) return;
      const t = c.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => {
        tone(f, 0.22, "square", 0.07, t + i * 0.08);
      });
      tone(1318, 0.35, "triangle", 0.05, t + 0.35);
    },
    blocked() {
      tone(180, 0.15, "sawtooth", 0.1, undefined, 80);
      noiseBurst(0.1, 0.08);
    },
    miss() {
      tone(320, 0.2, "triangle", 0.06, undefined, 120);
    },
    success() {
      tone(660, 0.08, "square", 0.06);
      tone(990, 0.12, "square", 0.05, ac()?.currentTime + 0.07);
    },
    warn() {
      tone(240, 0.1, "sawtooth", 0.06);
      tone(200, 0.12, "sawtooth", 0.05, ac()?.currentTime + 0.08);
    },
    pay() {
      tone(440, 0.06, "square", 0.05);
      tone(550, 0.08, "square", 0.05, ac()?.currentTime + 0.05);
      tone(880, 0.14, "triangle", 0.06, ac()?.currentTime + 0.12);
    }
  };

  window.StrikerSfx = Sfx;
})();
