import type { Figure } from '@/content';
import { ConfusionMatrix } from './ConfusionMatrix';
import { PRCurve } from './PRCurve';

/** Renders one project figure: an uploaded image, a confusion matrix or PR curves. */
export function EvaluationFigure({ figure }: { figure: Figure }) {
  if (figure.type === 'confusion-matrix') {
    return <ConfusionMatrix labels={figure.labels} values={figure.values} caption={figure.caption} />;
  }
  if (figure.type === 'pr-curve') return <PRCurve series={figure.series} caption={figure.caption} />;
  return (
    <figure>
      <img
        src={figure.url}
        alt={figure.alt}
        loading="lazy"
        decoding="async"
        className="w-full border border-[var(--line)] bg-paper"
      />
      {figure.caption && (
        <figcaption className="mt-3 text-[0.92rem] leading-relaxed text-ink-2">{figure.caption}</figcaption>
      )}
    </figure>
  );
}
