import { ui, useUI } from './store';
import { announce } from './announce';
import type { Voices } from './soundEngine';

/**
 * Interface sound, off by default. Turning it on (the speaker button in the nav,
 * the footer toggle, the M key or the command palette) creates the AudioContext
 * inside that click and loads the synthesiser (lib/soundEngine.ts) as its own
 * small chunk, so visitors who never turn it on download nothing. The choice is
 * remembered per browser; for a returning visitor the first click or key press
 * starts the audio, because browsers only allow sound after a gesture.
 *
 * Sounds follow actions (dragging, collisions, the palette, sending a message,
 * pinning a map point), never page loads or hovering over controls, and they
 * pause while the tab is hidden. Nothing on the site depends on hearing them.
 */

const KEY = 'sound';
type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let voices: Voices | null = null;
let loading: Promise<void> | null = null;
let lastSelect = 0;

const Ctor = (): AudioCtor | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext);

/** Starts audio. Must run inside a user gesture (click, tap or key press). */
function unlock(): Promise<void> {
  const C = Ctor();
  if (!C) return Promise.resolve();
  ctx ??= new C();
  const resumed = ctx.resume();
  loading ??= import('./soundEngine').then(
    (m) => {
      voices = m.createVoices(ctx!);
    },
    () => {
      loading = null;
    },
  );
  return Promise.all([resumed, loading]).then(() => undefined);
}

const remember = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
};

/** Plays only when sound is on, the synthesiser is loaded and audio is running. */
function play(fn: (v: Voices) => void) {
  if (!voices || !ctx || !ui().soundOn) return;
  if (ctx.state === 'running') fn(voices);
  // A suspend/resume race (hiding the tab while audio was starting) can leave it paused: recover on the next action.
  else if (!document.hidden) void ctx.resume();
}

export function setSound(on: boolean) {
  if (on && !Ctor()) {
    announce('Sound isn’t supported in this browser.');
    return;
  }
  if (on) {
    ui().setSoundOn(true);
    void unlock().then(() => play((v) => v.on()));
  } else {
    play((v) => v.off());
    ui().setSoundOn(false);
    voices?.holdEnd();
    window.setTimeout(() => {
      if (!ui().soundOn) void ctx?.suspend();
    }, 400);
  }
  remember(on);
  announce(on ? 'Sound on. Press M to turn it off.' : 'Sound off.');
}

export const toggleSound = () => setSound(!ui().soundOn);

export const sfx = {
  impact: (speed: number, size: number) => play((v) => v.impact(speed, size)),
  grab: () => play((v) => v.grab()),
  release: (speed: number) => play((v) => v.release(speed)),
  select: () => {
    lastSelect = performance.now();
    play((v) => v.select());
  },
  sent: () => play((v) => v.sent()),
  note: (group: number) => play((v) => v.note(group)),
  chord: (group: number) => play((v) => v.chord(group)),
  holdStart: () => play((v) => v.holdStart()),
  holdEnd: () => voices?.holdEnd(),
};

let started = false;

/** Once, on the client: restore the saved choice and wire store-driven sounds. */
export function initSound() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // The palette opening and closing (not when closing because an item was chosen), and Lab mode.
  useUI.subscribe((s, prev) => {
    if (s.paletteOpen !== prev.paletteOpen) {
      if (s.paletteOpen) play((v) => v.open());
      else if (performance.now() - lastSelect > 250) play((v) => v.close());
    }
    if (s.labMode !== prev.labMode) play((v) => v.lab(s.labMode));
  });

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      voices?.holdEnd();
      void ctx.suspend();
    } else if (ui().soundOn) void ctx.resume();
  });

  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    /* storage blocked */
  }
  if (saved !== 'on' || !Ctor()) return;
  ui().setSoundOn(true);
  const arm = () => {
    window.removeEventListener('pointerup', arm, true);
    window.removeEventListener('keydown', arm, true);
    if (ui().soundOn) void unlock();
  };
  window.addEventListener('pointerup', arm, true);
  window.addEventListener('keydown', arm, true);
}
