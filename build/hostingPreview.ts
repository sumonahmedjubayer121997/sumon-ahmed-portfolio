import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Makes `vite preview` serve the prerendered build the way Firebase Hosting
 * does (see firebase.json): clean URLs (/work/x → work/x.html), the client-only
 * shell for /admin, and 404.html with a real 404 status for anything else —
 * never the homepage, whose markup would not match the route being hydrated.
 */
export function hostingPreview(): Plugin {
  return {
    name: 'portfolio-hosting-preview',
    configurePreviewServer(server) {
      const dist = resolve(server.config.root, server.config.build.outDir);
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const path = decodeURIComponent(url.pathname);
        if (path === '/admin' || path.startsWith('/admin/')) {
          req.url = '/app.html';
          return next();
        }
        if (path === '/' || existsSync(join(dist, path))) return next();
        if (!extname(path) && existsSync(join(dist, `${path}.html`))) {
          req.url = `${path}.html${url.search}`;
          return next();
        }
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(readFileSync(join(dist, '404.html')));
      });
    },
  };
}
