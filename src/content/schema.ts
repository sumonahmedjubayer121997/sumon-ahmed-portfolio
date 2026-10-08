import { z } from 'zod';
import { parseMarkdown } from './markdown';

/**
 * Content schemas — the single source of truth for what lives in Firestore.
 * Used by the build-time pull (validation fails the build) and by /admin forms.
 *
 * Firestore cannot store nested arrays, so matrices and curves use flat arrays /
 * arrays of objects.
 */

/** Field paths still holding placeholder values (shown in the admin checklist). */
const placeholders = z.array(z.string()).default([]);

export const linkSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  href: z.string().min(1, 'URL is required'),
});

export const siteSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  role: z.string().min(1),
  disciplines: z.array(z.string().min(1)).min(1),
  statement: z.object({ lead: z.string().min(1), emphasis: z.string().min(1) }),
  intro: z.string().min(1),
  location: z.string().min(1),
  availability: z.string().min(1),
  email: z.email('Enter a valid email address'),
  socials: z.array(linkSchema),
  year: z.number().int().min(2000).max(2100),
  about: z.object({
    heading: z.string().min(1),
    paragraphs: z.array(z.string().min(1)).min(1),
    facts: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })),
    stages: z.array(z.object({ label: z.string().min(1), note: z.string() })).min(2),
  }),
  published: z.boolean().default(true),
  placeholders,
});

export const conceptIds = ['ai', 'rag', 'llm', 'ml', 'data', 'software'] as const;
export const previewKinds = ['sentiment', 'similarity', 'retrieval', 'interface'] as const;
export const demoKinds = ['preprocess', 'tfidf', 'rag-pipeline'] as const;

export const figureSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image'),
    url: z.url('Upload an image or enter a URL'),
    alt: z.string().min(1, 'Describe the image for screen readers'),
    caption: z.string().default(''),
  }),
  z.object({
    type: z.literal('confusion-matrix'),
    labels: z.array(z.string().min(1)).min(2),
    /** Row-major counts: row = actual class, column = predicted class. Length = labels² */
    values: z.array(z.number().nonnegative()),
    caption: z.string().default(''),
  }),
  z.object({
    type: z.literal('pr-curve'),
    series: z
      .array(
        z.object({
          label: z.string().min(1),
          points: z.array(z.object({ recall: z.number().min(0).max(1), precision: z.number().min(0).max(1) })).min(2),
        }),
      )
      .min(1)
      .max(3, 'Up to three models per chart — split more into separate figures'),
    caption: z.string().default(''),
  }),
]);

export const projectSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
    index: z.string().min(1),
    title: z.string().min(1),
    discipline: z.string().min(1),
    summary: z.string().min(1),
    year: z.string().min(1),
    role: z.string().min(1),
    type: z.string().min(1),
    stack: z.array(z.string().min(1)),
    concepts: z.array(z.enum(conceptIds)).min(1),
    position: z.object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
      align: z.enum(['left', 'right']),
    }),
    preview: z.enum(previewKinds),
    problem: z.string().min(1),
    approach: z.array(z.object({ title: z.string().min(1), body: z.string().min(1) })),
    pipeline: z.array(z.string().min(1)),
    outcomes: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })),
    decisions: z.array(z.object({ title: z.string().min(1), body: z.string().min(1) })).default([]),
    figures: z.array(figureSchema).default([]),
    demo: z.enum(demoKinds).optional(),
    links: z.array(linkSchema),
    repoUrl: z.union([z.url(), z.literal('')]).default(''),
    liveUrl: z.union([z.url(), z.literal('')]).default(''),
    order: z.number().default(0),
    published: z.boolean().default(true),
    placeholders,
  })
  .refine(
    (p) =>
      p.figures.every((f) => f.type !== 'confusion-matrix' || f.values.length === f.labels.length * f.labels.length),
    { message: 'Confusion matrix needs one value per label pair (labels²)', path: ['figures'] },
  );

export const milestoneSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  year: z.string().min(1),
  title: z.string().min(1),
  context: z.string().min(1),
  body: z.string().min(1),
  tags: z.array(z.string().min(1)),
  order: z.number().default(0),
  published: z.boolean().default(true),
  placeholders,
});

export const skillGroupSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  note: z.string().min(1),
  center: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
  items: z.array(z.string().min(1)).min(1),
  order: z.number().default(0),
  published: z.boolean().default(true),
  placeholders,
});

export const researchSchema = z.object({
  degree: z.string().min(1),
  institution: z.string().min(1),
  year: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  keywords: z.array(z.string().min(1)),
  abstract: z.array(z.string().min(1)).min(1),
  ethics: z.string().min(1),
  sample: z.string().min(1),
  /** Illustrative model output shown in Fig. 1 (0–1). */
  riskScore: z.number().min(0).max(1),
  figure: z.array(z.object({ id: z.string(), label: z.string().min(1), caption: z.string() })).length(6),
  published: z.boolean().default(true),
  placeholders,
});

export const postSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and dashes only'),
    index: z.string().min(1),
    title: z.string().min(1),
    excerpt: z.string().min(1, 'One sentence shown in the list and in link previews'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    tags: z.array(z.string().min(1)),
    /** Markdown — see src/content/markdown.ts for the supported syntax. */
    body: z.string().trim().min(1, 'Write the post'),
    order: z.number().default(0),
    published: z.boolean().default(true),
    placeholders,
  })
  .superRefine((p, ctx) => {
    for (const message of parseMarkdown(p.body).errors) ctx.addIssue({ code: 'custom', path: ['body'], message });
  });

export const contentBundleSchema = z.object({
  site: siteSchema,
  projects: z.array(projectSchema),
  experience: z.array(milestoneSchema),
  skills: z.array(skillGroupSchema),
  research: researchSchema,
  posts: z.array(postSchema),
  meta: z.object({
    source: z.enum(['firestore', 'seed']),
    pulledAt: z.string(),
    projectId: z.string().optional(),
  }),
});

export type Site = z.output<typeof siteSchema>;
export type Link = z.output<typeof linkSchema>;
export type Figure = z.output<typeof figureSchema>;
export type Project = z.output<typeof projectSchema>;
export type Milestone = z.output<typeof milestoneSchema>;
export type SkillGroup = z.output<typeof skillGroupSchema>;
export type Research = z.output<typeof researchSchema>;
export type Post = z.output<typeof postSchema>;
export type ContentBundle = z.output<typeof contentBundleSchema>;
export type ConceptId = (typeof conceptIds)[number];
export type PreviewKind = (typeof previewKinds)[number];
export type DemoKind = (typeof demoKinds)[number];

/** Firestore layout: collection documents keyed by slug/id, plus two singleton documents. */
export const collections = {
  site: { path: 'site', id: 'profile' },
  research: { path: 'research', id: 'main' },
  projects: 'projects',
  experience: 'experience',
  skills: 'skills',
  posts: 'posts',
} as const;
