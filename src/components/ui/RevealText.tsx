import { m } from 'motion/react';
import { cn } from '@/lib/cn';

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';

export interface RevealTextProps {
  text: string;
  as?: Tag;
  className?: string;
  /** Words (without punctuation) to set in the editorial serif italic. */
  emphasis?: string[];
  delay?: number;
  stagger?: number;
  /** Animate on mount instead of when scrolled into view. */
  immediate?: boolean;
  id?: string;
}

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Word-by-word masked reveal. Screen readers get the plain sentence; the
 * animated word spans are hidden from the accessibility tree.
 */
export function RevealText({
  text,
  as = 'p',
  className,
  emphasis = [],
  delay = 0,
  stagger = 0.045,
  immediate = false,
  id,
}: RevealTextProps) {
  const Component = m[as];
  const words = text.split(' ');
  const bareWord = (w: string) => w.replace(/[^\p{L}\p{N}-]/gu, '').toLowerCase();
  const emph = new Set(emphasis.map(bareWord));

  return (
    <Component
      id={id}
      className={className}
      data-reveal=""
      initial="hidden"
      {...(immediate
        ? { animate: 'visible' }
        : { whileInView: 'visible', viewport: { once: true, margin: '0px 0px -12% 0px' } })}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => {
          const bare = bareWord(word);
          return (
            <span key={i} className="inline-block overflow-hidden pb-[0.1em] -mb-[0.1em] align-bottom">
              <m.span
                className={cn('inline-block will-transform', emph.has(bare) && 't-serif pr-[0.04em]')}
                variants={{
                  hidden: { y: '108%', opacity: 0 },
                  visible: {
                    y: '0%',
                    opacity: 1,
                    transition: { duration: 1, ease, delay: delay + i * stagger },
                  },
                }}
              >
                {word}
              </m.span>
              {i < words.length - 1 && ' '}
            </span>
          );
        })}
      </span>
    </Component>
  );
}
