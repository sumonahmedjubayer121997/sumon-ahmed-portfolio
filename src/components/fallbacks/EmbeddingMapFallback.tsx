import { groupColor, groupOf, type MapGroup, type MapPoint } from '@/content/map';
import { palette } from '@/lib/color';

/**
 * Static 2D view of the embedding map (front projection of the 3D layout), for
 * no WebGL and reduced motion. Decorative: the passage list carries the content.
 */
export function EmbeddingMapFallback({
  points,
  visible,
  selected,
}: {
  points: MapPoint[];
  visible: Record<MapGroup, boolean>;
  selected: number | null;
}) {
  const X = (v: number) => 500 + v * 420;
  const Y = (v: number) => 300 - v * 250;
  const near = new Set(selected === null ? [] : points[selected].n.map(([j]) => j));
  return (
    <svg
      viewBox="0 0 1000 600"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {points.map((p, i) =>
        p.n.map(([j]) =>
          i < j || !points[j].n.some(([k]) => k === i) ? (
            <line
              key={`${i}-${j}`}
              x1={X(p.p[0])}
              y1={Y(p.p[1])}
              x2={X(points[j].p[0])}
              y2={Y(points[j].p[1])}
              stroke={i === selected || j === selected ? palette.accent : palette.ink}
              strokeOpacity={i === selected || j === selected ? 0.9 : 0.08}
              strokeWidth={1}
            />
          ) : null,
        ),
      )}
      {points.map((p, i) =>
        visible[groupOf(p.kind)] ? (
          <circle
            key={i}
            cx={X(p.p[0])}
            cy={Y(p.p[1])}
            r={i === selected ? 9 : near.has(i) ? 6 : 4.5}
            fill={groupColor(groupOf(p.kind))}
            fillOpacity={selected === null || i === selected || near.has(i) ? 0.9 : 0.35}
            stroke={i === selected ? palette.ink : 'none'}
            strokeWidth={1.5}
          />
        ) : null,
      )}
    </svg>
  );
}
