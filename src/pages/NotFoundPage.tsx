import { MagneticButton } from '@/components/ui/MagneticButton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Not found');
  return (
    <section className="shell flex min-h-[100svh] flex-col justify-center gap-10 pt-[var(--nav-h)]">
      <p className="t-label text-muted">Error 404 · Out of distribution</p>
      <h1 className="t-h1 max-w-[14ch]">
        This page isn’t in the <span className="t-serif">training data.</span>
      </h1>
      <div>
        <MagneticButton to="/" variant="solid" arrow="left" cursor="Home">
          Back home
        </MagneticButton>
      </div>
    </section>
  );
}
