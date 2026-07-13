/**
 * Focus-timer end sounds, synthesised with the Web Audio API so there are no
 * audio assets to ship (CSP-friendly) and so the alert can be *scheduled* on the
 * audio hardware clock - which keeps running when the tab is in the background.
 * That's what lets the chime fire on time while the user studies in another tab.
 */

export type FocusSound = { id: string; label: string };

export const FOCUS_SOUNDS: FocusSound[] = [
  { id: "chime", label: "Chime" },
  { id: "bell", label: "Bell" },
  { id: "ding", label: "Ding" },
  { id: "double", label: "Double ding" },
  { id: "marimba", label: "Marimba" },
  { id: "rise", label: "Rising notes" },
  { id: "gong", label: "Gong" },
  { id: "bowl", label: "Singing bowl" },
  { id: "digital", label: "Digital beep" },
  { id: "pulse", label: "Triple pulse" },
  { id: "soft", label: "Soft pad" },
  { id: "arcade", label: "Arcade" },
];

export const DEFAULT_SOUND = "chime";

type Ctx = AudioContext;

/** Loudness multiplier applied to every tone in a sound; set per call. */
let GAIN_SCALE = 1;

/** One enveloped tone (attack → exponential decay) scheduled at absolute `start`. */
function tone(
  ctx: Ctx,
  start: number,
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number } = {},
) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, start);
  const peak = Math.min(0.9, (opts.gain ?? 0.2) * GAIN_SCALE);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

