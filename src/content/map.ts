/**
 * The embedding map (scripts/content/embed.ts → src/generated/embedding-map.json):
 * every passage of the site's writing, embedded and laid out in 3D. Imported
 * only by the /map page.
 */
import map from '@/generated/embedding-map.json';
import { palette } from '@/lib/color';

export type PassageKind = 'project' | 'post' | 'research' | 'about' | 'experience' | 'skills';
/** Colour groups: about, experience and skills read as one "profile". */
export type MapGroup = 'project' | 'post' | 'research' | 'profile';

export interface MapPoint {
  kind: PassageKind;
  title: string;
  section: string;
  excerpt: string;
  href: string;
  /** Position, roughly within the unit sphere. */
  p: [number, number, number];
  /** Nearest passages: [index, cosine similarity]. */
  n: Array<[number, number]>;
}

export const embeddingMap = map as unknown as { model: string; method?: string; points: MapPoint[] };

export const groupOf = (k: PassageKind): MapGroup =>
  k === 'project' || k === 'post' || k === 'research' ? k : 'profile';

export const groups: Array<{ id: MapGroup; label: string; color: string }> = [
  { id: 'project', label: 'Projects', color: palette.accent },
  { id: 'post', label: 'Writing', color: palette.ink },
  { id: 'research', label: 'Research', color: '#9C4A08' },
  { id: 'profile', label: 'Profile', color: palette.ash },
];

export const groupColor = (g: MapGroup) => groups.find((x) => x.id === g)!.color;

export const kindLabel: Record<PassageKind, string> = {
  project: 'Project',
  post: 'Note',
  research: 'Research',
  about: 'About',
  experience: 'Experience',
  skills: 'Skills',
};
