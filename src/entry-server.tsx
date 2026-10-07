/**
 * Server entry, used only at build time by scripts/prerender.ts to render each
 * public route to static HTML. `prerenderToNodeStream` waits for lazy routes and
 * Suspense boundaries, so the HTML is complete.
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
  );
  const chunks: Buffer[] = [];
  for await (const chunk of prelude) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

export { site, projects, posts, research, skillGroups } from './content';
export { pageTitle, siteTitle } from './lib/meta';
