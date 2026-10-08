/**
 * Build step 3 (after `vite build` and the SSR build): renders every public
 * route to static HTML so pages are readable, indexable and previewable before
 * any JavaScript runs. React then hydrates the markup in the browser.
 *
 * Writes, into dist/:
 *   index.html, work/<slug>.html, blog.html, blog/<slug>.html, 404.html   prerendered pages
 *   app.html        empty client shell for routes that aren't prerendered (/admin)
 *   og/*.png        Open Graph images
 *   sitemap.xml, robots.txt, rss.xml
 *
 * VITE_SITE_URL (.env.production; the client uses it for share links) sets
 * canonical, Open Graph, sitemap and feed URLs. SITE_URL in the environment
 * overrides it.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { createOgRenderer, type OgCard } from './og';
import type { PostMeta, Project, Research, Site, SkillGroup } from '../src/content/schema';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const ssrDir = resolve(root, 'dist-ssr');
const env = { ...loadEnv('production', root, ['SITE_', 'VITE_SITE_']), ...process.env };
const SITE_URL = (env.SITE_URL || env.VITE_SITE_URL || 'https://sumonahmed.web.app').replace(/\/+$/, '');

/** What src/entry-server.tsx exports (it's bundled for Node by the SSR build). */
interface ServerModule {
  render(url: string): Promise<string>;
  site: Site;
  projects: Project[];
  posts: PostMeta[];
  postsByDate: PostMeta[];
  postTags: string[];
  research: Research;
  skillGroups: SkillGroup[];
  pageTitle(title?: string): string;
  siteTitle: string;
  BLOG_DESCRIPTION: string;
  MAP_DESCRIPTION: string;
}

const server: ServerModule = await import(pathToFileURL(resolve(ssrDir, 'entry-server.js')).href);
const { render, site, projects, posts, postsByDate, postTags, research, skillGroups, pageTitle, siteTitle } = server;

