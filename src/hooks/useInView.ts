import { useEffect, useState, type RefObject } from 'react';

/** Reactive IntersectionObserver flag. `once` keeps it true after the first hit. */
export function useInView(ref: RefObject<Element | null>, options: { rootMargin?: string; once?: boolean } = {}) {
  const { rootMargin = '0px', once = false } = options;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting && once) io.disconnect();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);

  return inView;
}

/** Non-reactive visibility tracker for render loops (no re-renders). */
export function observeVisibility(el: Element, cb: (visible: boolean) => void, rootMargin = '0px') {
  const io = new IntersectionObserver(([entry]) => cb(entry.isIntersecting), { rootMargin });
  io.observe(el);
  return () => io.disconnect();
}
