/**
 * Open Graph images (1200×630 PNG) for link previews, rendered at build time
 * with satori (layout → SVG) and resvg (SVG → PNG). Same palette and type as
 * the site; the node graph echoes the favicon.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { layoutSketch, type SketchSpec, type SketchTone } from '../src/content/sketch';

const INK = '#151413';
const MUTED = '#6b665d';
const IVORY = '#f5f2eb';
const ACCENT = '#f28c28';

const fontFile = (root: string, pkg: string, file: string) =>
  readFileSync(resolve(root, 'node_modules', pkg, 'files', file));

function loadFonts(root: string) {
  return [
    {
      name: 'Inter Tight',
      weight: 500,
      style: 'normal',
      data: fontFile(root, '@fontsource/inter-tight', 'inter-tight-latin-500-normal.woff'),
    },
    {
      name: 'Mono',
      weight: 500,
      style: 'normal',
      data: fontFile(root, '@fontsource/jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff'),
    },
    {
      name: 'Serif',
      weight: 400,
      style: 'italic',
      data: fontFile(root, '@fontsource/instrument-serif', 'instrument-serif-latin-400-italic.woff'),
    },
    {
      name: 'Hand',
      weight: 500,
      style: 'normal',
      data: fontFile(root, '@fontsource/caveat', 'caveat-latin-500-normal.woff'),
    },
  ] as const;
}

type El = { type: string; props: Record<string, unknown> };
// satori counts an empty children array as "several children", so leave it out.
const h = (type: string, style: Record<string, unknown>, ...children: Array<El | string>): El => ({
  type,
  props: children.length ? { style, children: children.length === 1 ? children[0] : children } : { style },
});
const img = (src: string, width: number, height: number, style: Record<string, unknown> = {}): El => ({
  type: 'img',
  props: { src, width, height, style },
});
const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

/** A small layered network converging on one accent node. */
function network(w: number, height: number) {
  const layers = [3, 5, 4, 1];
  const pts = layers.map((n, i) => {
    const x = 34 + (i * (w - 68)) / (layers.length - 1);
    const gap = n > 1 ? Math.min(84, (height - 90) / (n - 1)) : 0;
    return Array.from({ length: n }, (_, j) => [x, height / 2 + (j - (n - 1) / 2) * gap] as const);
  });
  let lines = '';
  for (let i = 0; i < pts.length - 1; i++)
    for (const [x1, y1] of pts[i])
      for (const [x2, y2] of pts[i + 1])
        lines += `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${INK}" stroke-opacity="0.13" stroke-width="1.3"/>`;
  let dots = '';
  pts.forEach((layer, i) =>
    layer.forEach(([x, y]) => {
      dots +=
        i === pts.length - 1
          ? `<circle cx="${x}" cy="${y}" r="30" fill="none" stroke="${ACCENT}" stroke-opacity="0.35" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="15" fill="${ACCENT}"/>`
          : `<circle cx="${x}" cy="${y}" r="6.5" fill="${INK}" fill-opacity="${(0.3 + i * 0.22).toFixed(2)}"/>`;
    }),
  );
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${lines}${dots}</svg>`,
  );
}

const LOGO = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="28" height="28"><g fill="${INK}"><circle cx="4" cy="6" r="1.4" opacity="0.5"/><circle cx="4" cy="14" r="1.4" opacity="0.5"/><circle cx="10" cy="4" r="1.4" opacity="0.8"/><circle cx="10" cy="10" r="1.4" opacity="0.8"/><circle cx="10" cy="16" r="1.4" opacity="0.8"/></g><circle cx="16.5" cy="10" r="2" fill="${ACCENT}"/></svg>`,
);

const TONE: Record<SketchTone, string> = { ink: INK, muted: MUTED, accent: ACCENT };

/**
 * A post's header sketch for its preview: strokes as an image, labels as text in
 * the handwriting font (text inside an SVG image wouldn't get the font), both
 * placed from the same layout the site draws.
 */
