/**
 * One shared requestAnimationFrame loop for every DOM-driven physics system.
 *
 * Callbacks run in three phases per frame so layout reads never interleave with
 * style writes (which would force synchronous layout):
 *   read   → measure (getBoundingClientRect, scroll position)
 *   update → integrate physics
 *   render → write transforms / draw canvases
 *
 * The loop stops itself when nothing is subscribed.
 */
export type TickPhase = 'read' | 'update' | 'render';
export type TickFn = (dt: number, time: number) => void;

const phases: Record<TickPhase, Set<TickFn>> = {
  read: new Set(),
  update: new Set(),
  render: new Set(),
};

let rafId = 0;
let last = 0;
let elapsed = 0;

const total = () => phases.read.size + phases.update.size + phases.render.size;

function frame(now: number) {
  // Clamp dt so a backgrounded tab doesn't explode the integrators on return.
  const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 20);
  last = now;
  elapsed += dt;
  for (const fn of phases.read) fn(dt, elapsed);
  for (const fn of phases.update) fn(dt, elapsed);
  for (const fn of phases.render) fn(dt, elapsed);
  rafId = total() > 0 ? requestAnimationFrame(frame) : 0;
}

export function addTicker(fn: TickFn, phase: TickPhase = 'update'): () => void {
  phases[phase].add(fn);
  if (!rafId && typeof window !== 'undefined') {
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  return () => {
    phases[phase].delete(fn);
  };
}

export const tickerTime = () => elapsed;
