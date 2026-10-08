/**
 * Server entry, used only at build time by scripts/prerender.ts to render each
 * public route to static HTML. `prerenderToNodeStream` waits for lazy routes and
 * Suspense boundaries, so the HTML is complete.
 *
 * `progressiveChunkSize: Infinity` keeps every boundary inline. By default React
 * moves large boundaries (> 12.8 kB) into a hidden <div> that an inline script
 * reveals on the next animation frame — useful when streaming, but for a static
 * page it means a tab opened in the background (no animation frames) hydrates
 * against the fallback and fails.
 */
import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router';
import App from './App';

export async function render(url: string): Promise<string> {
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  );
  const chunks: Buffer[] = [];
  for await (const chunk of prelude) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export { site, projects, posts, research, skillGroups } from './content';
export { pageTitle, siteTitle } from './lib/meta';
