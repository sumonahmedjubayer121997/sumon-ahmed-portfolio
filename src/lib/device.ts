/**
 * Device capability detection. Decides particle budgets and whether WebGL runs at all.
 *
 * Debug overrides (handy for testing fallbacks):
 *   ?webgl=0          force the non-WebGL fallbacks
 *   ?motion=reduce    simulate prefers-reduced-motion
 *   ?tier=low|mid|high force a quality tier
 *   ?settled          pre-run simulations to their organised state (visual QA)
 */
export type QualityTier = 'low' | 'mid' | 'high';

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

let webglCache: boolean | null = null;

export function supportsWebGL(): boolean {
  if (params?.get('webgl') === '0') return false;
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    webglCache = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

export const qaSettled = () => params?.has('settled') ?? false;

export const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches;

export const hasFinePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 768;

export function prefersReducedMotion(): boolean {
  if (params?.get('motion') === 'reduce') return true;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let tierCache: QualityTier | null = null;

export function getQualityTier(): QualityTier {
  const forced = params?.get('tier');
  if (forced === 'low' || forced === 'mid' || forced === 'high') return forced;
  if (tierCache) return tierCache;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 4;
  if (cores <= 2 || memory <= 2) tierCache = 'low';
  else if (isSmallScreen() || isTouchDevice() || cores <= 4) tierCache = 'mid';
  else tierCache = 'high';
  return tierCache;
}

/** Pick a value for the current quality tier. */
export function budget<T>(values: Record<QualityTier, T>): T {
  return values[getQualityTier()];
}
