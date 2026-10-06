import { Suspense, lazy } from 'react';
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
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
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

function Site() {
  useReducedMotionSync();
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
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <PageTransition />
        <CustomCursor />
      </LazyMotion>
    </MotionConfig>
  );
}
