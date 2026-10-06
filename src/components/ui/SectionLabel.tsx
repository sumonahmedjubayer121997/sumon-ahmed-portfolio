import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function SectionLabel({
  index,
  children,
  className,
}: {
  index: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('t-label flex items-center gap-3 text-muted dark:text-ash', className)}>
      <span className="text-ink dark:text-bone">({index})</span>
      <span className="h-px w-8 bg-current opacity-50" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
