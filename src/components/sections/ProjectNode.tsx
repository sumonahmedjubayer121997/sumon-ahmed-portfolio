import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Concept, Project } from '@/content';
import { cn } from '@/lib/cn';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { SwapArrow } from '@/components/ui/Arrow';

export interface ProjectNodeProps {
  project: Project;
  active: boolean;
  dimmed: boolean;
  nodeRef: (el: HTMLDivElement | null) => void;
  onHover: (slug: string | null) => void;
  onPointerDown: (e: ReactPointerEvent) => void;
  shouldCancel: () => boolean;
}

/**
 * A project as a physical object. The zero-size wrapper sits exactly on the
 * body's position (its anchor dot); the label extends away from the spine.
 */
export function ProjectNode({
  project,
  active,
  dimmed,
  nodeRef,
  onHover,
  onPointerDown,
  shouldCancel,
}: ProjectNodeProps) {
  const flip = project.position.align === 'right';
  return (
    <div ref={nodeRef} className="absolute left-0 top-0 h-0 w-0 will-transform">
      <TransitionLink
        to={`/work/${project.slug}`}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        shouldCancel={shouldCancel}
        onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(project.slug)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
        onFocus={() => onHover(project.slug)}
        onBlur={() => onHover(null)}
        onPointerDown={onPointerDown}
        className={cn(
          'group absolute top-[-8px] block w-[min(25rem,29vw)] touch-none outline-offset-8',
          flip ? 'right-[-5px] text-right' : 'left-[-5px] text-left',
        )}
      >
        <span className={cn('flex items-center gap-3', flip && 'flex-row-reverse')}>
          <span
            className={cn(
              'h-2.5 w-2.5 shrink-0 rounded-full border transition-[background-color,border-color,transform] duration-500',
              active ? 'scale-125 border-accent bg-accent' : 'border-ink bg-ivory',
            )}
            aria-hidden="true"
          />
          <span className="t-label text-muted">
            {project.index} — {project.discipline}
          </span>
        </span>
        <span
          className={cn(
            'mt-3 block text-[clamp(1.5rem,2.35vw,2.4rem)] font-medium leading-[1.02] tracking-[-0.035em] transition-opacity duration-500',
            flip ? 'pr-[22px]' : 'pl-[22px]',
            dimmed ? 'opacity-30' : 'opacity-100',
          )}
        >
          {project.title}
        </span>
        <span
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]',
            flip ? 'pr-[22px]' : 'pl-[22px]',
            active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <span className="min-h-0 overflow-hidden">
            <span className="block pt-3 text-[0.92rem] leading-snug text-ink-2">{project.summary}</span>
            <span className={cn('t-label mt-3 flex items-center gap-3 text-muted', flip && 'justify-end')}>
              <span>{project.year}</span>
              <span aria-hidden="true">·</span>
              <span>{project.stack.slice(0, 3).join(' / ')}</span>
              <span className="flex items-center gap-1.5 text-ink">
                Open <SwapArrow />
              </span>
            </span>
          </span>
        </span>
      </TransitionLink>
    </div>
  );
}

export function ConceptNode({
  concept,
  active,
  nodeRef,
  onPointerDown,
}: {
  concept: Concept;
  active: boolean;
  nodeRef: (el: HTMLDivElement | null) => void;
  onPointerDown: (e: ReactPointerEvent) => void;
}) {
  return (
    <div ref={nodeRef} className="absolute left-0 top-0 h-0 w-0 will-transform">
      <div
        className="absolute -left-3 -top-3 h-6 w-6 touch-none rounded-full"
        data-cursor="Drag"
        onPointerDown={onPointerDown}
        aria-hidden="true"
      >
        <span
          className={cn(
            'absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color,transform] duration-500',
            active ? 'scale-150 bg-accent' : 'bg-ink',
          )}
        />
      </div>
      <span
        className={cn(
          't-label pointer-events-none absolute left-4 top-[-8px] whitespace-nowrap transition-colors duration-500',
          active ? 'text-ink' : 'text-muted',
        )}
      >
        {concept.label}
      </span>
    </div>
  );
}
