import { Schema } from 'firebase/ai';
import { conceptIds, previewKinds, type ConceptId, type PreviewKind, type Project } from '@/content/schema';
import { parseMarkdown, postDemoKinds } from '@/content/markdown';
import { sketchKinds, sketchProblems, type SketchKind, type SketchSpec } from '@/content/sketch';
import { generateJson } from './client';
import { keepUrlFromNotes, numbersIn, unsupportedNumbers, unsupportedUrls } from './guards';

/**
 * "Organize my notes": rough notes in, the editor's fields out. The model is told
 * to use only what the notes say; guards.ts then checks every number and link.
 */

const RULES = `You turn Sumon Ahmed's rough notes into finished content for his portfolio website. Sumon is a data scientist and AI engineer.

Rules — follow them exactly:
1. Use only facts, numbers, names, dates, datasets, tools, links and claims that appear in the notes. Never invent results, metrics, percentages, dates, employers, quotes or URLs. If a reader would expect something the notes don't contain, leave it out and ask about it in "questions".
2. Keep the author's voice and wording where it works. Fix grammar and spelling, put ideas in a logical order, group related points, and cut repetition. Use British English spelling.
3. Plain, specific language. No hype or filler ("revolutionary", "game-changing", "cutting-edge", "delve", "in today's fast-paced world", "unlock", "seamless"). No emoji.
4. Don't pad. The result can be shorter than the notes. Don't add sections the notes don't support or a conclusion that only repeats.
5. "questions": up to 6 short, specific questions about missing facts a reader would expect (results, data, dates, links, your role). Empty if nothing is missing.`;

const BODY_FORMAT = `Body format — this exact Markdown subset (anything else won't render):
- "## Heading" for sections and "### Subheading" for subsections (never "#"). Use 3 or more "##" sections for longer posts.
- Paragraphs separated by a blank line; inline **bold**, *italic*, \`code\` and [label](https://… or /site/path).
- "- item" bullet lists and "1. item" numbered lists.
- Code from the notes in fenced blocks with a language: \`\`\`python … \`\`\`. Never change what code does.
- "$$ formula $$" for a formula on its own line.
- "> [!NOTE] text", "> [!TIP] text" or "> [!WARNING] text" for a callout; "> text" for a quote.
- "![What the image shows](https://… "Caption")" only for image URLs given in the notes.
- "<Demo kind="…" />" (kinds: ${postDemoKinds.join(', ')}) only if the notes ask for that demo.
- No tables, no HTML, no front matter, no title line (the title is a separate field).`;

const str = (description: string) => Schema.string({ description });
const list = (description: string, items = Schema.string()) => Schema.array({ description, items });
const titled = (description: string) =>
  list(description, Schema.object({ properties: { title: Schema.string(), body: Schema.string() } }));

/* ───────────────────────── Posts ───────────────────────── */

export interface PostContext {
  tags: string[];
  titles: string[];
  example?: { title: string; body: string };
}

export interface PostSuggestion {
  title: string;
  altTitles: string[];
  excerpt: string;
  tags: string[];
  body: string;
  questions: string[];
  /** Raised by the guards, not the model. */
  warnings: string[];
  model: string;
}

const postSchema = Schema.object({
  properties: {
    title: str('Clear, specific title, at most 70 characters, no clickbait.'),
    altTitles: list('Three different alternative titles.'),
    excerpt: str('One sentence, at most 160 characters: what the reader will learn.'),
    tags: list('1 to 4 short tags, reusing existing tags where they fit, in the same style.'),
    body: str('The post body in the Markdown subset described.'),
    questions: list('Questions about missing facts; empty if none.'),
  },
});

