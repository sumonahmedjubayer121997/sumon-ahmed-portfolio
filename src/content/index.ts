/**
 * Site content accessors.
 *
 * Content is pulled from Firestore at build time (scripts/content/pull.ts) into
 * src/generated/content.json — validated, static, and never fetched by visitors.
 * Structural data (navigation, the project-system concept spine) stays in code.
 */
import bundle from '@/generated/content.json';
import { parseMarkdown, readingTime, type Block } from './markdown';
import type { ContentBundle, Post, Project } from './schema';

const content = bundle as unknown as ContentBundle;

export const site = content.site;
export const about = content.site.about;
export const projects = content.projects;
export const milestones = content.experience;
export const skillGroups = content.skills;
export const research = content.research;
export const contentMeta = content.meta;

export const getProject = (slug: string): Project | undefined => projects.find((p) => p.slug === slug);

/** A post with its Markdown body parsed (validated at build time, so it parses cleanly). */
export interface RenderedPost extends Post {
  blocks: Block[];
  readingTime: string;
}

export const posts: RenderedPost[] = content.posts.map((p) => {
  const { blocks } = parseMarkdown(p.body);
  return { ...p, blocks, readingTime: readingTime(blocks) };
});

export const getPost = (slug: string) => posts.find((p) => p.slug === slug);

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
  PreviewKind,
  Project,
  Research,
  Site,
  SkillGroup,
} from './schema';
export type { Block, PostDemoKind } from './markdown';
