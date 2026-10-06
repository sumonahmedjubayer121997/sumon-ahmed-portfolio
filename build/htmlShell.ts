import type { Plugin } from 'vite';
import { navItems, site } from '../src/data/site';

/**
 * Static first-paint shell.
 *
 * The site is a client-rendered SPA, so without this the first paint waits for
 * the JS bundle. This plugin renders the navigation and hero copy (from the same
 * data file the React app uses) into #root, styled by the same Tailwind classes,
 * so text paints as soon as the CSS arrives. React replaces it on mount and the
 * hero continues the CSS intro from where the shell left off (see Hero.tsx).
 *
 * It also preloads the display font used by the largest contentful paint.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const arrow = (d: string) =>
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="square" class="h-[0.9em] w-[0.9em] shrink-0" aria-hidden="true"><path d="${d}"/></svg>`;
const ARROW = {
  upRight: 'M4 12 12 4M5.5 4H12v6.5',
  right: 'M2.5 8h11M9 3.5 13.5 8 9 12.5',
  down: 'M8 2.5v11M3.5 9 8 13.5 12.5 9',
};

const nameLine = (text: string, start: number) =>
  `<span class="block overflow-hidden pb-[0.04em]" aria-hidden="true">${[...text]
    .map(
      (ch, i) =>
        `<span class="intro-rise inline-block" style="--d:${(start + i * 0.035).toFixed(3)}s">${esc(ch)}</span>`,
    )
    .join('')}</span>`;

const tag = (text: string) => `<span class="inline-block"><span class="inline-block">${esc(text)}</span></span>`;

function renderShell() {
  const [first, last] = site.name.toUpperCase().split(' ');
  const logo = `<svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true"><g fill="currentColor"><circle cx="4" cy="6" r="1.4" opacity="0.5"/><circle cx="4" cy="14" r="1.4" opacity="0.5"/><circle cx="10" cy="4" r="1.4" opacity="0.8"/><circle cx="10" cy="10" r="1.4" opacity="0.8"/><circle cx="10" cy="16" r="1.4" opacity="0.8"/></g><circle cx="16.5" cy="10" r="2" fill="var(--color-accent)"/></svg>`;
  const btn =
    'group relative inline-flex items-center justify-center whitespace-nowrap rounded-full t-label transition-colors duration-300';

  return `
<header data-theme="light" class="fixed inset-x-0 top-0 z-50 border-b border-transparent text-ink">
  <nav aria-label="Primary" class="shell flex h-[var(--nav-h)] items-center justify-between gap-6">
    <a href="/" class="group t-label flex items-center gap-2.5">${logo}<span class="font-medium tracking-[0.18em]">${esc(site.name)}</span></a>
    <ul class="relative hidden items-center gap-8 md:flex lg:gap-10">${navItems
      .map((n) => `<li><a href="${n.href}" class="t-label py-2">${esc(n.label)}</a></li>`)
      .join('')}</ul>
    <div class="flex items-center gap-3">
      <span class="hidden md:inline-flex"><span class="inline-flex"><a href="/#contact" class="${btn} h-9 gap-2 border border-[var(--line-strong)] px-4 text-current"><span class="inline-block">Contact</span><span class="inline-flex">${arrow(ARROW.upRight)}</span></a></span></span>
      <span class="t-label -mr-2 flex h-10 items-center gap-2 px-2 md:hidden"><span>Menu</span><span class="relative block h-2.5 w-4"><span class="absolute left-0 top-0 h-px w-4 bg-current"></span><span class="absolute left-0 top-2 h-px w-4 bg-current"></span></span></span>
    </div>
  </nav>
</header>
<main>
  <section class="relative flex min-h-[100svh] flex-col overflow-hidden">
    <div class="shell relative z-10 flex flex-1 flex-col pb-5 pt-[calc(var(--nav-h)+8vh)] md:pb-6 md:pt-[calc(var(--nav-h)+7vh)]">
      <h1 class="t-display text-[21vw] md:whitespace-nowrap md:text-[13.6vw] 2xl:text-[12.8rem]"><span class="sr-only">${esc(site.name)}</span><span class="block md:flex md:gap-[0.22em]">${nameLine(first, 0.15)}${nameLine(last, 0.32)}</span></h1>
      <div class="intro-fade t-label mt-6 grid gap-2 text-ink md:mt-8 md:grid-cols-12 md:gap-6" style="--d:0.9s">
        <p class="flex items-center gap-2.5 md:col-span-3"><span class="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true"></span>${tag(site.role)}</p>
        <p class="md:col-span-5">${tag(site.disciplines.join(' · '))}</p>
        <p class="hidden text-muted md:col-span-4 md:block md:text-right">${tag(`${site.location} — ${site.year}`)}</p>
      </div>
      <div class="min-h-[14vh] flex-1 md:min-h-[6vh]"></div>
      <div class="grid gap-10 md:grid-cols-12 md:items-end md:gap-6">
        <p class="max-w-[16ch] text-[clamp(2.5rem,5.3vw,5.6rem)] font-medium leading-[0.98] tracking-[-0.045em] md:col-span-7">${esc(site.statement.lead)} <span class="t-serif">${esc(site.statement.emphasis)}</span></p>
        <div class="intro-fade flex flex-col gap-6 md:col-span-4 md:col-start-9" style="--d:1s;--intro-y:16px">
          <p class="max-w-[38ch] text-[0.98rem] leading-relaxed text-ink-2">${esc(site.intro)}</p>
          <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span class="inline-flex"><a href="/#work" class="${btn} h-12 gap-3 bg-ink px-6 text-ivory"><span class="inline-block">View work</span><span class="inline-flex">${arrow(ARROW.down)}</span></a></span>
            <span class="inline-flex"><a href="/#ai-lab" class="${btn} gap-2 py-2 text-current"><span class="inline-block pb-0.5">AI Lab</span><span class="inline-flex">${arrow(ARROW.right)}</span></a></span>
          </div>
        </div>
      </div>
      <div class="mt-10 h-[67px] border-t border-[var(--line)] md:mt-10"></div>
    </div>
  </section>
</main>`;
}

export function htmlShell(): Plugin {
  return {
    name: 'portfolio-html-shell',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        // Dev injects CSS through JS, so a shell would flash unstyled there — production only.
        if (!ctx.bundle) return html;
        // The shell mirrors the home hero, so it is shown only on "/" (deep links paint nothing until React mounts).
        const gate =
          `<script>if(location.pathname!=='/')document.documentElement.classList.add('no-shell')</script>` +
          `<style>.no-shell #shell{display:none}</style>`;
        const out = html
          .replace('</head>', `${gate}</head>`)
          .replace('<div id="root"></div>', `<div id="root"><div id="shell">${renderShell()}</div></div>`);
        const font = Object.keys(ctx.bundle).find((f) => /inter-tight-latin-wght-normal-.*\.woff2$/.test(f));
        if (!font) return out;
        return {
          html: out,
          tags: [
            {
              tag: 'link',
              attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${font}`, crossorigin: '' },
              injectTo: 'head-prepend',
            },
          ],
        };
      },
    },
  };
}
