import { site } from '@/content';

/** Page titles — shared by the prerendered <title> (scripts/prerender.ts) and client navigation. */
export const siteTitle = `${site.name} — ${site.role} · AI & LLM Engineer`;
export const pageTitle = (title?: string) => (title ? `${title} — ${site.name}` : siteTitle);

/** Canonical origin for share links and feeds — the same value the prerender uses. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://sumonahmed.web.app').replace(/\/+$/, '');

export const BLOG_DESCRIPTION =
  'Notes on data science, machine learning and LLM systems — written to be understood, with working examples where it helps.';

export const MAP_DESCRIPTION =
  'Every passage of my projects, notes and research, embedded with a small language model and arranged in 3D by meaning.';
