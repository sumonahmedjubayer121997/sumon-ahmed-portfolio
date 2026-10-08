import { site as seedSite } from '../data/site';
import { about as seedAbout } from '../data/about';
import { projects as seedProjects } from '../data/projects';
import { milestones as seedMilestones } from '../data/experience';
import { skillGroups as seedSkills } from '../data/skills';
import { research as seedResearch } from '../data/research';
import { posts as seedPosts } from '../data/blog';
import type { Milestone, Post, Project, Research, SiteInput, SkillGroup } from './schema';

const REPOS: Record<string, string> = {
  'netflix-recommendation-system': 'https://github.com/sumonahmedjubayer121997/ds_netflix_Movie_Recommender_backend',
  'web-applications': 'https://github.com/sumonahmedjubayer121997/sumon-ahmed-portfolio',
};

/**
 * Which starter fields are still invented, per project. The Netflix write-up comes
 * from its repositories; project 04 describes this site. Mental-health and RAG
 * still need real results, code links and design decisions.
 */
const PROJECT_PLACEHOLDERS: Record<string, string[]> = {
  'netflix-recommendation-system': ['decisions'],
  'web-applications': [],
  'mental-health-detection': ['approach', 'outcomes', 'repoUrl', 'decisions', 'figures'],
  'rag-system': ['approach', 'outcomes', 'repoUrl', 'decisions', 'figures'],
};

/**
 * Starter content built from the stage-1 data files. Used to populate an empty
 * Firestore (from /admin) and as the offline fallback when Firestore isn't
 * configured. Fields that still hold invented values are listed in `placeholders`.
 */
export function seedContent() {
  const site: SiteInput = {
    ...seedSite,
    disciplines: [...seedSite.disciplines],
    statement: { ...seedSite.statement },
    socials: seedSite.socials.map((s) => ({ ...s })),
    about: {
      heading: seedAbout.heading,
      paragraphs: [...seedAbout.paragraphs],
      facts: seedAbout.facts.map((f) => ({ ...f })),
      stages: seedAbout.stages.map((s) => ({ ...s })),
    },
    published: true,
    // Email and socials are the public ones from the GitHub profile; these still need confirming.
    placeholders: ['location', 'availability', 'about.facts'],
  };

  const projects: Project[] = seedProjects.map((p, i) => ({
    ...p,
    stack: [...p.stack],
    concepts: [...p.concepts],
    position: { ...p.position },
    approach: p.approach.map((a) => ({ ...a })),
    pipeline: [...p.pipeline],
    outcomes: p.outcomes.map((o) => ({ ...o })),
    links: p.links.map((l) => ({ ...l })),
    decisions: [],
    figures: [],
    repoUrl: REPOS[p.slug] ?? '',
    liveUrl: '',
    order: i,
    published: true,
    placeholders: PROJECT_PLACEHOLDERS[p.slug] ?? ['outcomes', 'repoUrl', 'decisions', 'figures'],
  }));

  const experience: Milestone[] = seedMilestones.map((m, i) => ({
    ...m,
    id: `exp-${m.year}`,
    tags: [...m.tags],
    order: i,
    published: true,
    placeholders: ['year', 'context', 'body'],
  }));

  const skills: SkillGroup[] = seedSkills.map((g, i) => ({
    ...g,
    center: { ...g.center },
    items: [...g.items],
    order: i,
    published: true,
    placeholders: [],
  }));

  const research: Research = {
    ...seedResearch,
    keywords: [...seedResearch.keywords],
    abstract: [...seedResearch.abstract],
    figure: seedResearch.figure.map((f) => ({ ...f })),
    riskScore: 0.81,
    published: true,
    placeholders: ['year', 'riskScore', 'abstract'],
  };

  // Explainers drafted for you: read them and make them yours, then mark as real.
  const posts: Post[] = seedPosts.map((p, i) => ({
    ...p,
    tags: [...p.tags],
    body: p.body.trim(),
    updated: '',
    order: i,
    published: true,
    placeholders: ['body'],
  }));

  return { site, projects, experience, skills, research, posts };
}

export type SeedContent = ReturnType<typeof seedContent>;
