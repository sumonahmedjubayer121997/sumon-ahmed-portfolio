import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';

export interface TransitionLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  /** Return true to cancel navigation (e.g. the click ended a drag). */
  shouldCancel?: () => boolean;
}

/**
 * A real <a href> (so middle-click, copy-link and crawlers work) that runs the
 * physical page transition for plain left clicks.
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(function TransitionLink(
  { to, onClick, shouldCancel, children, ...rest },
  ref,
) {
  const go = useTransitionNavigate();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (shouldCancel?.()) return;
    go(to);
  };

  return (
    <a ref={ref} href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
});
