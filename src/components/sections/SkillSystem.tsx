import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { skillGroups } from '@/content';
import { palette, rgba } from '@/lib/color';
import { createRandom } from '@/lib/random';
import { cn } from '@/lib/cn';
import { PhysicsWorld } from '@/physics/world';
import type { Body } from '@/physics/body';
import { usePhysicsWorld } from '@/hooks/usePhysicsWorld';
import { useElementSize } from '@/hooks/useElementSize';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { RevealText } from '@/components/ui/RevealText';

type SkillData = { group: string; kind: 'skill' | 'group' };

export function SkillSystem() {
  const isDesktop = useIsDesktop();
  return (
    <section id="skills" aria-labelledby="skills-title" className="section relative bg-paper">
      <div className="shell">
        <div className="grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <SectionLabel index="06">Capabilities</SectionLabel>
            <RevealText
              as="h2"
              id="skills-title"
              text="An ecosystem, not a list."
              emphasis={['ecosystem,']}
              className="t-h1 mt-8"
            />
          </div>
          <p className="max-w-[40ch] text-[0.98rem] leading-relaxed text-ink-2 md:col-span-4">
            Four groups that overlap in practice.
            {isDesktop
              ? ' Hover a group to pull it together — or drag any technology and watch the rest make room.'
              : ' Tap a group to highlight it.'}
          </p>
        </div>
        {isDesktop ? <Ecosystem /> : <SkillGroupsList />}
      </div>
    </section>
  );
}

