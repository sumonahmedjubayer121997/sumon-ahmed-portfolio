/**
 * Build-time syntax highlighting for blog code blocks (shiki), so visitors
 * download coloured HTML instead of a highlighter.
 *
 * Theme colours are nudged towards ink until they reach 4.5:1 contrast on the
 * code-block background — comments in most light themes don't, and the site
 * keeps its accessibility score.
 */
import { bundledLanguages, codeToTokens, type BundledLanguage } from 'shiki';
import type { Block } from '../../src/content/markdown';

const THEME = 'github-light';
const THEME_FG = '#24292e';
/** `bg-paper/70` over the ivory page: the code block's background. */
const BACKGROUND = '#efebe3';
const INK = '#151413';
const MIN_CONTRAST = 4.5;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const luminance = (c: number[]) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const readableCache = new Map<string, string>();
/** The theme colour, darkened towards ink just enough to be readable on the block. */
function readable(color: string) {
  const key = color.toLowerCase().slice(0, 7);
  const cached = readableCache.get(key);
  if (cached) return cached;
  const bg = rgb(BACKGROUND);
  const ink = rgb(INK);
  let c = rgb(key);
  for (let t = 0; contrast(c, bg) < MIN_CONTRAST && t < 1; t += 0.05)
    c = rgb(key).map((v, i) => v + (ink[i] - v) * (t + 0.05));
  const out = hex(c);
  readableCache.set(key, out);
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Adds `html` (highlighted lines) to code blocks in a language shiki knows; others stay plain. */
export async function highlight(blocks: Block[]): Promise<Block[]> {
  return Promise.all(
    blocks.map(async (b) => {
      if (b.type !== 'code' || !(b.lang in bundledLanguages)) return b;
      const { tokens } = await codeToTokens(b.code, { lang: b.lang as BundledLanguage, theme: THEME });
      const html = tokens
        .map((line) =>
          line
            .map((t) => {
              const styles = [
                t.color && t.color.toLowerCase().slice(0, 7) !== THEME_FG ? `color:${readable(t.color)}` : '',
                t.fontStyle && t.fontStyle & 1 ? 'font-style:italic' : '',
              ].filter(Boolean);
              return styles.length ? `<span style="${styles.join(';')}">${esc(t.content)}</span>` : esc(t.content);
            })
            .join(''),
        )
        .join('\n');
      return { ...b, html };
    }),
  );
}
