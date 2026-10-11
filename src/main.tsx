import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
// Handwriting for blog sketches; the browser only downloads it on pages that use it.
import '@fontsource/caveat/500.css';
import './index.css';
import { installPointer } from './lib/pointer';
import { installScroll } from './lib/scroll';
import App from './App';

installPointer();
installScroll();

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Production pages are prerendered (scripts/prerender.ts): hydrate the existing
// markup. Dev and /admin start from an empty #root.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
