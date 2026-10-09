import { useId, useMemo, useRef } from 'react';
import { buildHeroStructure, computeHeroLinks, type HeroBand } from '@/lib/heroStructure';
import { createRandom } from '@/lib/random';
import { palette } from '@/lib/color';
import { SpatialHash } from '@/physics/spatialHash';
import { useElementSize } from '@/hooks/useElementSize';

/**
 * Static rendering of the hero structure in its organised state — used without
 * WebGL and under reduced motion. Same generator, same seed, same picture.
 */
export function HeroFallback({ count, band }: { count: number; band: HeroBand | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const soft = `${useId()}-soft`;
  const { width, height } = useElementSize(ref);

  const svg = useMemo(() => {
    if (!width || !height) return null;
    const compact = width < 768;
    const n = Math.min(count, compact ? 180 : 420);
    const s = buildHeroStructure(n, width, height, compact, createRandom(23), band);
    const pos = s.targets;
    const maxSegments = 1400;
    const lp = new Float32Array(maxSegments * 6);
    const la = new Float32Array(maxSegments * 2);
    const segs = computeHeroLinks(
      pos,
      s,
      new SpatialHash(n),
      width / 2,
      height / 2,
      { maxDist: compact ? 46 : 56, maxPerNode: 3, maxSegments, order: 1 },
      new Uint8Array(n),
      lp,
      la,
    );
    const X = (x: number) => (x + width / 2).toFixed(1);
    const Y = (y: number) => (height / 2 - y).toFixed(1);
    const lines: string[] = [];
    for (let k = 0; k < segs; k++) {
      lines.push(`M${X(lp[k * 6])} ${Y(lp[k * 6 + 1])}L${X(lp[k * 6 + 3])} ${Y(lp[k * 6 + 4])}`);
    }
    const dots = Array.from({ length: n }, (_, i) => ({
      x: X(pos[i * 3]),
      y: Y(pos[i * 3 + 1]),
      r: (s.sizes[i] / 2).toFixed(2),
      accent: s.accent[i] > 0.5,
    }));
    return { path: lines.join(''), dots };
  }, [width, height, count, band]);

  return (
    <div ref={ref} className="absolute inset-0">
      {svg && (
        <svg width={width} height={height} className="absolute inset-0" aria-hidden="true">
          {/* The same slight softness as the WebGL particles. */}
          <filter id={soft} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          <path d={svg.path} stroke={palette.ink} strokeOpacity={0.12} strokeWidth={0.6} fill="none" />
          <g filter={`url(#${soft})`}>
            {svg.dots.map((d, i) => (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={d.r}
                fill={d.accent ? palette.accent : palette.ink}
                fillOpacity={d.accent ? 0.9 : 0.4}
              />
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
