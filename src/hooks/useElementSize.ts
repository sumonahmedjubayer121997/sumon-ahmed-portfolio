import { useEffect, useState, type RefObject } from 'react';

/** Element content-box size via ResizeObserver. */
export function useElementSize(ref: RefObject<HTMLElement | null>, initial = { width: 0, height: 0 }) {
  const [size, setSize] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (Math.abs(s.width - width) < 1 && Math.abs(s.height - height) < 1 ? s : { width, height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
