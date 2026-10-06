import { useMemo, useRef } from 'react';
import { CORE_ID, labLinks, labNodes } from '@/data/aiLab';
import { controlPoint, labLayout, neighbours, projectLayout2D, type Vec3 } from '@/lib/aiLabLayout';
import { palette } from '@/lib/color';
import { useElementSize } from '@/hooks/useElementSize';
import { useUI } from '@/lib/store';

/** Static diagram of the AI system for no-WebGL / reduced motion. Still reflects the active component. */
export function AILabFallback({ compact }: { compact: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(ref);
  const active = useUI((s) => s.aiActive);

  const geo = useMemo(() => {
    if (!width || !height) return null;
    const layout = labLayout(compact);
    const { points, scale } = projectLayout2D(layout, width, height, compact);
    const toScreen = (v: Vec3) => [width / 2 + v[0] * scale, height / 2 - v[1] * scale];
    // Control points are computed in world space (bowing away from the core), then projected.
    const links = labLinks.map((l) => {
      const [ax, ay] = points[l.a];
      const [bx, by] = points[l.b];
      const [cx, cy] = toScreen(controlPoint(layout[l.a], layout[l.b], [0, 0, 0]));
      return { ...l, d: `M${ax} ${ay}Q${cx} ${cy} ${bx} ${by}` };
    });
    return { points, links, coreR: scale * (compact ? 0.95 : 1.12) };
  }, [width, height, compact]);

  const nb = new Set(active ? neighbours(active) : []);

  return (
    <div ref={ref} className="absolute inset-0">
      {geo && (
        <svg width={width} height={height} aria-hidden="true">
          {geo.links.map((l, i) => {
            const lit = active && (l.a === active || l.b === active);
            return (
              <path
                key={i}
                d={l.d}
                fill="none"
                stroke={lit ? palette.accent : palette.bone}
                strokeOpacity={lit ? 0.85 : active ? 0.1 : 0.22}
                strokeWidth={1}
              />
            );
          })}
          <circle
            cx={geo.points[CORE_ID][0]}
            cy={geo.points[CORE_ID][1]}
            r={geo.coreR}
            fill="none"
            stroke={palette.bone}
            strokeOpacity={0.35}
            strokeDasharray="1 4"
          />
          {labNodes
            .filter((n) => n.id !== CORE_ID)
            .map((n) => {
              const [x, y] = geo.points[n.id];
              const on = n.id === active;
              return (
                <g key={n.id} opacity={active && !on && !nb.has(n.id) ? 0.4 : 1}>
                  {on && <circle cx={x} cy={y} r={16} fill="none" stroke={palette.accent} />}
                  <circle cx={x} cy={y} r={4.5} fill={on ? palette.accent : palette.bone} />
                </g>
              );
            })}
        </svg>
      )}
    </div>
  );
}
