import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useLocation } from 'react-router';
import { navItems, site } from '@/content';
import { cv } from '@/components/ui/Availability';
import { useUI } from '@/lib/store';
import { cn } from '@/lib/cn';
import { springs } from '@/physics/spring';
import { useSpringPhysics } from '@/hooks/useSpringPhysics';
import { useSectionTracking } from '@/hooks/useSectionTracking';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Arrow } from '@/components/ui/Arrow';

export function Navbar() {
  useSectionTracking();
  const theme = useUI((s) => s.navTheme);
  const active = useUI((s) => s.activeSection);
  const menuOpen = useUI((s) => s.menuOpen);
  const setMenuOpen = useUI((s) => s.setMenuOpen);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the menu on navigation.
  useEffect(() => setMenuOpen(false), [location.key, setMenuOpen]);

  const effectiveTheme = menuOpen ? 'light' : theme;

  return (
    <header
      data-theme={effectiveTheme}
      className={cn(
        'fixed inset-x-0 top-0 z-50 text-ink transition-[background-color,border-color,color] duration-500 dark:text-bone',
        'border-b border-transparent',
        scrolled && !menuOpen && 'border-[var(--line)] bg-ivory/80 backdrop-blur-md dark:bg-night/70',
        menuOpen && 'bg-ivory',
      )}
    >
      <nav aria-label="Primary" className="shell flex h-[var(--nav-h)] items-center justify-between gap-6">
        <TransitionLink
          to="/"
          className="group t-label flex items-center gap-2.5"
          data-cursor="Home"
          aria-label={`${site.name} — home`}
        >
          <LogoMark />
          <span className="font-medium tracking-[0.18em]">{site.name}</span>
        </TransitionLink>

        <DesktopLinks active={location.pathname === '/' ? active : null} />

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex">
            <MagneticButton to="/#contact" size="sm" variant="outline" cursor="Say hi">
              Contact
            </MagneticButton>
          </span>
          <button
            type="button"
            className="t-label -mr-2 flex h-10 items-center gap-2 px-2 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span>{menuOpen ? 'Close' : 'Menu'}</span>
            <span className="relative block h-2.5 w-4" aria-hidden="true">
              <span
                className={cn(
                  'absolute left-0 h-px w-4 bg-current transition-transform duration-300',
                  menuOpen ? 'top-1 rotate-45' : 'top-0',
                )}
              />
              <span
                className={cn(
                  'absolute left-0 h-px w-4 bg-current transition-transform duration-300',
                  menuOpen ? 'top-1 -rotate-45' : 'top-2',
                )}
              />
            </span>
          </button>
        </div>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

function LogoMark() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="4" cy="6" r="1.4" opacity="0.5" />
        <circle cx="4" cy="14" r="1.4" opacity="0.5" />
        <circle cx="10" cy="4" r="1.4" opacity="0.8" />
        <circle cx="10" cy="10" r="1.4" opacity="0.8" />
        <circle cx="10" cy="16" r="1.4" opacity="0.8" />
      </g>
      <circle
        cx="16.5"
        cy="10"
        r="2"
        fill="var(--color-accent)"
        className="transition-transform duration-500 group-hover:translate-x-[-1px]"
      />
    </svg>
  );
}

function DesktopLinks({ active }: { active: string | null }) {
  const listRef = useRef<HTMLUListElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const dotRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  const { setTarget, snap } = useSpringPhysics(springs.magnetic, (s) => {
    if (dotRef.current) dotRef.current.style.transform = `translate3d(${s.x}px, 0, 0)`;
  });

  useLayoutEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;
    const link = active ? linkRefs.current[active] : null;
    if (!link) {
      dot.style.opacity = '0';
      return;
    }
    const x = link.offsetLeft + link.offsetWidth / 2 - 2;
    dot.style.opacity = '1';
    if (!placed.current) {
      snap(x, 0);
      placed.current = true;
    } else {
      setTarget(x, 0);
    }
  }, [active, setTarget, snap]);

  return (
    <ul ref={listRef} className="relative hidden items-center gap-8 md:flex lg:gap-10">
      {navItems.map((item) => (
        <li key={item.id}>
          <TransitionLink
            ref={(el) => {
              linkRefs.current[item.id] = el;
            }}
            to={item.href}
            aria-current={active === item.id ? 'true' : undefined}
            className={cn(
              't-label py-2 transition-opacity duration-300',
              active && active !== item.id ? 'opacity-55 hover:opacity-100' : 'opacity-100',
            )}
          >
            {item.label}
          </TransitionLink>
        </li>
      ))}
      <span
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-1.5 left-0 h-1 w-1 rounded-full bg-accent opacity-0 transition-opacity duration-300"
      />
    </ul>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const firstLink = useRef<HTMLAnchorElement>(null);
  const go = useTransitionNavigate();

  // Close first so the scroll lock is released before scrolling to the target.
  const handleClick = (e: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onClose();
    requestAnimationFrame(() => requestAnimationFrame(() => go(href)));
  };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          id="mobile-menu"
          className="fixed inset-0 top-[var(--nav-h)] z-40 flex flex-col justify-between bg-ivory px-5 pb-10 pt-8 text-ink md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ul className="flex flex-col">
            {[...navItems, { id: 'contact', label: 'Contact', href: '/#contact' }].map((item, i) => (
              <m.li
                key={item.id}
                className="border-b border-[var(--line)]"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i + 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <a
                  ref={i === 0 ? firstLink : undefined}
                  href={item.href}
                  onClick={(e) => handleClick(e, item.href)}
                  className="flex items-baseline justify-between py-4"
                >
                  <span className="t-h2">{item.label}</span>
                  <span className="t-label text-muted">0{i + 1}</span>
                </a>
              </m.li>
            ))}
          </ul>
          <div className="flex items-end justify-between gap-4">
            <div className="grid gap-3">
              {cv.url && (
                <a
                  href={cv.url}
                  {...(cv.download ? { download: cv.download } : { target: '_blank', rel: 'noreferrer' })}
                  className="t-label link-draw"
                >
                  Download CV
                </a>
              )}
              <a href={`mailto:${site.email}`} className="t-meta link-draw">
                {site.email}
              </a>
            </div>
            <Arrow direction="up-right" className="text-accent" />
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
