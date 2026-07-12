/**
 * Focus-timer end sounds, synthesised with the Web Audio API so there are no
 * audio assets to ship (CSP-friendly) and so the alert can be *scheduled* on the
 * audio hardware clock — which keeps running when the tab is in the background.
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

/** Filtered noise burst — the body of gong/bowl-style sounds. */
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

/** How long (seconds) a single play of each sound roughly occupies. */
const SOUND_SPAN: Record<string, number> = {
  gong: 2.7,
  bowl: 2.7,
  bell: 1.9,
  soft: 1.9,
  chime: 1.2,
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
  const gap = (SOUND_SPAN[id] ?? 1.0) + 0.5;
  const repeats = Math.ceil(maxSeconds / gap);
  for (let i = 0; i < repeats; i++) {
    scheduleSound(ctx, id, startAt + i * gap, 3.2); // loud
  }
}
