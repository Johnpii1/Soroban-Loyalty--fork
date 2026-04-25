import { useEffect, useRef, useState } from "react";

const prefersReducedMotion =
  typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

export function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    if (prefersReducedMotion || prev.current === target) {
      prev.current = target;
      setValue(target);
      return;
    }
    const start = prev.current;
    const diff = target - start;
    const startTime = performance.now();

    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
