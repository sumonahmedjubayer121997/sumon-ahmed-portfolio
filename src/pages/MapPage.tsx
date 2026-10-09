import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { embeddingMap, groupColor, groupOf, groups, kindLabel, type MapGroup } from '@/content/map';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PhysicsCanvas } from '@/components/PhysicsCanvas';
import { EmbeddingMapFallback } from '@/components/fallbacks/EmbeddingMapFallback';
import { IntroText } from '@/components/ui/IntroText';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { Arrow } from '@/components/ui/Arrow';
import { MAP_DESCRIPTION } from '@/lib/meta';
import { sfx } from '@/lib/sound';
import { cn } from '@/lib/cn';

const loadScene = () => import('@/three/EmbeddingMapScene');
const points = embeddingMap.points;
const ALL: Record<MapGroup, boolean> = { project: true, post: true, research: true, profile: true };
const groupIndex = (i: number) => groups.findIndex((g) => g.id === groupOf(points[i].kind));

function Swatch({ group }: { group: MapGroup }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: groupColor(group) }}
      aria-hidden="true"
    />
  );
}

/**
 * /map — every passage of the site's writing, embedded with a small language
 * model at build time and laid out by meaning. The 3D scene is decorative; the
 * pinned-passage panel and the passage list carry the same content for
 * keyboard and screen-reader users.
 */
