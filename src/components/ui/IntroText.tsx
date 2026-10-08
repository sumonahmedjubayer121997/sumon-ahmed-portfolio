import { Fragment, type CSSProperties } from 'react';

type Tag = 'h1' | 'h2' | 'p';

/**
 * Word-by-word masked rise driven by CSS (the `intro-rise` keyframes), so it
 * plays from the prerendered HTML's first paint instead of waiting for
 * JavaScript — used for page titles, which are the largest contentful paint.
 */
export function IntroText({
  text,
  as: Component = 'h1',
  className,
  delay = 0.1,
  stagger = 0.045,
}: {
  text: string;
  as?: Tag;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const words = text.split(' ');
  return (
    <Component className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {/* The space sits between the word masks: inside an inline-block, a trailing space is dropped. */}
        {words.map((word, i) => (
          <Fragment key={i}>
            <span className="-mb-[0.1em] inline-block overflow-hidden pb-[0.1em] align-bottom">
              <span
                className="intro-rise inline-block"
                style={{ '--d': `${(delay + i * stagger).toFixed(3)}s` } as CSSProperties}
              >
                {word}
              </span>
            </span>
            {i < words.length - 1 && ' '}
          </Fragment>
        ))}
      </span>
    </Component>
  );
}
