import { useRef, useState } from 'react';
import { copyText } from '@/lib/clipboard';
import { contactAvailable } from '@/lib/contact';
import { ContactForm } from './ContactForm';
import { site } from '@/content';
import { OpenToWork, cv } from '@/components/ui/Availability';
import { useMagneticInteraction } from '@/hooks/useMagneticInteraction';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { RevealText } from '@/components/ui/RevealText';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { SwapArrow } from '@/components/ui/Arrow';

/** The address itself is the call to action: large, magnetic, with an underline that draws in. */
function MagneticEmail() {
  const reduced = useReducedMotion();
  const area = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLAnchorElement>(null);
  useMagneticInteraction(
    area,
    (x, y) => {
      if (inner.current) inner.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    },
    { strength: 0.1, radius: 1.15, disabled: reduced },
  );
  return (
    <div ref={area} className="inline-block max-w-full">
      <a
        ref={inner}
        href={`mailto:${site.email}`}
        data-cursor="Write"
        className="group inline-flex max-w-full items-center gap-[0.25em] break-all text-[clamp(1.9rem,6.4vw,6.6rem)] font-medium leading-none tracking-[-0.045em] will-transform"
      >
        <span className="link-draw pb-[0.06em] [background-size:0%_2px] hover:[background-size:100%_2px]">
          {site.email}
        </span>
        <SwapArrow className="text-accent" />
      </a>
    </div>
  );
}

export function ContactSection() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!(await copyText(site.email))) {
      window.location.href = `mailto:${site.email}`;
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      data-theme="dark"
      data-nav-theme="dark"
      className="relative bg-night pb-20 pt-[clamp(6rem,12vw,11rem)] text-bone"
    >
      <div className="shell">
        <SectionLabel index="09">Contact</SectionLabel>
        <RevealText
          as="h2"
          id="contact-title"
          text="Have a dataset, a model or a hard question?"
          emphasis={['question?']}
          className="t-h1 mt-8 max-w-[17ch]"
        />

        <div className="mt-16 md:mt-24">
          <MagneticEmail />
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={copy}
              className="t-label rounded-full border border-[var(--line-strong)] px-4 py-2 transition-colors hover:border-bone"
            >
              {copied ? 'Copied' : 'Copy address'}
            </button>
            <span className="t-label text-ash" aria-live="polite">
              {copied ? 'Address on your clipboard.' : 'Replies within two working days.'}
            </span>
          </div>
        </div>

        {contactAvailable && (
          <div className="relative mt-20 grid gap-10 md:mt-24 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="t-label text-ash">Or write here</p>
              <p className="mt-3 max-w-[32ch] text-[1.05rem] leading-relaxed text-bone/80">
                Messages from this form come straight to me, and I read every one.
              </p>
            </div>
            <ContactForm className="md:col-span-8" />
          </div>
        )}

        <div className="mt-24 grid gap-10 border-t border-[var(--line)] pt-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="t-label text-ash">Availability</p>
            {site.openToWork ? <OpenToWork detail={false} className="t-label mt-3 text-[10px] text-bone" /> : null}
            <p className="mt-3 text-[1.05rem]">{site.availability}</p>
            {site.availabilityNote && <p className="mt-1 text-[0.95rem] text-ash">{site.availabilityNote}</p>}
            {cv.url && (
              <div className="mt-5">
                <MagneticButton
                  href={cv.url}
                  download={cv.download}
                  variant="outline"
                  size="sm"
                  arrow="down"
                  cursor="CV"
                >
                  Download CV
                </MagneticButton>
              </div>
            )}
          </div>
          <div className="md:col-span-3">
            <p className="t-label text-ash">Based in</p>
            <p className="mt-3 text-[1.05rem]">{site.location} · remote-friendly</p>
          </div>
          <div className="md:col-span-5">
            <p className="t-label text-ash">Elsewhere</p>
            <ul className="mt-2 flex flex-wrap gap-x-6">
              {site.socials.map((s) => (
                <li key={s.label}>
                  <MagneticButton href={s.href} variant="text" cursor="Open" strength={0.25}>
                    {s.label}
                  </MagneticButton>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