export async function organizePost(notes: string, ctx: PostContext): Promise<PostSuggestion> {
  const prompt = [
    ctx.tags.length ? `Existing tags (reuse where they fit): ${ctx.tags.join(', ')}` : '',
    ctx.titles.length ? `Existing post titles (for context; don't duplicate): ${ctx.titles.join(' · ')}` : '',
    ctx.example
      ? `Style reference — the start of one of the author's published posts:\nTitle: ${ctx.example.title}\n${ctx.example.body.slice(0, 1800)}`
      : '',
    `NOTES (the only source of facts):\n<<<\n${notes.trim()}\n>>>`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const { data, model } = await generateJson<Omit<PostSuggestion, 'warnings' | 'model'>>({
    system: `${RULES}\n\nYou are writing a blog post.\n\n${BODY_FORMAT}`,
    prompt,
    schema: postSchema,
  });

  const s: PostSuggestion = {
    title: (data.title ?? '').trim(),
    altTitles: (data.altTitles ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 4),
    excerpt: (data.excerpt ?? '').trim(),
    tags: [...new Set((data.tags ?? []).map((t) => t.trim()).filter(Boolean))].slice(0, 4),
    body: (data.body ?? '').trim(),
    questions: (data.questions ?? []).filter(Boolean).slice(0, 6),
    warnings: [],
    model,
  };

  const text = [s.title, s.excerpt, s.body].join('\n');
  const nums = unsupportedNumbers(text, notes);
  if (nums.length) s.warnings.push(`Numbers that aren’t in your notes: ${nums.join(', ')} — check or remove them.`);
  const urls = unsupportedUrls(s.body, notes);
  if (urls.length) s.warnings.push(`Links that aren’t in your notes: ${urls.join(', ')}`);
  const { errors } = parseMarkdown(s.body);
  if (errors.length) s.warnings.push(`Formatting: ${errors.slice(0, 3).join('; ')}`);
  return s;
}

/* ───────────────────────── Projects ───────────────────────── */

export interface ProjectContext {
  skills: string[];
  titles: string[];
  example?: Partial<Project>;
}

type Titled = { title: string; body: string };

export interface ProjectSuggestion {
  title: string;
  altTitles: string[];
  summary: string;
  discipline: string;
  type: string;
  year: string;
  role: string;
  stack: string[];
  concepts: ConceptId[];
  preview: PreviewKind;
  problem: string;
  approach: Titled[];
  pipeline: string[];
  outcomes: Array<{ label: string; value: string }>;
  decisions: Titled[];
  repoUrl: string;
  liveUrl: string;
  questions: string[];
  warnings: string[];
  model: string;
}

const projectSchema = Schema.object({
  properties: {
    title: str('Project name, at most 50 characters.'),
    altTitles: list('Two alternative names.'),
    summary: str('One or two sentences, at most 220 characters: what it is and why it matters.'),
    discipline: str('Fields joined with " · ", like the examples (e.g. "Machine Learning · NLP").'),
    type: str('What kind of project, a few words (e.g. "LLM application", "MSc research").'),
    year: str('Year or range from the notes (e.g. "2025", "2023 — now"); empty if the notes give none.'),
    role: str('Sumon’s role, a few words joined with " · "; empty if the notes give none.'),
    stack: list('Tools, languages and libraries the notes mention; spell them like the known skills list.'),
    concepts: list(
      'The site areas this project belongs to.',
      Schema.enumString({ enum: [...conceptIds], description: 'ai, rag, llm, ml (machine learning), data, software' }),
    ),
    preview: Schema.enumString({
      enum: [...previewKinds],
      description:
        'The card animation that fits best: sentiment (text classification), similarity (recommenders, embeddings), retrieval (search, RAG), interface (apps, tools).',
    }),
    problem: str('The problem, 2 to 4 sentences.'),
    approach: titled('3 to 6 steps of how it was built, each a short title and 1 to 3 sentences.'),
    pipeline: list('3 to 7 short stage names from input to output (e.g. "Raw text", "Embeddings", "Ranking").'),
    outcomes: list(
      'Up to 4 results. A value with a number only if that number is in the notes; otherwise a short qualitative value, or leave it out.',
      Schema.object({ properties: { label: Schema.string(), value: Schema.string() } }),
    ),
    decisions: titled('Up to 4 decisions or trade-offs the notes describe; empty if none.'),
    repoUrl: str('Source code URL exactly as written in the notes, or empty.'),
    liveUrl: str('Live demo URL exactly as written in the notes, or empty.'),
    questions: list('Questions about missing facts; empty if none.'),
  },
});

const asConcepts = (v: unknown): ConceptId[] => {
  const ok = (Array.isArray(v) ? v : []).filter((c): c is ConceptId => (conceptIds as readonly string[]).includes(c));
  return ok.length ? [...new Set(ok)] : ['ml'];
};

export async function organizeProject(notes: string, ctx: ProjectContext): Promise<ProjectSuggestion> {
  const ex = ctx.example;
  const prompt = [
    ctx.skills.length ? `Known skills (match this spelling): ${ctx.skills.join(', ')}` : '',
    ctx.titles.length ? `Existing projects (for context; don't duplicate): ${ctx.titles.join(' · ')}` : '',
    ex
      ? `Style reference — one of the author's published projects:\n${JSON.stringify({
          title: ex.title,
          discipline: ex.discipline,
          type: ex.type,
          role: ex.role,
          summary: ex.summary,
          approach: ex.approach?.slice(0, 2),
          pipeline: ex.pipeline,
          outcomes: ex.outcomes,
        })}`
      : '',
    `NOTES (the only source of facts):\n<<<\n${notes.trim()}\n>>>`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const { data, model } = await generateJson<Omit<ProjectSuggestion, 'warnings' | 'model'>>({
    system: `${RULES}\n\nYou are writing a project case study. Never put a number in "outcomes", "year" or any text unless that number is in the notes.`,
    prompt,
    schema: projectSchema,
  });

  const trimTitled = (xs: Titled[] | undefined, max: number) =>
    (xs ?? []).filter((x) => x?.title?.trim() && x?.body?.trim()).slice(0, max);

  const s: ProjectSuggestion = {
    title: (data.title ?? '').trim(),
    altTitles: (data.altTitles ?? []).filter(Boolean).slice(0, 3),
    summary: (data.summary ?? '').trim(),
    discipline: (data.discipline ?? '').trim(),
    type: (data.type ?? '').trim(),
    year: (data.year ?? '').trim(),
    role: (data.role ?? '').trim(),
    stack: [...new Set((data.stack ?? []).map((t) => t.trim()).filter(Boolean))].slice(0, 12),
    concepts: asConcepts(data.concepts),
    preview: (previewKinds as readonly string[]).includes(data.preview) ? data.preview : 'interface',
    problem: (data.problem ?? '').trim(),
    approach: trimTitled(data.approach, 6),
    pipeline: (data.pipeline ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 7),
    outcomes: [],
    decisions: trimTitled(data.decisions, 4),
    repoUrl: keepUrlFromNotes((data.repoUrl ?? '').trim(), notes),
    liveUrl: keepUrlFromNotes((data.liveUrl ?? '').trim(), notes),
    questions: (data.questions ?? []).filter(Boolean).slice(0, 6),
    warnings: [],
    model,
  };

  // Results: a value whose numbers aren't in the notes is dropped and asked about instead.
  for (const o of data.outcomes ?? []) {
    if (!o?.label?.trim() || !o?.value?.trim()) continue;
    if (unsupportedNumbers(`${o.label} ${o.value}`, notes).length) {
      s.questions.push(`What’s the real figure for “${o.label}”? (A number was suggested that isn’t in your notes.)`);
    } else if (s.outcomes.length < 4) {
      s.outcomes.push({ label: o.label.trim(), value: o.value.trim() });
    }
  }
  if (s.year && numbersIn(s.year).some((n) => unsupportedNumbers(n, notes).length)) {
    s.year = '';
    s.questions.push('Which year (or years) was this built?');
  }

  const text = [
    s.title,
    s.summary,
    s.problem,
    ...s.approach.flatMap((a) => [a.title, a.body]),
    ...s.decisions.flatMap((a) => [a.title, a.body]),
    ...s.pipeline,
  ].join('\n');
  const nums = unsupportedNumbers(text, notes);
  if (nums.length) s.warnings.push(`Numbers that aren’t in your notes: ${nums.join(', ')} — check or remove them.`);
  const urls = unsupportedUrls(text, notes);
  if (urls.length) s.warnings.push(`Links that aren’t in your notes: ${urls.join(', ')}`);
  return s;
}

/* ───────────────────────── Header sketch ───────────────────────── */

export interface SketchSuggestion {
  spec: SketchSpec;
  warnings: string[];
  model: string;
}

const sketchResponse = Schema.object({
  properties: {
    kind: Schema.enumString({
      enum: [...sketchKinds],
      description:
        'pipeline: a process or flow (A → B → C). cycle: a loop that repeats (e.g. an agent). compare: exactly two approaches or options side by side. bar: only when the post states numeric results to compare.',
    }),
    labels: list('2 to 5 short labels in order, at most 22 characters each (compare: exactly 2).'),
    values: list('bar only: one value per label, copied exactly from the post (e.g. "0.81", "92%"); empty otherwise.'),
    caption: str('Optional caption under the sketch, at most 70 characters; empty if not needed.'),
  },
});

/** Suggests a header sketch for a post. Chart numbers must appear in the post, or the chart is turned down. */
export async function suggestSketch(post: { title: string; excerpt: string; body: string }): Promise<SketchSuggestion> {
  const { data, model } = await generateJson<{ kind: SketchKind; labels: string[]; values: string[]; caption: string }>(
    {
      system: `You choose one small hand-drawn diagram that captures the main idea of a blog post by Sumon Ahmed, a data scientist and AI engineer. Use only ideas, terms and numbers from the post. Labels are short and concrete, in the post's own words, in British English. Prefer the diagram a reader would sketch on a whiteboard to explain the post.`,
      prompt: `Title: ${post.title}
Summary: ${post.excerpt}

POST:
<<<
${post.body.slice(0, 12000)}
>>>`,
      schema: sketchResponse,
      temperature: 0.3,
    },
  );
  const warnings: string[] = [];
  let labels = (data.labels ?? [])
    .map((l) => l.trim().slice(0, 28))
    .filter(Boolean)
    .slice(0, 6);
  let kind: SketchKind = sketchKinds.includes(data.kind) ? data.kind : 'pipeline';
  let values = kind === 'bar' ? (data.values ?? []).map((v) => v.trim()).slice(0, labels.length) : undefined;
  const source = `${post.title}
${post.excerpt}
${post.body}`;
  if (
    kind === 'bar' &&
    (!values || values.length !== labels.length || values.some((v) => unsupportedNumbers(v, source).length))
  ) {
    warnings.push('The suggested chart used numbers that aren’t in the post, so it was turned into a diagram instead.');
    kind = labels.length === 2 ? 'compare' : 'pipeline';
    values = undefined;
  }
  if (kind === 'compare' && labels.length !== 2) kind = 'pipeline';
  if (labels.length < 2) labels = [post.title.slice(0, 28), 'Key idea'];
  const caption = (data.caption ?? '').trim().slice(0, 90);
  const spec: SketchSpec = { kind, labels, ...(values ? { values } : {}), ...(caption ? { caption } : {}) };
  for (const problem of sketchProblems(spec)) warnings.push(problem);
  return { spec, warnings, model };
}
