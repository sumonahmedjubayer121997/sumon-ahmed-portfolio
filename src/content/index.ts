/**
 * Site content accessors.
 *
 * Content is pulled from Firestore at build time (scripts/content/pull.ts) into
 * src/generated/content.json — validated, static, and never fetched by visitors.
 * Structural data (navigation, the project-system concept spine) stays in code.
 */
import bundle from '@/generated/content.json';
import type { ContentBundle, PostMeta, Project } from './schema';

const content = bundle as unknown as ContentBundle;

export const site = content.site;
export const about = content.site.about;
export const projects = content.projects;
export const milestones = content.experience;
export const skillGroups = content.skills;
export const research = content.research;
export const contentMeta = content.meta;

export const getProject = (slug: string): Project | undefined => projects.find((p) => p.slug === slug);

/** Published posts in their curated order (bodies live in ./posts, loaded by the post page). */
export const posts: PostMeta[] = content.posts;

/** Newest first, for the archive and the feed. */
export const postsByDate: PostMeta[] = [...posts].sort((a, b) => b.date.localeCompare(a.date));

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);

/** Every tag in use, most used first. */
export const postTags: string[] = (() => {
  const counts = new Map<string, number>();
  posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
})();

/** Up to `n` other posts, most shared tags first, then newest. */
export function relatedPosts(post: PostMeta, n = 3) {
  const shared = (p: PostMeta) => p.tags.filter((t) => post.tags.includes(t)).length;
  return postsByDate
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: shared(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map(({ p }) => p);
}

export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export { navItems, type NavItem } from '@/data/site';
export { concepts, type Concept } from '@/data/projects';
export type {
  ConceptId,
  DemoKind,
  Figure,
  Milestone,
  Post,
  PostMeta,
  PreviewKind,
  Project,
  Research,
  Site,
  SkillGroup,
} from './schema';
export type { Block, PostDemoKind } from './markdown';
