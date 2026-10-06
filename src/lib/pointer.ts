/**
 * Global, mutable pointer state. Physics systems read it every frame; nothing
 * here triggers React renders.
 */
export interface PointerState {
  /** Viewport (client) coordinates in CSS px. */
  x: number;
  y: number;
  /** Instantaneous velocity in px/s (smoothed). */
  vx: number;
  vy: number;
  /** True while the pointer is over the document (or a touch is in progress). */
  active: boolean;
  down: boolean;
  type: string;
  lastMove: number;
}

export const pointer: PointerState = {
  x: -9999,
  y: -9999,
  vx: 0,
  vy: 0,
  active: false,
  down: false,
  type: 'mouse',
  lastMove: 0,
};

let installed = false;

export function installPointer() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const onMove = (e: PointerEvent) => {
    const now = e.timeStamp || performance.now();
    const dt = Math.max((now - pointer.lastMove) / 1000, 1 / 240);
    if (pointer.active && dt < 0.1) {
      const k = 0.35;
      pointer.vx += ((e.clientX - pointer.x) / dt - pointer.vx) * k;
      pointer.vy += ((e.clientY - pointer.y) / dt - pointer.vy) * k;
    } else {
      pointer.vx = 0;
      pointer.vy = 0;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.type = e.pointerType;
    pointer.active = true;
    pointer.lastMove = now;
  };

  const onDown = (e: PointerEvent) => {
    onMove(e);
    pointer.down = true;
  };

  const onUp = (e: PointerEvent) => {
    pointer.down = false;
    // Touch has no hover: release the pointer so fields relax back to rest.
    if (e.pointerType !== 'mouse') pointer.active = false;
  };

  const onLeave = () => {
    pointer.active = false;
    pointer.down = false;
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);
}
