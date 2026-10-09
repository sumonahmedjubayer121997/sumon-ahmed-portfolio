/**
 * The synthesiser behind lib/sound.ts, loaded only once someone turns sound on.
 * Every sound is generated with the Web Audio API (no audio files). Pitches come
 * from a C-major pentatonic scale, so sounds that overlap never clash.
 */

const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
const at = (i: number) => SCALE[Math.max(0, Math.min(SCALE.length - 1, Math.round(i)))];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Collisions slower than this (px/s) are resting contact, not hits. */
const IMPACT_MIN = 90;
/** Map hover: one note per colour group (projects, writing, research, profile). */
const GROUP_ROOT = [0, 2, 3, 4];

interface ToneOptions {
  type?: OscillatorType;
  /** Delay from now, s. */
  delay?: number;
  dur?: number;
  gain?: number;
  attack?: number;
  /** Pitch multiplier reached by the end (a pluck or chirp). */
  slide?: number;
}

export function createVoices(ctx: AudioContext) {
  // Quiet master level into a limiter, so a burst of sounds never clips.
  const out = ctx.createGain();
  out.gain.value = 0.32;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -16;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  out.connect(limiter).connect(ctx.destination);

  function tone(
    freq: number,
    { type = 'sine', delay = 0, dur = 0.25, gain = 0.3, attack = 0.004, slide = 0 }: ToneOptions = {},
  ) {
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  let noise: AudioBuffer | null = null;
  /** Filtered noise sweeping up (opening) or down (closing). */
  function swish(up: boolean) {
    const len = 0.22;
    if (!noise) {
      noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(up ? 500 : 2400, t);
    band.frequency.exponentialRampToValueAtTime(up ? 2400 : 500, t + len);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.11, t + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(band).connect(env).connect(out);
    src.start(t);
  }

  // Impacts: at most ~10 a second, never closer than 40 ms.
  let lastHit = 0;
  let windowStart = 0;
  let hits = 0;
  let lastNote = 0;

  let held: { env: GainNode; oscs: OscillatorNode[] } | null = null;

  return {
    /** A collision: harder is louder and a little lower; bigger bodies sound lower. */
    impact(speed: number, size: number) {
      if (speed < IMPACT_MIN) return;
      const now = ctx.currentTime;
      if (now - windowStart > 1) {
        windowStart = now;
        hits = 0;
      }
      if (hits >= 10 || now - lastHit < 0.04) return;
      hits++;
      lastHit = now;
      const k = clamp01((speed - IMPACT_MIN) / 1100);
      const bySize = 8 - ((Math.min(70, Math.max(15, size)) - 15) / 55) * 7;
      tone(at(bySize - k * 2), { type: 'triangle', dur: 0.06 + k * 0.14, gain: 0.05 + k * 0.22 });
    },
    /** Picking up a node. */
    grab() {
      tone(at(2), { type: 'triangle', dur: 0.05, gain: 0.07 });
    },
    /** Letting go: a pluck, higher for a faster throw. */
    release(speed: number) {
      tone(at(3 + speed / 600), { type: 'triangle', dur: 0.32, gain: 0.14, slide: 0.7 });
    },
    open: () => swish(true),
    close: () => swish(false),
    select() {
      tone(at(7), { type: 'triangle', dur: 0.1, gain: 0.12 });
    },
    lab(on: boolean) {
      tone(at(on ? 2 : 5), { type: 'square', dur: 0.09, gain: 0.05 });
      tone(at(on ? 5 : 2), { type: 'square', delay: 0.08, dur: 0.14, gain: 0.05 });
    },
    sent() {
      tone(at(7), { dur: 0.6, gain: 0.2 });
      tone(at(9), { delay: 0.12, dur: 0.9, gain: 0.18 });
    },
    /** Sound switched on / off. */
    on() {
      tone(at(4), { dur: 0.14, gain: 0.12 });
      tone(at(7), { delay: 0.07, dur: 0.22, gain: 0.12 });
    },
    off() {
      tone(at(5), { dur: 0.16, gain: 0.1, slide: 0.75 });
    },
    /** Map hover: the note of a colour group. */
    note(group: number) {
      const now = ctx.currentTime;
      if (now - lastNote < 0.06) return;
      lastNote = now;
      tone(at(GROUP_ROOT[group] ?? 0), { dur: 0.4, gain: 0.1 });
    },
    /** Map pin: an open chord on the group's note. */
    chord(group: number) {
      const root = GROUP_ROOT[group] ?? 0;
      [0, 2, 4].forEach((step, i) => tone(at(root + step), { delay: i * 0.03, dur: 1.1, gain: 0.08 }));
    },
    /** Hero: a soft swell while the pointer is held down (the particles gather). */
    holdStart() {
      if (held) return;
      const t = ctx.currentTime;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.05, t + 0.35);
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 900;
      low.connect(env).connect(out);
      const oscs = [at(0), at(3)].map((f) => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.connect(low);
        o.start(t);
        return o;
      });
      held = { env, oscs };
    },
    holdEnd() {
      if (!held) return;
      const { env, oscs } = held;
      held = null;
      const t = ctx.currentTime;
      env.gain.cancelScheduledValues(t);
      env.gain.setValueAtTime(env.gain.value, t);
      env.gain.linearRampToValueAtTime(0, t + 0.4);
      for (const o of oscs) o.stop(t + 0.45);
    },
  };
}

export type Voices = ReturnType<typeof createVoices>;
