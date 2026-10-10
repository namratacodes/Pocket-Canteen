import { useEffect, useRef } from 'react';

/** Calls onVisible when the returned element scrolls near the viewport. */
export function useSentinel(onVisible: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const cb = useRef(onVisible);
  cb.current = onVisible;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) cb.current(); }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return ref;
}