/**
 * Lab mode: draws what the physics engine is doing on top of a stage's canvas —
 * each body's collision radius, the spring to its home position, its velocity
 * vector, link tension, and the pointer's force field. Same coordinate space as
 * the stage, called at the end of the stage's own render.
 */
import type { PhysicsWorld } from '@/physics/world';
import { ui } from './store';

const ACCENT = '242, 140, 40';
const INK = '21, 20, 19';
const BLUE = '41, 98, 255';

/** True when overlays should be drawn (Lab mode on, motion allowed). */
export const labActive = () => ui().labMode && !ui().reducedMotion;

export function drawLab<T>(ctx: CanvasRenderingContext2D, world: PhysicsWorld<T>) {
  ctx.save();
  ctx.font = '10px "JetBrains Mono Variable", ui-monospace, monospace';
  ctx.textBaseline = 'middle';

  // Link tension: stretched links glow accent, compressed ones blue; label = strain.
  for (const l of world.links) {
    const d = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y);
    const strain = (d - l.rest) / l.rest;
    const t = Math.min(1, Math.abs(strain) * 4);
    ctx.strokeStyle = `rgba(${strain >= 0 ? ACCENT : BLUE}, ${0.25 + t * 0.6})`;
    ctx.lineWidth = 1 + t * 1.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(l.a.x, l.a.y);
    ctx.lineTo(l.b.x, l.b.y);
    ctx.stroke();
    if (Math.abs(strain) > 0.04) {
      ctx.fillStyle = `rgba(${INK}, 0.7)`;
      ctx.fillText(
        `${strain > 0 ? '+' : ''}${Math.round(strain * 100)}%`,
        (l.a.x + l.b.x) / 2 + 4,
        (l.a.y + l.b.y) / 2 - 6,
      );
    }
  }
  ctx.setLineDash([]);

  for (const b of world.bodies) {
    // Collision radius
    ctx.strokeStyle = `rgba(${INK}, 0.18)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Spring to home: a cross at the rest position, a line whose weight is the spring force.
    const hx = b.homeX - b.x;
    const hy = b.homeY - b.y;
    const off = Math.hypot(hx, hy);
    ctx.strokeStyle = `rgba(${INK}, 0.45)`;
    ctx.beginPath();
    ctx.moveTo(b.homeX - 4, b.homeY);
    ctx.lineTo(b.homeX + 4, b.homeY);
    ctx.moveTo(b.homeX, b.homeY - 4);
    ctx.lineTo(b.homeX, b.homeY + 4);
    ctx.stroke();
    if (off > 1) {
      ctx.lineWidth = Math.min(3, 0.6 + (b.springStrength * off) / 4000);
      ctx.setLineDash([1, 3]);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.homeX, b.homeY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Velocity vector (px/s scaled to 0.12 s of travel) with speed label.
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 4) {
      const ex = b.x + b.vx * 0.12;
      const ey = b.y + b.vy * 0.12;
      const a = Math.atan2(b.vy, b.vx);
      ctx.strokeStyle = `rgb(${ACCENT})`;
      ctx.fillStyle = `rgb(${ACCENT})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 7 * Math.cos(a - 0.4), ey - 7 * Math.sin(a - 0.4));
      ctx.lineTo(ex - 7 * Math.cos(a + 0.4), ey - 7 * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(${INK}, 0.75)`;
      ctx.fillText(`${Math.round(speed)} px/s`, ex + 6, ey);
    }
  }

  // The pointer's field
  const p = world.pointer;
  if (p.active) {
    ctx.strokeStyle = `rgba(${ACCENT}, 0.45)`;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, world.pointerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(${INK}, 0.7)`;
    ctx.fillText(
      `field r=${Math.round(world.pointerRadius)}`,
      p.x + world.pointerRadius * 0.72,
      p.y - world.pointerRadius * 0.72,
    );
  }
  ctx.restore();
}