export default function MapPage() {
  useDocumentTitle('Map of ideas', MAP_DESCRIPTION);
  const [visible, setVisible] = useState(ALL);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const press = useRef<{ x: number; y: number; hovered: number | null } | null>(null);
  const lastMove = useRef(0);
  // Each colour group has a note. Only when the pointer moved onto a dot, not when the spin carries one under it.
  const onHover = useCallback((i: number | null) => {
    setHovered(i);
    if (i !== null && performance.now() - lastMove.current < 200) sfx.note(groupIndex(i));
  }, []);
  const pin = (i: number) => {
    setSelected(i);
    sfx.chord(groupIndex(i));
  };

  // The tooltip follows the pointer without re-rendering.
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    lastMove.current = performance.now();
    const r = e.currentTarget.getBoundingClientRect();
    if (tip.current)
      tip.current.style.transform = `translate3d(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 16}px, 0)`;
  };
  // A click (not a drag) on a dot pins the dot that was under the pointer when it went down.
  const up = (e: ReactPointerEvent) => {
    const start = press.current;
    press.current = null;
    if (start && start.hovered !== null && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) pin(start.hovered);
  };

  const pinned = selected !== null ? points[selected] : null;
  const count = (g: MapGroup) => points.filter((p) => groupOf(p.kind) === g).length;

  return (
    <section id="map" className="pb-24">
      <header className="shell pt-[calc(var(--nav-h)+7vh)]">
        <p className="t-label text-muted">Map of ideas · {points.length} passages</p>
        <IntroText text="Everything I’ve written, arranged by meaning." className="t-h1 mt-6 max-w-[17ch]" />
        <p className="t-lead mt-8 max-w-[60ch] text-ink-2">
          Each dot is a passage — a project step, a section of a note, part of my research. A small language model (
          {embeddingMap.model}) turns each into 384 numbers when the site is built; UMAP folds those into three
          dimensions, so passages that say similar things sit close together. Lines join each passage to its nearest
          neighbours.
        </p>
      </header>

      <div className="shell mt-12">
        <div role="group" aria-label="Show passages from" className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={visible[g.id]}
              onClick={() => setVisible((v) => ({ ...v, [g.id]: !v[g.id] }))}
              className={cn(
                't-label inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] transition-colors',
                visible[g.id] ? 'border-ink text-ink' : 'border-[var(--line)] text-muted line-through',
              )}
            >
              <Swatch group={g.id} />
              {g.label} · {count(g.id)}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div
            className="relative h-[min(68vh,640px)] min-h-[420px] touch-pan-y overflow-hidden border border-[var(--line)] bg-paper/40 lg:col-span-8"
            onPointerMove={move}
            onPointerDown={(e) => (press.current = { x: e.clientX, y: e.clientY, hovered })}
            onPointerUp={up}
            data-map-stage=""
            data-cursor={hovered !== null ? 'Pin' : 'Drag'}
          >
            <PhysicsCanvas
              load={loadScene}
              sceneProps={{ points, visible, selected, onHover }}
              fallback={<EmbeddingMapFallback points={points} visible={visible} selected={selected} />}
              className="absolute inset-0"
            />
            <div
              ref={tip}
              className={cn(
                'pointer-events-none absolute left-0 top-0 z-10 w-[min(280px,70%)] rounded-[6px] border border-[var(--line-strong)] bg-ivory/95 p-3 shadow-sm transition-opacity duration-150',
                hovered === null ? 'opacity-0' : 'opacity-100',
              )}
              aria-hidden="true"
            >
              {hovered !== null && (
                <>
                  <p className="t-label flex items-center gap-2 text-[9.5px] text-muted">
                    <Swatch group={groupOf(points[hovered].kind)} />
                    {kindLabel[points[hovered].kind]} · {points[hovered].section}
                  </p>
                  <p className="mt-1.5 text-[0.92rem] font-medium leading-snug text-ink">{points[hovered].title}</p>
                </>
              )}
            </div>
            <p
              className="t-label pointer-events-none absolute bottom-3 left-4 text-[9.5px] text-muted"
              aria-hidden="true"
            >
              Drag to turn · click a dot to pin it
            </p>
          </div>

          <aside aria-label="Selected passage" className="border border-[var(--line)] p-5 lg:col-span-4">
            <div aria-live="polite">
              {pinned ? (
                <>
                  <p className="t-label flex items-center gap-2 text-[10px] text-muted">
                    <Swatch group={groupOf(pinned.kind)} />
                    {kindLabel[pinned.kind]} · {pinned.section}
                  </p>
                  <p className="mt-3 text-[1.2rem] font-medium leading-snug tracking-[-0.02em] text-ink">
                    {pinned.title}
                  </p>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{pinned.excerpt}</p>
                  <TransitionLink
                    to={pinned.href}
                    className="t-label link-draw mt-4 inline-flex items-center gap-2 text-ink"
                  >
                    Read it <Arrow className="h-3 w-3" />
                  </TransitionLink>
                  <p className="t-label mt-6 text-[10px] text-muted">Nearest passages</p>
                  <ul className="mt-2 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                    {pinned.n.map(([j, s]) => (
                      <li key={j}>
                        <button
                          type="button"
                          onClick={() => pin(j)}
                          className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left text-[0.9rem] hover:bg-paper/60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-ink">{points[j].title}</span>
                            <span className="block truncate text-[0.8rem] text-muted">{points[j].section}</span>
                          </span>
                          <span className="t-meta shrink-0 text-[11px] text-muted" title="Cosine similarity">
                            {s.toFixed(2)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-[0.95rem] leading-relaxed text-ink-2">
                  Click a dot — or pick a passage below — to read it and see the passages most similar to it, with their
                  cosine similarity (1 = same meaning).
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <div className="shell mt-20">
        <h2 className="t-label text-muted">All passages</h2>
        <div className="mt-6 grid gap-x-10 gap-y-10 md:grid-cols-2 xl:grid-cols-4">
          {groups.map((g) => (
            <section key={g.id} aria-labelledby={`map-group-${g.id}`}>
              <h3 id={`map-group-${g.id}`} className="t-label flex items-center gap-2 text-[10px] text-ink">
                <Swatch group={g.id} />
                {g.label}
              </h3>
              <ul className="mt-3 border-t border-[var(--line)]">
                {points.map((p, i) =>
                  groupOf(p.kind) === g.id ? (
                    <li key={i} className="border-b border-[var(--line)]">
                      <button
                        type="button"
                        onClick={() => pin(i)}
                        aria-pressed={selected === i}
                        className={cn(
                          'block w-full py-2.5 text-left transition-colors hover:text-ink',
                          selected === i ? 'text-ink' : 'text-ink-2',
                        )}
                      >
                        <span className="block text-[0.9rem] leading-snug">{p.title}</span>
                        <span className="block text-[0.78rem] text-muted">{p.section}</span>
                      </button>
                    </li>
                  ) : null,
                )}
              </ul>
            </section>
          ))}
        </div>
        <p className="t-meta mt-12 max-w-[70ch] text-[12px] text-muted">
          Computed at build time: {embeddingMap.model} sentence embeddings (mean-pooled, normalised) ·{' '}
          {embeddingMap.method}. Positions are a projection — distances in 3D approximate, but don’t equal, similarity;
          the numbers in the panel are the exact cosine similarities.
        </p>
      </div>
    </section>
  );
}
