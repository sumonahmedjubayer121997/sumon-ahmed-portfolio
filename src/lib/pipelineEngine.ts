import type { Pipeline, StageVisual } from '@/data/aiLab';
import { clamp, easeInOutCubic, lerp, smoothstep } from './math';
import { rgba } from './color';

interface Particle {
  x: number;
  y: number;
  vy: number;
  lane: number;
  speed: number;
  stage: number;
  selected: boolean;
  dying: boolean;
  alpha: number;
  child: boolean;
  loopChecked: boolean;
  /** 0 = flowing forward; (0,1] = travelling back along the loop arc. */
  returning: number;
  retFrom: number;
  retTo: number;
  loopTarget: number;
}

export interface PipelineColors {
  fg: string;
  accent: string;
}

/**
 * Particle model of an AI pipeline. Each stage changes what a particle *is* —
 * documents split into chunks, chunks snap into vector rows, retrieval selects
 * a few (accent) and lets the rest fade, the LLM converges them into one answer.
 * Agent pipelines loop back from Observe to Plan.
 */
export class PipelineEngine {
  private particles: Particle[] = [];
  private spawnAcc = 0;
  private zoneW: number;
  private flash: number[];
  private rand: () => number;

  constructor(
    private pipeline: Pipeline,
    private width: number,
    private height: number,
    private maxParticles = 240,
    seed = 3,
  ) {
    this.zoneW = width / pipeline.stages.length;
    this.flash = pipeline.stages.map(() => 0);
    let s = seed;
    this.rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  private get laneTop() {
    return this.height * 0.22;
  }
  private get laneH() {
    return this.height * 0.66;
  }
  private get center() {
    return this.laneTop + this.laneH / 2;
  }

  private spawn(x: number, y: number, lane: number, stage: number, child: boolean): Particle | null {
    if (this.particles.length >= this.maxParticles) return null;
    const p: Particle = {
      x,
      y,
      vy: 0,
      lane,
      speed: 0.85 + this.rand() * 0.3,
      stage,
      selected: false,
      dying: false,
      alpha: 0,
      child,
      loopChecked: false,
      returning: 0,
      retFrom: 0,
      retTo: 0,
      loopTarget: 0,
    };
    this.particles.push(p);
    return p;
  }

  private targetY(p: Particle, v: StageVisual) {
    const spread = v.spread * this.laneH;
    let lane = p.lane;
    if (v.rows && v.rows > 1) lane = Math.round(lane * (v.rows - 1)) / (v.rows - 1);
    if (v.sink) return this.laneTop + this.laneH - 4 - p.lane * 12;
    if (v.converge && (p.selected || v.select === undefined)) return this.center;
    return this.center + (lane - 0.5) * spread;
  }

  step(dt: number) {
    const { stages } = this.pipeline;
    const n = stages.length;
    const baseSpeed = this.zoneW / 1.7;

    this.spawnAcc += this.pipeline.spawnRate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      const lane = this.rand();
      this.spawn(-6, this.center + (lane - 0.5) * stages[0].visual.spread * this.laneH, lane, 0, false);
    }

    for (let i = 0; i < this.flash.length; i++) this.flash[i] = Math.max(0, this.flash[i] - dt * 2.5);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.returning > 0) {
        p.returning = Math.min(1, p.returning + dt / 1.3);
        const r = easeInOutCubic(p.returning);
        p.x = lerp(p.retFrom, p.retTo, r);
        p.y = this.laneTop - 6 - Math.sin(Math.PI * r) * this.height * 0.14;
        p.alpha = Math.min(1, p.alpha + dt * 3);
        if (p.returning >= 1) {
          p.returning = 0;
          p.stage = p.loopTarget;
          p.loopChecked = false;
          p.vy = 0;
        }
        continue;
      }

      const s = clamp(Math.floor(p.x / this.zoneW), 0, n - 1);
      if (s !== p.stage) {
        p.stage = s;
        p.loopChecked = false;
        this.flash[s] = 1;
        const v = stages[s].visual;
        if (v.split && !p.child) {
          p.child = true;
          for (let k = 1; k < v.split; k++) {
            const c = this.spawn(p.x - k * 3, p.y, clamp(p.lane + (this.rand() - 0.5) * 0.6), s, true);
            if (c) c.alpha = p.alpha;
          }
          p.lane = clamp(p.lane + (this.rand() - 0.5) * 0.3);
        }
        if (v.select !== undefined && !p.selected) {
          p.selected = this.rand() < v.select;
          if (!p.selected) p.dying = true;
        }
      }

