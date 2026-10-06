import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { supportsWebGL } from '@/lib/device';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Props every lazily-loaded WebGL scene receives. */
export interface SceneProps {
  /** False while off-screen: scenes stop their render loop. */
  active: boolean;
}

type SceneModule<P> = { default: ComponentType<P & SceneProps> };

export interface PhysicsCanvasProps<P extends object> {
  /** Module-level loader, e.g. `() => import('@/three/HeroScene')`. Must be stable. */
  load: () => Promise<SceneModule<P>>;
  sceneProps: P;
  /** Rendered when WebGL is unavailable, fails, or reduced motion is requested. */
  fallback: ReactNode;
  /** Must position the host (e.g. `absolute inset-0`, or `relative h-[80vh]`). */
  className: string;
  /** Mount immediately instead of when approaching the viewport. */
  eager?: boolean;
  /** Show the fallback instead of WebGL when reduced motion is on (default: true). */
  fallbackOnReducedMotion?: boolean;
}

class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[PhysicsCanvas] WebGL scene failed; showing fallback.', error, info.componentStack);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

const sceneCache = new WeakMap<object, ComponentType<never>>();

/**
 * Lazy, visibility-aware host for WebGL scenes:
 * - the three.js chunk is fetched only when the scene approaches the viewport
 * - the render loop pauses whenever the scene is off-screen
 * - falls back gracefully without WebGL, on errors, or with reduced motion
 */
export function PhysicsCanvas<P extends object>({
  load,
  sceneProps,
  fallback,
  className,
  eager = false,
  fallbackOnReducedMotion = true,
}: PhysicsCanvasProps<P>) {
  const reduced = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(eager);
  const [ready, setReady] = useState(false);
  const webgl = useMemo(() => supportsWebGL(), []);
  const useFallback = !webgl || (reduced && fallbackOnReducedMotion);

  const Scene = useMemo(() => {
    let cached = sceneCache.get(load) as ComponentType<P & SceneProps> | undefined;
    if (!cached) {
      cached = lazy(load);
      sceneCache.set(load, cached as ComponentType<never>);
    }
    return cached;
  }, [load]);

  // Eager scenes still wait for an idle moment, so first paint and the intro
  // typography never compete with parsing the three.js chunk.
  useEffect(() => {
    if (!eager || useFallback) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setMounted(true), { timeout: 700 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setMounted(true), 250);
    return () => window.clearTimeout(t);
  }, [eager, useFallback]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || useFallback) return;
    const mountObserver = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setMounted(true);
          mountObserver.disconnect();
        }
      },
      { rootMargin: '60% 0px' },
    );
    const activeObserver = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '10% 0px' });
    if (!eager) mountObserver.observe(el);
    activeObserver.observe(el);
    return () => {
      mountObserver.disconnect();
      activeObserver.disconnect();
    };
  }, [useFallback, eager]);

  const onReady = useMemo(() => () => setReady(true), []);

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      {useFallback
        ? fallback
        : mounted && (
            <SceneErrorBoundary fallback={fallback}>
              <Suspense fallback={null}>
                <div
                  className="absolute inset-0 transition-opacity duration-[1400ms] ease-out"
                  style={{ opacity: ready ? 1 : 0 }}
                >
                  <Scene {...sceneProps} active={active} />
                </div>
                <Ready onReady={onReady} />
              </Suspense>
            </SceneErrorBoundary>
          )}
    </div>
  );
}

/** Warm the three.js chunk during idle time so later scenes appear instantly. */
export function prefetchWhenIdle(loaders: Array<() => Promise<unknown>>) {
  const run = () => loaders.forEach((l) => l().catch(() => undefined));
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}
