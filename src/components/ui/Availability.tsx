import { site } from '@/content';
import { cn } from '@/lib/cn';

/** The CV link and the name it downloads under (uploaded files only; links open in a new tab). */
export const cv = {
  url: site.cvUrl,
  download: site.cvUrl.startsWith('/cv/') ? `${site.name} CV.pdf` : undefined,
};

/** A pulsing dot + "Available" + the availability line; nothing when the profile turns it off. */
export function OpenToWork({ className, detail = true }: { className?: string; detail?: boolean }) {
  if (!site.openToWork) return null;
  return (
    <p className={cn('flex items-start gap-2.5', className)}>
      <span className="relative mt-[0.3em] flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <span>
        <span className="text-current">Available</span>
        {detail && <span className="opacity-70"> · {site.availability}</span>}
      </span>
    </p>
  );
}
