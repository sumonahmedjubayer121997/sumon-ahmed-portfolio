/**
 * Site content accessors.
 *
 * Content is pulled from Firestore at build time (scripts/content/pull.ts) into
 * src/generated/content.json — validated, static, and never fetched by visitors.
 * Structural data (navigation, the project-system concept spine) stays in code.
 */
import bundle from '@/generated/content.json';
import type { ContentBundle, Project } from './schema';

const content = bundle as unknown as ContentBundle;

export const site = content.site;
export const about = content.site.about;
export const projects = content.projects;
export const milestones = content.experience;
export const skillGroups = content.skills;
export const research = content.research;
export const contentMeta = content.meta;

export const getProject = (slug: string): Project | undefined => projects.find((p) => p.slug === slug);

export { navItems, type NavItem } from '@/data/site';
export { concepts, type Concept } from '@/data/projects';
export type {
  ConceptId,
  DemoKind,
  Figure,
  Milestone,
  PreviewKind,
  Project,
  Research,
  Site,
  SkillGroup,
} from './schema';
