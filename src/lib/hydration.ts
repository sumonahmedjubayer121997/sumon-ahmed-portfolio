import { useSyncExternalStore } from 'react';

/**
 * Pages are prerendered to HTML at build time and hydrated in the browser.
 * React's first render in the browser must reproduce the server's markup
 * exactly, so values that only the browser knows (WebGL support, quality tier,
 * reduced motion, timings) start at a server default and switch to the real
 * value right after hydration.
 *
 * Hydration is per component, not global: content inside <Suspense> (the whole
 * <main>) hydrates in a later pass than the app shell. So these are hooks that
 * React answers for the component being rendered, rather than a page-wide flag.
 */

export const isServer = typeof document === 'undefined';

/** The page arrived as prerendered HTML (in dev, and for /admin, #root starts empty). */
export const prerendered = !isServer && !!document.getElementById('root')?.firstElementChild;

const subscribeNever = () => () => {};
const no = () => false;
const yes = () => true;

/**
 * `server` during the server render and while this component hydrates;
 * `client()` afterwards and on client-only renders. `client` must return a
 * stable value.
 */
export function useClientValue<T>(client: () => T, server: T): T {
  return useSyncExternalStore(subscribeNever, client, () => server);
}

/**
 * True on the server and during this component's hydration render; false on
 * client-side renders (e.g. after navigation). Read it once, in a useState
 * initialiser, to choose a first-render mode that matches the prerendered HTML.
 */
export const useIsHydrating = () => useSyncExternalStore(subscribeNever, no, yes);