/** Filtered noise burst - the body of gong/bowl-style sounds. */
function noise(ctx: Ctx, start: number, dur: number, cutoff: number, gain: number) {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.setValueAtTime(Math.min(0.9, gain * GAIN_SCALE), start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  src.start(start);
  src.stop(start + dur);
}

/**
 * Schedule the given sound to play at absolute audio time `at`
 * (`ctx.currentTime + secondsRemaining`). Safe to call for a far-future time.
 * `gainScale` boosts loudness (1 = preview, higher for the end alarm).
 */
export function scheduleSound(ctx: Ctx, id: string, at: number, gainScale = 1) {
  GAIN_SCALE = gainScale;
  switch (id) {
    case "bell":
      tone(ctx, at, 880, 1.8, { gain: 0.18 });
      tone(ctx, at, 880 * 2.4, 1.4, { gain: 0.06 });
      break;
    case "ding":
      tone(ctx, at, 1046, 0.5, { gain: 0.2 });
      break;
    case "double":
      tone(ctx, at, 880, 0.4, { gain: 0.18 });
      tone(ctx, at + 0.18, 1174, 0.5, { gain: 0.18 });
      break;
    case "marimba":
      [523, 659, 784].forEach((f, i) =>
        tone(ctx, at + i * 0.11, f, 0.28, { type: "triangle", gain: 0.18 }),
      );
      break;
    case "rise":
      [440, 554, 659, 880].forEach((f, i) =>
        tone(ctx, at + i * 0.12, f, 0.24, { gain: 0.16 }),
      );
      break;
    case "gong":
      noise(ctx, at, 2.4, 380, 0.16);
      tone(ctx, at, 130, 2.6, { gain: 0.14 });
      tone(ctx, at, 196, 2.2, { gain: 0.07 });
      break;
    case "bowl":
      tone(ctx, at, 320, 2.6, { gain: 0.16 });
      tone(ctx, at, 480, 2.4, { gain: 0.08 });
      noise(ctx, at, 0.4, 1200, 0.03);
      break;
    case "digital":
      tone(ctx, at, 800, 0.12, { type: "square", gain: 0.12 });
      tone(ctx, at + 0.2, 800, 0.12, { type: "square", gain: 0.12 });
      break;
    case "pulse":
      [0, 0.18, 0.36].forEach((d) => tone(ctx, at + d, 620, 0.12, { gain: 0.16 }));
      break;
    case "soft":
      tone(ctx, at, 396, 1.8, { gain: 0.14 });
      tone(ctx, at, 528, 1.8, { gain: 0.1 });
      break;
    case "arcade":
      [660, 880, 660, 990, 1320].forEach((f, i) =>
        tone(ctx, at + i * 0.09, f, 0.1, { type: "square", gain: 0.1 }),
      );
      break;
    case "chime":
    default:
      tone(ctx, at, 660, 1.1, { gain: 0.18 });
      tone(ctx, at, 990, 1.0, { gain: 0.08 });
      break;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
   White noise / ambience - looping background sounds to play while focusing.
   All synthesised (filtered noise + LFOs), so nothing to download.
   ──────────────────────────────────────────────────────────────────────────── */

export type Ambient = { id: string; label: string };

export const WHITE_NOISE: Ambient[] = [
  { id: "none", label: "None" },
  { id: "white", label: "White noise" },
  { id: "pink", label: "Pink noise" },
  { id: "brown", label: "Brown noise" },
  { id: "rain", label: "Rain" },
  { id: "ocean", label: "Ocean waves" },
  { id: "stream", label: "Stream" },
  { id: "wind", label: "Wind" },
  { id: "fire", label: "Bonfire" },
  { id: "metronome", label: "Metronome" },
  { id: "tictac", label: "Tick-tock" },
];

export const DEFAULT_NOISE = "none";

function noiseBuffer(ctx: Ctx, seconds: number, kind: "white" | "pink" | "brown") {
  const len = Math.ceil(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (kind === "white") {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (kind === "brown") {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  } else {
    // Pink noise (Paul Kellet approximation).
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
  }
  return buf;
}

/** A looping buffer with one short click, for metronome/tick-tock. */
function clickBuffer(ctx: Ctx, period: number, freq: number) {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * period), ctx.sampleRate);
  const d = buf.getChannelData(0);
  const n = Math.floor(0.03 * ctx.sampleRate);
  for (let i = 0; i < n; i++) {
    d[i] = Math.sin((2 * Math.PI * freq * i) / ctx.sampleRate) * Math.exp(-i / (n * 0.25));
  }
  return buf;
}

/**
 * Start a looping ambience on `ctx` and return a stop function (fades out).
 * Returns null for "none". Meant to run for the whole focus block.
 */
export function startAmbient(ctx: Ctx, id: string): (() => void) | null {
  if (!id || id === "none") return null;

  const out = ctx.createGain();
  out.connect(ctx.destination);
  const level = id === "metronome" || id === "tictac" ? 0.28 : 0.12;
  out.gain.setValueAtTime(0.0001, ctx.currentTime);
  out.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 0.8);

  const nodes: { stop?: () => void }[] = [];
  const loop = (buf: AudioBuffer) => {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start(); // <- was missing: without this the ambience never played
    nodes.push(s);
    return s;
  };
  const band = (type: BiquadFilterType, freq: number, q = 0.7) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  };
  const slowLfo = (rate: number, depth: number, target: AudioParam) => {
    const lfo = ctx.createOscillator();
    const g = ctx.createGain();
    lfo.frequency.value = rate;
    g.gain.value = depth;
    lfo.connect(g);
    g.connect(target);
    lfo.start();
    nodes.push(lfo);
  };

  switch (id) {
    case "white":
      loop(noiseBuffer(ctx, 4, "white")).connect(out);
      break;
    case "pink":
      loop(noiseBuffer(ctx, 4, "pink")).connect(out);
      break;
    case "brown":
      loop(noiseBuffer(ctx, 4, "brown")).connect(out);
      break;
    case "rain": {
      const hp = band("highpass", 900);
      loop(noiseBuffer(ctx, 4, "white")).connect(hp);
      hp.connect(out);
      break;
    }
    case "stream": {
      const bp = band("bandpass", 1400, 0.5);
      loop(noiseBuffer(ctx, 4, "white")).connect(bp);
      bp.connect(out);
      break;
    }
    case "wind": {
      const lp = band("lowpass", 480);
      loop(noiseBuffer(ctx, 4, "brown")).connect(lp);
      lp.connect(out);
      slowLfo(0.08, 260, lp.frequency); // gusts
      break;
    }
    case "ocean": {
      const lp = band("lowpass", 620);
      const swell = ctx.createGain();
      swell.gain.value = 0.5;
      loop(noiseBuffer(ctx, 4, "brown")).connect(lp);
      lp.connect(swell);
      swell.connect(out);
      slowLfo(0.11, 0.42, swell.gain); // wash in/out
      break;
    }
    case "fire": {
      const lp = band("lowpass", 760);
      loop(noiseBuffer(ctx, 4, "brown")).connect(lp);
      lp.connect(out);
      slowLfo(2.3, 180, lp.frequency); // flicker
      break;
    }
    case "metronome":
      loop(clickBuffer(ctx, 1.0, 1100)).connect(out);
      break;
    case "tictac":
      loop(clickBuffer(ctx, 0.5, 2200)).connect(out);
      break;
    default:
      loop(noiseBuffer(ctx, 4, "white")).connect(out);
  }

  return () => {
    try {
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
      out.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      for (const n of nodes) {
        try { (n as AudioScheduledSourceNode).stop(); } catch { /* ignore */ }
      }
    }, 450);
  };
}

/** How long (seconds) a single play of each sound roughly occupies. */
const SOUND_SPAN: Record<string, number> = {
  gong: 2.6,
  bowl: 2.6,
  bell: 1.8,
  soft: 1.8,
  chime: 1.1,
  ding: 0.5,
  double: 0.7,
  marimba: 0.6,
  rise: 0.7,
  digital: 0.35,
  pulse: 0.5,
  arcade: 0.55,
};

/**
 * Schedule the chosen sound to ring *repeatedly and loudly* starting at `startAt`,
 * so it keeps sounding until the user stops it (which closes the context and
 * cancels every scheduled repeat). All repeats are queued on the audio clock up
 * front, so the alarm keeps ringing even while the tab is backgrounded. Rings for
 * up to ~`maxSeconds` as a safety cap for a truly unattended timer.
 */
export function scheduleAlarm(
  ctx: Ctx,
  id: string,
  startAt: number,
  maxSeconds = 600,
) {
  // Repeat back-to-back (no silent gap) so it reads as one long, insistent ring
  // like a phone/alarm-clock, and play it loud.
  const gap = SOUND_SPAN[id] ?? 0.9;
  const repeats = Math.ceil(maxSeconds / gap);
  for (let i = 0; i < repeats; i++) {
    scheduleSound(ctx, id, startAt + i * gap, 4.6); // loud
  }
}
