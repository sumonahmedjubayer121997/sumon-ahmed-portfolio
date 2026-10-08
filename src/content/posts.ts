/**
 * Post bodies, parsed and syntax-highlighted at build time
 * (scripts/content/pull.ts → src/generated/posts.json). Imported only by the
 * post page, so the bodies stay out of the homepage bundle.
 */
import bodies from '@/generated/posts.json';
import type { Block } from './markdown';

const all = bodies as unknown as Record<string, Block[]>;

export const getPostBlocks = (slug: string): Block[] | undefined => all[slug];