/* ───────────────────────── Helpers ───────────────────────── */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
const write = (file: string, data: string | Buffer) => {
  const path = resolve(dist, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
};

/** Vite's manifest: the JS chunks a lazy route needs, so they can be preloaded for hydration. */
type Manifest = Record<string, { file: string; imports?: string[]; isEntry?: boolean }>;
const manifest: Manifest = JSON.parse(readFileSync(resolve(dist, '.vite/manifest.json'), 'utf8'));
function chunksFor(src: string) {
  const out = new Set<string>();
  const visit = (key: string) => {
    const entry = manifest[key];
    if (!entry || entry.isEntry || out.has(entry.file)) return;
    out.add(entry.file);
    entry.imports?.forEach(visit);
  };
  visit(src);
  return [...out];
}

/* ───────────────────────── Routes ───────────────────────── */

interface Route {
  path: string;
  file: string;
  title: string;
  description: string;
  /** Open Graph image name (og/<image>.png), drawn from `card` when given. */
  image: string;
  card?: OgCard;
  type: 'website' | 'article';
  chunk?: string;
  ld?: unknown;
  extraMeta?: string;
  noindex?: boolean;
}

const person = { '@id': `${SITE_URL}/#person` };
const host = SITE_URL.replace(/^https?:\/\//, '');
const statement = `${site.statement.lead} ${site.statement.emphasis}`;

const routes: Route[] = [
  {
    path: '/',
    file: 'index.html',
    title: siteTitle,
    description: site.intro,
    type: 'website',
    image: 'home',
    card: {
      kicker: `${site.role} · ${site.disciplines.join(' · ')}`,
      title: statement,
      emphasis: site.statement.emphasis,
      footer: host,
      tags: ['Data', 'Machine learning', 'LLM systems'],
    },
    ld: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          ...person,
          name: site.name,
          jobTitle: site.role,
          description: site.intro,
          url: `${SITE_URL}/`,
          email: `mailto:${site.email}`,
          sameAs: site.socials.map((s) => s.href).filter((href) => /^https?:\/\/[^/]+\/.+/.test(href)),
          alumniOf: { '@type': 'CollegeOrUniversity', name: research.institution },
          knowsAbout: skillGroups.flatMap((g) => g.items),
        },
        { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: site.name, author: person },
      ],
    },
  },
  ...projects.map((p): Route => ({
    path: `/work/${p.slug}`,
    file: `work/${p.slug}.html`,
    title: pageTitle(p.title),
    description: p.summary,
    type: 'article',
    chunk: 'src/pages/ProjectPage.tsx',
    image: `work-${p.slug}`,
    card: {
      kicker: `Case study ${p.index} · ${p.discipline}`,
      title: p.title,
      footer: `${host}/work`,
      tags: p.stack,
    },
    ld: {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: p.title,
      description: p.summary,
      url: `${SITE_URL}/work/${p.slug}`,
      image: `${SITE_URL}/og/work-${p.slug}.png`,
      author: { '@type': 'Person', ...person, name: site.name, url: `${SITE_URL}/` },
      keywords: p.stack.join(', '),
      ...(p.repoUrl || p.liveUrl ? { sameAs: [p.repoUrl, p.liveUrl].filter(Boolean) } : {}),
    },
  })),
  {
    path: '/blog',
    file: 'blog.html',
    title: pageTitle('Writing'),
    description: server.BLOG_DESCRIPTION,
    type: 'website',
    chunk: 'src/pages/BlogIndexPage.tsx',
    image: 'blog',
    card: {
      kicker: `Writing · ${posts.length} ${posts.length === 1 ? 'note' : 'notes'}`,
      title: 'Notes from first principles.',
      emphasis: 'principles.',
      footer: `${host}/blog`,
      tags: postTags,
    },
    ld: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: `${site.name} — Writing`,
      description: server.BLOG_DESCRIPTION,
      url: `${SITE_URL}/blog`,
      author: { '@type': 'Person', ...person, name: site.name, url: `${SITE_URL}/` },
      blogPost: postsByDate.map((p) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        url: `${SITE_URL}/blog/${p.slug}`,
      })),
    },
  },
  {
    path: '/map',
    file: 'map.html',
    title: pageTitle('Map of ideas'),
    description: server.MAP_DESCRIPTION,
    type: 'website',
    chunk: 'src/pages/MapPage.tsx',
    image: 'map',
    card: {
      kicker: 'Map of ideas · embeddings + UMAP',
      title: 'Everything I’ve written, arranged by meaning.',
      emphasis: 'meaning.',
      footer: `${host}/map`,
      tags: ['Embeddings', 'UMAP', 'Similarity'],
    },
  },
  ...posts.map((p): Route => ({
    path: `/blog/${p.slug}`,
    file: `blog/${p.slug}.html`,
    title: pageTitle(p.title),
    description: p.excerpt,
    type: 'article',
    chunk: 'src/pages/BlogPostPage.tsx',
    extraMeta:
      `<meta property="article:published_time" content="${esc(p.date)}" />` +
      (p.updated ? `<meta property="article:modified_time" content="${esc(p.updated)}" />` : '') +
      p.tags.map((t) => `<meta property="article:tag" content="${esc(t)}" />`).join(''),
    image: `blog-${p.slug}`,
    card: {
      kicker: `Note ${p.index} · ${p.readingTime} read`,
      title: p.title,
      footer: `${host}/blog`,
      tags: p.tags,
    },
    ld: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.excerpt,
      datePublished: p.date,
      dateModified: p.updated || p.date,
      url: `${SITE_URL}/blog/${p.slug}`,
      mainEntityOfPage: `${SITE_URL}/blog/${p.slug}`,
      image: `${SITE_URL}/og/blog-${p.slug}.png`,
      author: { '@type': 'Person', ...person, name: site.name, url: `${SITE_URL}/` },
      keywords: p.tags.join(', '),
    },
  })),
  {
    path: '/404',
    file: '404.html',
    title: pageTitle('Not found'),
    description: 'This page doesn’t exist.',
    type: 'website',
    chunk: 'src/pages/NotFoundPage.tsx',
    noindex: true,
    image: 'home',
  },
];

/* ───────────────────────── HTML ───────────────────────── */

const template = readFileSync(resolve(dist, 'index.html'), 'utf8');
if (!template.includes('<div id="root"></div>'))
  throw new Error('dist/index.html has no empty #root — was it already prerendered?');

// Routes that aren't prerendered (the /admin studio) get the empty client shell.
write('app.html', template.replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />'));

// The template's generic head tags are replaced per page.
const base = template
  .replace(/\s*<title>[\s\S]*?<\/title>/, '')
  .replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, '')
  .replace(/\s*<meta\s+property="og:[^"]+"[\s\S]*?\/>/g, '');