function Ecosystem() {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const size = useElementSize(stageRef);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeGroup;
  const hoveredSkill = useRef<string | null>(null);
  const centers = useRef<Record<string, { x: number; y: number }>>({});
  const placed = useRef(false);

  const world = useMemo(() => {
    const w = new PhysicsWorld<SkillData>({
      pointerRadius: 110,
      collisionPadding: 4,
      dragStiffness: 360,
      dragDamping: 26,
    });
    for (const g of skillGroups) {
      w.add({
        id: `g:${g.id}`,
        x: 0,
        y: 0,
        pinned: true,
        radius: 60,
        springStrength: 0,
        data: { group: g.id, kind: 'group' },
      });
      for (const item of g.items) {
        w.add({
          id: item,
          x: 0,
          y: 0,
          springStrength: 0,
          friction: 3.4,
          radius: 40,
          maxVelocity: 1600,
          data: { group: g.id, kind: 'skill' },
        });
      }
    }
    // Group attraction: every technology is pulled toward its group's anchor.
    // The hovered group pulls harder (members gather); other groups are nudged away.
    w.fields.push((b) => {
      if (b.data.kind !== 'skill') return;
      const c = centers.current[b.data.group];
      if (!c) return;
      const active = activeRef.current;
      const k = active === b.data.group ? 9 : active ? 1.8 : 2.8;
      b.fx += (c.x - b.x) * k;
      b.fy += (c.y - b.y) * k;
      if (active && active !== b.data.group) {
        const ac = centers.current[active];
        const dx = b.x - ac.x;
        const dy = b.y - ac.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 320) {
          const push = (1 - d / 320) * 1100;
          b.fx += (dx / d) * push;
          b.fy += (dy / d) * push;
        }
      }
    });
    return w;
  }, []);

  // Homes, bounds and collision radii from real label sizes.
  useLayoutEffect(() => {
    const { width: W, height: H } = size;
    if (!W || !H) return;
    const r = createRandom(8);
    for (const g of skillGroups) {
      const c = { x: g.center.x * W, y: g.center.y * H };
      centers.current[g.id] = c;
      world.setHome(`g:${g.id}`, c.x, c.y, true);
      for (const item of g.items) {
        const b = world.get(item)!;
        if (!placed.current) {
          const a = r.next() * Math.PI * 2;
          const d = 90 + r.next() * 90;
          b.x = c.x + Math.cos(a) * d;
          b.y = c.y + Math.sin(a) * d;
        }
      }
    }
    for (const b of world.bodies) {
      const el = els.current.get(b.id);
      const label = el?.firstElementChild as HTMLElement | null;
      if (label) b.radius = label.offsetWidth / 2 + (b.data.kind === 'group' ? 14 : 6);
    }
    world.bounds = { minX: 0, minY: 0, maxX: W, maxY: H };
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (!placed.current) world.settle(reduced ? 4 : 1.2);
    placed.current = true;
  }, [size, world, reduced]);

  const render = useCallback(
    (w: PhysicsWorld<SkillData>) => {
      for (const b of w.bodies) {
        const el = els.current.get(b.id);
        if (el) el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0)`;
      }
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, size.width, size.height);
      const active = activeRef.current;
      for (const b of w.bodies) {
        if (b.data.kind !== 'skill') continue;
        const g = w.get(`g:${b.data.group}`)!;
        const on = active === b.data.group;
        ctx.strokeStyle = on ? rgba(palette.accent, 0.7) : rgba(palette.ink, active ? 0.04 : 0.1);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    },
    [size],
  );

  const { drag } = usePhysicsWorld(world, stageRef, {
    enabled: !reduced && size.width > 0,
    scrollInertia: 0.05,
    beforeStep: (w) => {
      for (const b of w.bodies) {
        if (b.data.kind !== 'skill') continue;
        const hovered = b.id === hoveredSkill.current;
        b.attraction = hovered ? 700 : 0;
        b.repulsion = hovered ? 0 : 420;
      }
    },
    render,
  });

  useEffect(() => {
    if (size.width) render(world);
  }, [reduced, size, world, render, activeGroup]);

  const press = (b: Body<SkillData>) => (e: ReactPointerEvent) => {
    if (!reduced) drag.onPointerDown(e, b);
  };

  return (
    <div
      ref={stageRef}
      className="relative mt-14 h-[clamp(540px,74vh,740px)] select-none"
      onPointerLeave={() => setActiveGroup(null)}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
      {skillGroups.map((g) => {
        const on = activeGroup === g.id;
        const dim = !!activeGroup && !on;
        return (
          <div key={g.id} role="group" aria-labelledby={`skill-group-${g.id}`}>
            <div
              ref={(el) => {
                if (el) els.current.set(`g:${g.id}`, el);
              }}
              className="absolute left-0 top-0 h-0 w-0 will-transform"
            >
              <button
                id={`skill-group-${g.id}`}
                type="button"
                className={cn(
                  't-label absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-3.5 py-1.5 transition-[background-color,color,border-color,opacity] duration-500',
                  on ? 'border-ink bg-ink text-ivory' : 'border-[var(--line-strong)] bg-paper text-ink',
                  dim && 'opacity-40',
                )}
                aria-pressed={on}
                onPointerEnter={() => setActiveGroup(g.id)}
                onFocus={() => setActiveGroup(g.id)}
                onBlur={() => setActiveGroup(null)}
                onClick={() => setActiveGroup(on ? null : g.id)}
              >
                {g.label}
                <span className="ml-2 opacity-50">{g.items.length}</span>
              </button>
            </div>
            <ul className="contents">
              {g.items.map((item) => (
                <li
                  key={item}
                  ref={(el) => {
                    if (el) els.current.set(item, el);
                  }}
                  className="absolute left-0 top-0 h-0 w-0 list-none will-transform"
                >
                  <span
                    data-cursor="Drag"
                    onPointerDown={press(world.get(item)!)}
                    onPointerEnter={() => {
                      hoveredSkill.current = item;
                      setActiveGroup(g.id);
                    }}
                    onPointerLeave={() => {
                      hoveredSkill.current = null;
                    }}
                    className={cn(
                      'absolute block -translate-x-1/2 -translate-y-1/2 touch-none whitespace-nowrap px-1.5 py-1 text-[clamp(0.95rem,1.15vw,1.12rem)] font-medium tracking-[-0.015em] transition-[color,opacity] duration-500',
                      on ? 'text-ink' : 'text-ink-2',
                      dim && 'opacity-30',
                    )}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function SkillGroupsList() {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="mt-14 border-t border-[var(--line)]">
      {skillGroups.map((g) => {
        const on = active === g.id;
        return (
          <div
            key={g.id}
            className={cn(
              'border-b border-[var(--line)] py-7 transition-opacity duration-500',
              active && !on && 'opacity-40',
            )}
          >
            <button
              type="button"
              aria-pressed={on}
              onClick={() => setActive(on ? null : g.id)}
              className="flex w-full items-baseline justify-between text-left"
            >
              <span className="t-h3">{g.label}</span>
              <span className={cn('t-label', on ? 'text-accent-ink' : 'text-muted')}>
                {String(g.items.length).padStart(2, '0')}
              </span>
            </button>
            <p className="mt-2 text-[0.92rem] text-muted">{g.note}</p>
            <ul
              className={cn(
                'mt-4 flex flex-wrap gap-x-2 gap-y-1.5 transition-[letter-spacing] duration-700',
                on && 'tracking-[-0.01em]',
              )}
            >
              {g.items.map((item, i) => (
                <li key={item} className="text-[1.02rem] text-ink-2">
                  {item}
                  {i < g.items.length - 1 && (
                    <span className="ml-2 text-muted" aria-hidden="true">
                      /
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
