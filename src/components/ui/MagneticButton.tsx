import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useMagneticInteraction } from '@/hooks/useMagneticInteraction';
import { TransitionLink } from './TransitionLink';
import { SwapArrow, type ArrowDirection } from './Arrow';

export interface MagneticButtonProps {
  children: ReactNode;
  /** Internal route (uses the page transition). */
  to?: string;
  /** External URL (opens in a new tab). */
  href?: string;
  onClick?: () => void;
  arrow?: ArrowDirection | null;
  variant?: 'solid' | 'outline' | 'text';
  size?: 'sm' | 'md' | 'lg';
  /** Label shown in the custom cursor. */
  cursor?: string;
  /** Fraction of the pointer offset the button follows. */
  strength?: number;
  className?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}

const variants = {
  solid: 'bg-ink text-ivory hover:bg-ink-2 dark:bg-bone dark:text-ink dark:hover:bg-white',
  outline: 'border border-[var(--line-strong)] text-current hover:border-current',
  text: 'text-current',
};

const sizes = {
  sm: 'h-9 px-4 gap-2',
  md: 'h-12 px-6 gap-3',
  lg: 'h-14 px-7 gap-3',
};

/**
 * Button with spring-physics magnetism: the body drifts toward the cursor, the
 * label and arrow follow at different rates (parallax), and everything springs
 * home when the pointer leaves.
 */
export function MagneticButton({
  children,
  to,
  href,
  onClick,
  arrow = 'up-right',
  variant = 'outline',
  size = 'md',
  cursor,
  strength = 0.3,
  className,
  ariaLabel,
  type = 'button',
}: MagneticButtonProps) {
  const reduced = useReducedMotion();
  const areaRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLElement | null>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);

  useMagneticInteraction(
    areaRef,
    (x, y, proximity) => {
      if (bodyRef.current) bodyRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (labelRef.current) labelRef.current.style.transform = `translate3d(${x * 0.18}px, ${y * 0.18}px, 0)`;
      if (arrowRef.current)
        arrowRef.current.style.transform = `translate3d(${x * 0.4 + proximity * 2}px, ${y * 0.4 - proximity * 2}px, 0)`;
    },
    { strength, disabled: reduced },
  );

  const classes = cn(
    'group relative inline-flex items-center justify-center whitespace-nowrap rounded-full t-label will-transform',
    'transition-colors duration-300',
    variant !== 'text' && sizes[size],
    variant === 'text' && 'gap-2 py-2',
    variants[variant],
    className,
  );

  const inner = (
    <>
      <span ref={labelRef} className={cn('inline-block will-transform', variant === 'text' && 'link-draw pb-0.5')}>
        {children}
      </span>
      {arrow && (
        <span ref={arrowRef} className="inline-flex will-transform">
          <SwapArrow direction={arrow} />
        </span>
      )}
    </>
  );

  const setBody = (el: HTMLElement | null) => {
    bodyRef.current = el;
  };

  let control: ReactNode;
  if (to) {
    control = (
      <TransitionLink
        ref={setBody}
        to={to}
        className={classes}
        data-cursor={cursor}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {inner}
      </TransitionLink>
    );
  } else if (href) {
    control = (
      <a
        ref={setBody}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={classes}
        data-cursor={cursor}
        aria-label={ariaLabel}
      >
        {inner}
      </a>
    );
  } else {
    control = (
      <button
        ref={setBody}
        type={type}
        onClick={onClick}
        className={classes}
        data-cursor={cursor}
        aria-label={ariaLabel}
      >
        {inner}
      </button>
    );
  }

  return (
    <span ref={areaRef} className="inline-flex">
      {control}
    </span>
  );
}
