import { projects } from '@/data/projects';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { SwapArrow } from '@/components/ui/Arrow';
import { ProjectPreview } from '@/components/previews/ProjectPreview';

/**
 * Editorial index of projects. The default on touch/small screens and an
 * always-available, low-motion alternative to the spatial system on desktop.
 */
export function ProjectIndex({ onHover }: { onHover?: (slug: string | null) => void }) {
  return (
    <ul className="border-t border-[var(--line)]" onPointerLeave={() => onHover?.(null)}>
      {projects.map((p) => (
        <li key={p.slug} className="border-b border-[var(--line)]">
          <TransitionLink
            to={`/work/${p.slug}`}
            className="group grid grid-cols-12 items-baseline gap-x-4 gap-y-3 py-7 md:py-9"
            onPointerEnter={(e) => e.pointerType === 'mouse' && onHover?.(p.slug)}
            onFocus={() => onHover?.(p.slug)}
            onBlur={() => onHover?.(null)}
          >
            <span className="t-label col-span-2 text-muted md:col-span-1">{p.index}</span>
            <span className="t-h3 col-span-10 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-3 md:col-span-6">
              {p.title}
            </span>
            <span className="t-label col-span-10 col-start-3 text-muted md:col-span-3 md:col-start-auto">
              {p.discipline}
            </span>
            <span className="t-label hidden text-muted md:col-span-1 md:block">{p.year}</span>
            <span className="hidden justify-end md:col-span-1 md:flex">
              <SwapArrow />
            </span>
            <span className="col-span-10 col-start-3 md:hidden">
              <span className="block max-w-[360px] border border-[var(--line)] bg-paper/60 p-3">
                <ProjectPreview kind={p.preview} />
              </span>
              <span className="mt-3 block text-[0.95rem] leading-relaxed text-ink-2">{p.summary}</span>
            </span>
          </TransitionLink>
        </li>
      ))}
    </ul>
  );
}
