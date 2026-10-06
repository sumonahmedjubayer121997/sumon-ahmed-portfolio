import { site as seedSite } from '../data/site';
import { about as seedAbout } from '../data/about';
import { projects as seedProjects } from '../data/projects';
import { milestones as seedMilestones } from '../data/experience';
import { skillGroups as seedSkills } from '../data/skills';
import { research as seedResearch } from '../data/research';
import type { Milestone, Project, Research, Site, SkillGroup } from './schema';

/**
 * Starter content built from the stage-1 data files. Used to populate an empty
 * Firestore (from /admin) and as the offline fallback when Firestore isn't
 * configured. Fields that still hold invented values are listed in `placeholders`.
 */
export function seedContent() {
  const site: Site = {
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
    placeholders: ['email', 'socials', 'location', 'availability', 'about.facts'],
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
    repoUrl: '',
    liveUrl: '',
    order: i,
    published: true,
    // Project 04's outcomes describe this site and are accurate; the others are invented.
    placeholders: p.slug === 'web-applications' ? ['repoUrl'] : ['outcomes', 'repoUrl', 'decisions', 'figures'],
  }));

  const experience: Milestone[] = seedMilestones.map((m, i) => ({
    ...m,
    id: `exp-${m.year}`,
    tags: [...m.tags],
    order: i,
    published: true,
    placeholders: ['year', 'title', 'context', 'body'],
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
    placeholders: ['year', 'riskScore'],
  };

  return { site, projects, experience, skills, research };
}

export type SeedContent = ReturnType<typeof seedContent>;
