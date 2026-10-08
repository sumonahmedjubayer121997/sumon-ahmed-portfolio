import { Suspense, lazy } from 'react';
import { useUI } from './lib/store';
import { registerAnnouncer } from './lib/announce';
import { useShortcuts } from './hooks/useShortcuts';
import { Route, Routes, useLocation } from 'react-router';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { useReducedMotion, useReducedMotionSync } from './hooks/useReducedMotion';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CustomCursor } from './components/layout/CustomCursor';
import { PageTransition } from './components/layout/PageTransition';
import { ScrollManager } from './components/layout/ScrollManager';
import HomePage from './pages/HomePage';

const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const BlogIndexPage = lazy(() => import('./pages/BlogIndexPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
/** Lab mode's stats panel — loaded the first time Lab mode is turned on. */
const LabHUD = lazy(() => import('./components/layout/LabHUD'));
/** Loaded the first time the palette opens (⌘K, "/", or the search button). */
const CommandPalette = lazy(() => import('./components/layout/CommandPalette'));
/** The private content studio — its own chunk (Firebase SDK, zod), never loaded by visitors. */
const AdminApp = lazy(() => import('./admin/AdminApp'));

function PageFallback() {
  return <div className="min-h-[100svh]" aria-busy="true" />;
}

export default function App() {
  const { pathname } = useLocation();
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <Suspense fallback={<PageFallback />}>
        <AdminApp />
      </Suspense>
    );
  }
  return <Site />;
}

function PaletteHost() {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPaletteOpen);
  if (!open) return null;
  return (
    <Suspense fallback={null}>
      <CommandPalette onClose={() => setOpen(false)} />
    </Suspense>
  );
}

function LabHost() {
  const on = useUI((s) => s.labMode && !s.reducedMotion);
  if (!on) return null;
  return (
    <Suspense fallback={null}>
      <LabHUD />
    </Suspense>
  );
}

function Site() {
  useReducedMotionSync();
  useShortcuts();
  const reduced = useReducedMotion();

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <LazyMotion features={domAnimation} strict>
        <a
          href="#main"
          className="sr-only-focusable t-label fixed left-4 top-3 z-[90] rounded-full bg-ink px-4 py-2 text-ivory"
        >
          Skip to content
        </a>
        <Navbar />
        <ScrollManager />
        <main id="main" tabIndex={-1} className="outline-none">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/work/:slug" element={<ProjectPage />} />
              <Route path="/blog" element={<BlogIndexPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <PageTransition />
        <CustomCursor />
        <PaletteHost />
        <LabHost />
        <p ref={registerAnnouncer} className="sr-only" aria-live="polite" aria-atomic="true" />
      </LazyMotion>
    </MotionConfig>
  );
}
