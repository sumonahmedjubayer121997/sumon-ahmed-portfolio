import { site } from '@/content';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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
          <a href="/rss.xml" className="t-label link-draw text-bone">
            RSS
          </a>
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
