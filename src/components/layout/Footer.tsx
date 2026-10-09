import { site } from '@/content';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { useUI } from '@/lib/store';
import { toggleLabMode } from '@/hooks/useShortcuts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { toggleSound } from '@/lib/sound';

/** Lab mode for touch screens (keyboard: D). Hidden when reduced motion is on. */
function LabToggle() {
  const lab = useUI((s) => s.labMode);
  const reduced = useUI((s) => s.reducedMotion);
  if (reduced) return null;
  return (
    <button type="button" aria-pressed={lab} onClick={toggleLabMode} className="t-label link-draw text-bone">
      Lab mode {lab ? 'on' : 'off'}
    </button>
  );
}

/** Interface sound (keyboard: M). */
function SoundToggle() {
  const on = useUI((s) => s.soundOn);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-keyshortcuts="M"
      onClick={toggleSound}
      className="t-label link-draw text-bone"
    >
      Sound {on ? 'on' : 'off'}
    </button>
  );
}

export function Footer() {
  const reduced = useReducedMotion();
  return (
    <footer data-theme="dark" data-nav-theme="dark" className="bg-night text-bone">
      <div className="shell flex flex-col gap-6 border-t border-[var(--line)] py-8 md:flex-row md:items-center md:justify-between">
        <p className="t-label text-ash">
          © {site.year} {site.name}
        </p>
        <p className="t-label max-w-md text-ash">Built with React, Three.js and a hand-written physics engine.</p>
        <nav aria-label="Footer" className="flex gap-6">
          <TransitionLink to="/blog" className="t-label link-draw text-bone">
            Writing
          </TransitionLink>
          <TransitionLink to="/map" className="t-label link-draw text-bone">
            Map
          </TransitionLink>
          <a href="/rss.xml" className="t-label link-draw text-bone">
            RSS
          </a>
          <LabToggle />
          <SoundToggle />
        </nav>
        <MagneticButton
          variant="text"
          arrow="up"
          cursor="Top"
          onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
        >
          Back to top
        </MagneticButton>
      </div>
    </footer>
  );
}