      const v = stages[s].visual;
      const u = (p.x - s * this.zoneW) / this.zoneW;

      if (v.loop && !p.loopChecked && u > 0.9) {
        p.loopChecked = true;
        if (this.rand() < v.loop.chance) {
          p.returning = 0.0001;
          p.retFrom = p.x;
          p.retTo = v.loop.to * this.zoneW + 4;
          p.loopTarget = v.loop.to;
          continue;
        }
      }

      const ty = this.targetY(p, v);
      p.vy += ((ty - p.y) * 38 - p.vy * 9) * dt;
      p.y += p.vy * dt;
      p.x += baseSpeed * v.speed * p.speed * dt;

      if (p.dying) p.alpha -= dt * 1.8;
      else p.alpha = Math.min(1, p.alpha + dt * 2.5);

      if (p.alpha <= 0 || p.x > this.width + 12) this.particles.splice(i, 1);
    }
  }

  /** Run the simulation forward (static frames for reduced motion). */
  prewarm(seconds: number) {
    const dt = 1 / 30;
    for (let t = 0; t < seconds; t += dt) this.step(dt);
  }

  draw(ctx: CanvasRenderingContext2D, colors: PipelineColors, activeStage: number) {
    const { stages } = this.pipeline;
    const { width: w, height: h, zoneW } = this;
    ctx.clearRect(0, 0, w, h);

    // Zones
    for (let s = 0; s < stages.length; s++) {
      const x = s * zoneW;
      if (s === activeStage) {
        ctx.fillStyle = rgba(colors.fg, 0.05);
        ctx.fillRect(x, 0, zoneW, h);
      }
      if (stages[s].visual.store) {
        ctx.strokeStyle = rgba(colors.fg, 0.16);
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 10.5, this.laneTop - 8.5, zoneW - 21, this.laneH + 17);
      }
      if (s > 0) {
        ctx.strokeStyle = rgba(colors.fg, 0.1 + this.flash[s] * 0.25);
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(x + 0.5, this.laneTop - 14);
        ctx.lineTo(x + 0.5, this.laneTop + this.laneH + 14);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const loop = stages[s].visual.loop;
      if (loop) {
        const x0 = (s + 0.95) * zoneW;
        const x1 = loop.to * zoneW + 4;
        ctx.strokeStyle = rgba(colors.fg, 0.18);
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(x0, this.laneTop - 6);
        ctx.bezierCurveTo(x0, this.laneTop - h * 0.24, x1, this.laneTop - h * 0.24, x1, this.laneTop - 6);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Answer stream at the far right.
    const last = stages[stages.length - 1].visual;
    if (last.converge) {
      const x0 = (stages.length - 0.45) * zoneW;
      const grad = ctx.createLinearGradient(x0, 0, w, 0);
      grad.addColorStop(0, rgba(colors.accent, 0));
      grad.addColorStop(1, rgba(colors.accent, 0.7));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, this.center);
      ctx.lineTo(w, this.center);
      ctx.stroke();
    }

    // Particles
    for (const p of this.particles) {
      const s = p.returning > 0 ? p.loopTarget : p.stage;
      const v = stages[s].visual;
      const prev = stages[Math.max(0, s - 1)].visual;
      const u = p.returning > 0 ? 1 : (p.x - s * zoneW) / zoneW;
      const blend = s === 0 ? 1 : smoothstep(0, 0.2, u);
      const shape = blend > 0.5 ? v.shape : prev.shape;
      const size = lerp(prev.size, v.size, blend);
      const color = p.selected || p.returning > 0 ? colors.accent : colors.fg;
      const a = clamp(p.alpha) * (p.selected ? 1 : 0.62);
      ctx.fillStyle = rgba(color, a);
      if (shape === 'doc') {
        ctx.strokeStyle = rgba(color, a);
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - 3.5 * size + 0.5, p.y - 4.5 * size + 0.5, 7 * size, 9 * size);
        ctx.fillRect(p.x - 2 * size, p.y - 2.5 * size, 4 * size, 0.8);
        ctx.fillRect(p.x - 2 * size, p.y - 0.5 * size, 4 * size, 0.8);
      } else if (shape === 'chunk') {
        const q = 3.4 * size;
        ctx.fillRect(p.x - q / 2, p.y - q / 2, q, q);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.7 * size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
