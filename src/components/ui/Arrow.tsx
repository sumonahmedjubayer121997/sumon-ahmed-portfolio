import { cn } from '@/lib/cn';

export type ArrowDirection = 'up-right' | 'right' | 'down' | 'left' | 'down-right' | 'up';

const paths: Record<ArrowDirection, string> = {
  'up-right': 'M4 12 12 4M5.5 4H12v6.5',
  right: 'M2.5 8h11M9 3.5 13.5 8 9 12.5',
  down: 'M8 2.5v11M3.5 9 8 13.5 12.5 9',
  left: 'M13.5 8h-11M7 3.5 2.5 8 7 12.5',
  'down-right': 'M4 4l8 8M12 5.5V12H5.5',
  up: 'M8 13.5v-11M3.5 7 8 2.5 12.5 7',
};

export function Arrow({ direction = 'up-right', className }: { direction?: ArrowDirection; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="square"
      className={cn('h-[0.9em] w-[0.9em] shrink-0', className)}
      aria-hidden="true"
    >
      <path d={paths[direction]} />
    </svg>
  );
}

/** Arrow that slides out along its direction on hover while a twin slides in. */
export function SwapArrow({ direction = 'up-right', className }: { direction?: ArrowDirection; className?: string }) {
  const out: Record<ArrowDirection, string> = {
    'up-right': 'group-hover:translate-x-[120%] group-hover:-translate-y-[120%]',
    right: 'group-hover:translate-x-[130%]',
    down: 'group-hover:translate-y-[130%]',
    left: 'group-hover:-translate-x-[130%]',
    'down-right': 'group-hover:translate-x-[120%] group-hover:translate-y-[120%]',
    up: 'group-hover:-translate-y-[130%]',
  };
  const inFrom: Record<ArrowDirection, string> = {
    'up-right': '-translate-x-[120%] translate-y-[120%]',
    right: '-translate-x-[130%]',
    down: '-translate-y-[130%]',
    left: 'translate-x-[130%]',
    'down-right': '-translate-x-[120%] -translate-y-[120%]',
    up: 'translate-y-[130%]',
  };
  const ease = 'transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]';
  return (
    <span className={cn('relative inline-flex overflow-hidden', className)} aria-hidden="true">
      <span className={cn('inline-flex', ease, out[direction])}>
        <Arrow direction={direction} />
      </span>
      <span
        className={cn(
          'absolute inset-0 inline-flex',
          ease,
          inFrom[direction],
          'group-hover:translate-x-0 group-hover:translate-y-0',
        )}
      >
        <Arrow direction={direction} />
      </span>
    </span>
  );
}