// The display font of the largest contentful paint (hero name / page titles).
const font = readdirSync(resolve(dist, 'assets')).find((f) => /^inter-tight-latin-wght-normal-.*\.woff2$/.test(f));

function head(r: Route) {
  const url = `${SITE_URL}${r.path === '/' ? '/' : r.path}`;
  const image = `${SITE_URL}/og/${r.image}.png`;
  return [
    font && `<link rel="preload" as="font" type="font/woff2" href="/assets/${font}" crossorigin />`,
    ...(r.chunk ? chunksFor(r.chunk).map((f) => `<link rel="modulepreload" href="/${f}" />`) : []),
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}" />`,
    r.noindex ? `<meta name="robots" content="noindex" />` : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:type" content="${r.type}" />`,
    `<meta property="og:title" content="${esc(r.title)}" />`,
    `<meta property="og:description" content="${esc(r.description)}" />`,
    !r.noindex && `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(r.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(r.title)}" />`,
    `<meta name="twitter:description" content="${esc(r.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    r.extraMeta,
    r.ld ? jsonLd(r.ld) : '',
  ]
    .filter(Boolean)
    .map((tag) => `    ${tag}`)
    .join('\n');
}

const renderOg = createOgRenderer(root, site.name);
rmSync(resolve(dist, 'og'), { recursive: true, force: true });
const ogDone = new Set<string>();

for (const r of routes) {
  const app = await render(r.path);
  if (!app.includes('<h1')) throw new Error(`Prerendered ${r.path} has no <h1> — did the route render?`);
  // An outlined boundary would leave the page content outside its place until a script moves it.
  if (/<template id="B:|\$RC\(/.test(app)) throw new Error(`Prerendered ${r.path} has an outlined Suspense boundary.`);
  const html = base
    .replace('</head>', `${head(r)}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${app}</div>`);
  write(r.file, html);

  if (r.card && !ogDone.has(r.image)) {
    write(`og/${r.image}.png`, await renderOg(r.card));
    ogDone.add(r.image);
  }
  console.log(`[prerender] ${r.path.padEnd(48)} → ${r.file}`);
}

/* ───────────────────────── Sitemap + robots ───────────────────────── */

const today = new Date().toISOString().slice(0, 10);
const indexable = routes.filter((r) => !r.noindex);
const newest = postsByDate[0];
const lastmod = (r: Route) => {
  if (r.path === '/blog') return newest ? newest.updated || newest.date : today;
  const post = posts.find((p) => `/blog/${p.slug}` === r.path);
  return post ? post.updated || post.date : today;
};
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((r) => `  <url><loc>${SITE_URL}${r.path}</loc><lastmod>${lastmod(r)}</lastmod></url>`).join('\n')}
</urlset>
`,
);
write(
  'robots.txt',
  `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml
`,
);

/* ───────────────────────── CV ───────────────────────── */

// Uploaded in /admin, written by the content pull; served from Hosting like any file.
const cvSource = resolve(root, 'src/generated/cv');
rmSync(resolve(dist, 'cv'), { recursive: true, force: true });
if (existsSync(cvSource)) cpSync(cvSource, resolve(dist, 'cv'), { recursive: true });

/* ───────────────────────── RSS ───────────────────────── */

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rfc822 = (iso: string) => new Date(`${iso}T09:00:00Z`).toUTCString();
write(
  'rss.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${site.name} — Writing`)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${xml(server.BLOG_DESCRIPTION)}</description>
    <language>en-gb</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${newest ? `    <lastBuildDate>${rfc822(newest.updated || newest.date)}</lastBuildDate>\n` : ''}${postsByDate
    .map(
      (p) => `    <item>
      <title>${xml(p.title)}</title>
      <link>${SITE_URL}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${p.slug}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${xml(p.excerpt)}</description>
${p.tags.map((t) => `      <category>${xml(t)}</category>`).join('\n')}
    </item>`,
    )
    .join('\n')}
  </channel>
</rss>
`,
);

rmSync(ssrDir, { recursive: true, force: true });
console.log(`[prerender] ${routes.length} pages, ${ogDone.size} images, sitemap + RSS for ${SITE_URL}`);
