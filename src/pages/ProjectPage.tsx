import { Suspense, lazy, type ReactNode } from 'react';
import { useParams } from 'react-router';
import { getProject, projects, type DemoKind } from '@/data/projects';
import { pipelines } from '@/data/aiLab';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { TransitionLink } from '@/components/ui/TransitionLink';
import { RevealText } from '@/components/ui/RevealText';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { Tilt } from '@/components/ui/Tilt';
import { Arrow, SwapArrow } from '@/components/ui/Arrow';
import { ScrollInertia } from '@/components/ui/ScrollInertia';
import { ProjectPreview } from '@/components/previews/ProjectPreview';
import { PipelineVisualization } from '@/components/sections/PipelineVisualization';
import NotFoundPage from './NotFoundPage';

const TfidfDemo = lazy(() => import('@/components/demos/TfidfDemo'));
const PreprocessDemo = lazy(() => import('@/components/demos/PreprocessDemo'));

function Demo({ kind }: { kind: DemoKind }) {
  if (kind === 'rag-pipeline') {
    return (
      <div className="border border-[var(--line-strong)] bg-paper/50 p-5 sm:p-8">
        <p className="t-label mb-6 text-ink">Live model · {pipelines.rag.label}</p>
        <PipelineVisualization pipeline={pipelines.rag} theme="light" />
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="h-[420px] border border-[var(--line)]" aria-busy="true" />}>
      {kind === 'tfidf' ? <TfidfDemo /> : <PreprocessDemo />}
    </Suspense>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-[var(--line)] py-14 md:grid-cols-12 md:py-20">
      <h2 className="t-label text-muted md:col-span-3">{label}</h2>
      <div className="md:col-span-9">{children}</div>
    </section>
  );
}

export default function ProjectPage() {
  const { slug = '' } = useParams();
  const project = getProject(slug);
  useDocumentTitle(project?.title, project?.summary);
  if (!project) return <NotFoundPage />;

  const i = projects.indexOf(project);
  const next = projects[(i + 1) % projects.length];

  return (
    <article className="pb-10">
      <header className="shell pt-[calc(var(--nav-h)+7vh)]">
        <TransitionLink to="/#work" className="group t-label inline-flex items-center gap-2 text-muted hover:text-ink">
          <Arrow direction="left" className="transition-transform duration-500 group-hover:-translate-x-1" />
          All work
        </TransitionLink>
        <p className="t-label mt-14 text-muted">
          {project.index} / {String(projects.length).padStart(2, '0')} — {project.discipline}
        </p>
        <RevealText as="h1" immediate text={project.title} className="t-h1 mt-6 max-w-[15ch]" />
        <p className="t-lead mt-8 max-w-[56ch] text-ink-2">{project.summary}</p>

        <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-[var(--line)] pt-6 md:grid-cols-4">
          {[
            ['Role', project.role],
            ['Year', project.year],
            ['Type', project.type],
            ['Stack', project.stack.join(', ')],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="t-label text-muted">{k}</dt>
              <dd className="mt-2 text-[0.98rem] leading-snug">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="shell mt-16 md:mt-20">
        <Tilt className="mx-auto max-w-[1100px]">
          <div className="border border-[var(--line)] bg-paper p-6 sm:p-12 md:p-16">
            <ProjectPreview kind={project.preview} className="mx-auto max-w-[760px]" />
          </div>
        </Tilt>
      </div>

      <div className="shell mt-16 md:mt-24">
        <Block label="Problem">
          <p className="max-w-[40ch] text-[clamp(1.4rem,2.3vw,2.1rem)] font-medium leading-[1.25] tracking-[-0.025em]">
            {project.problem}
          </p>
        </Block>

        <Block label="Approach">
          <ol className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {project.approach.map((step, n) => (
              <li key={step.title}>
                <span className="t-label text-accent-ink">0{n + 1}</span>
                <h3 className="mt-2 text-[1.25rem] font-medium tracking-[-0.02em]">{step.title}</h3>
                <p className="mt-2 text-[1rem] leading-relaxed text-ink-2">{step.body}</p>
              </li>
            ))}
          </ol>
        </Block>

        <Block label="System">
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-4" aria-label="Pipeline">
            {project.pipeline.map((stage, n) => (
              <li key={stage} className="flex items-center gap-3">
                <span className="t-label rounded-full border border-[var(--line-strong)] px-3.5 py-2">{stage}</span>
                {n < project.pipeline.length - 1 && <Arrow direction="right" className="text-muted" />}
              </li>
            ))}
          </ol>
        </Block>

        {project.demo && (
          <Block label="Interactive">
            <Demo kind={project.demo} />
          </Block>
        )}

        <Block label="Outcome">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {project.outcomes.map((o, n) => (
              <ScrollInertia key={o.label} factor={0.004 * (n + 1)} max={10}>
                <dt className="t-label text-muted">{o.label}</dt>
                <dd className="mt-3 text-[clamp(1.6rem,3vw,2.6rem)] font-medium leading-none tracking-[-0.04em]">
                  {o.value}
                </dd>
              </ScrollInertia>
            ))}
          </dl>
          {project.links.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-4">
              {project.links.map((l) => (
                <MagneticButton key={l.href} to={l.href} variant="outline" arrow="right">
                  {l.label}
                </MagneticButton>
              ))}
            </div>
          )}
        </Block>
      </div>

      <div className="shell">
        <TransitionLink
          to={`/work/${next.slug}`}
          data-cursor="Next"
          className="group block border-t border-ink pb-16 pt-10 md:pb-24"
        >
          <span className="t-label text-muted">Next project — {next.index}</span>
          <span className="mt-6 flex items-end justify-between gap-6">
            <span className="t-h1 max-w-[14ch] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-4">
              {next.title}
            </span>
            <span className="mb-3 text-[clamp(1.6rem,4vw,3.2rem)]">
              <SwapArrow direction="right" />
            </span>
          </span>
        </TransitionLink>
      </div>
    </article>
  );
}