function sketchCard(spec: SketchSpec, width: number, style: Record<string, unknown>): El {
  const L = layoutSketch(spec);
  const k = width / L.width;
  const height = Math.round(L.height * k);
  const paths = L.strokes
    .map(
      (s) =>
        `<path d="${s.d}" fill="none" stroke="${TONE[s.tone]}" stroke-width="${s.width * 1.3}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');
  const strokes = svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${L.width} ${L.height}">${paths}</svg>`,
  );
  const box = 320;
  const labels = L.texts.map((t) => {
    const size = t.size * k;
    const left = t.anchor === 'middle' ? t.x * k - box / 2 : t.anchor === 'end' ? t.x * k - box : t.x * k;
    return h(
      'div',
      {
        position: 'absolute',
        left,
        top: t.y * k - size * 0.62,
        width: box,
        display: 'flex',
        justifyContent: t.anchor === 'middle' ? 'center' : t.anchor === 'end' ? 'flex-end' : 'flex-start',
        fontFamily: 'Hand',
        fontSize: size,
        lineHeight: 1.2,
        color: TONE[t.tone],
      },
      t.text,
    );
  });
  return h(
    'div',
    { position: 'absolute', width, height, display: 'flex', ...style },
    img(strokes, width, height),
    ...labels,
  );
}

export interface OgCard {
  /** Small mono line above the title, e.g. "Case study 02 · Machine Learning". */
  kicker: string;
  title: string;
  /** Trailing words of the title set in the serif italic (must be the end of `title`). */
  emphasis?: string;
  /** Bottom-left, e.g. the site and section without the protocol. */
  footer: string;
  tags: string[];
  /** A post's header sketch, drawn on the right instead of the network graphic. */
  sketch?: SketchSpec;
}

const titleSize = (len: number) => (len <= 22 ? 96 : len <= 36 ? 76 : len <= 56 ? 64 : 56);

export function createOgRenderer(root: string, name: string) {
  const fonts = loadFonts(root);
  const graph = network(330, 430);

  return async function renderOg(card: OgCard): Promise<Buffer> {
    const plain = card.emphasis ? card.title.slice(0, card.title.length - card.emphasis.length).trim() : card.title;
    const words = [
      ...plain.split(/\s+/).map((w) => h('span', { marginRight: '0.24em' }, w)),
      ...(card.emphasis?.split(/\s+/) ?? []).map((w) =>
        h('span', { marginRight: '0.24em', fontFamily: 'Serif', fontStyle: 'italic', fontWeight: 400 }, w),
      ),
    ];

    const tree = h(
      'div',
      {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '60px 72px 56px',
        background: IVORY,
        color: INK,
        fontFamily: 'Inter Tight',
        position: 'relative',
      },
      card.sketch
        ? sketchCard(card.sketch, 400, { right: 56, top: 190 })
        : img(graph, 330, 430, { position: 'absolute', right: 52, top: 100 }),
      h(
        'div',
        { display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'Mono', fontSize: 20, letterSpacing: 4 },
        img(LOGO, 28, 28),
        name.toUpperCase(),
      ),
      h(
        'div',
        { display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 690 },
        h('div', { fontFamily: 'Mono', fontSize: 19, letterSpacing: 2.5, color: MUTED }, card.kicker.toUpperCase()),
        h(
          'div',
          {
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: titleSize(card.title.length),
            fontWeight: 500,
            lineHeight: 1.02,
            letterSpacing: '-0.04em',
          },
          ...words,
        ),
      ),
      h(
        'div',
        {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1.5px solid rgba(21, 20, 19, 0.16)`,
          paddingTop: 24,
          fontFamily: 'Mono',
          fontSize: 18,
          letterSpacing: 1.5,
          color: MUTED,
        },
        card.footer,
        h(
          'div',
          { display: 'flex', alignItems: 'center', gap: 12, color: INK },
          h('div', { width: 9, height: 9, borderRadius: 9, background: ACCENT }),
          card.tags.slice(0, 3).join(' · ').toUpperCase(),
        ),
      ),
    );

    const svg = await satori(tree as never, { width: 1200, height: 630, fonts: fonts as never });
    return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  };
}
