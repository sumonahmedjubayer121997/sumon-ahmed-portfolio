import { site } from '@/content';

/** Page titles — shared by the prerendered <title> (scripts/prerender.ts) and client navigation. */
export const siteTitle = `${site.name} — ${site.role} · AI & LLM Engineer`;
export const pageTitle = (title?: string) => (title ? `${title} — ${site.name}` : siteTitle);
