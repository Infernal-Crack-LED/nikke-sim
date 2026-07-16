// A `.pills` group that lays its buttons out in a content-aware grid, wrapping
// into evenly-sized rows instead of a greedy last-row remainder.
import { Children, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Balanced-wrap column count for a set of `count` inline items in a grid: one row
// if they fit, otherwise the fewest EVEN rows (4→2:2 not 3:1, 6→3:3, 7→4:3). Width-
// aware via ResizeObserver; measures each item's natural (content) width.
function useBalancedCols(count: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(count);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const items = Array.from(el.children) as HTMLElement[];
      if (items.length < 2) return setCols(Math.max(1, items.length));
      const cs = getComputedStyle(el);
      const gap = parseFloat(cs.columnGap || '0') || 0;
      const W = el.clientWidth;
      const widths = items.map((c) => c.scrollWidth); // content widths (justify-items: start)
      const total = widths.reduce((s, w) => s + w, 0) + gap * (count - 1);
      if (total <= W) return setCols(count); // they all fit on one row — keep it
      // else split into the fewest rows that fit (by the widest item), evened out
      const perRow = Math.max(1, Math.floor((W + gap) / (Math.max(...widths) + gap)));
      const rows = Math.ceil(count / perRow);
      setCols(Math.max(1, Math.ceil(count / rows)));
    };
    compute();
    if (typeof ResizeObserver === 'undefined') return; // jsdom / SSR: no reflow
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);
  return { ref, cols };
}

export function PillGrid({ className, children }: { className?: string; children: ReactNode }) {
  const { ref, cols } = useBalancedCols(Children.count(children));
  return (
    <div
      ref={ref}
      className={`pills pill-grid${className ? ` ${className}` : ''}`}
      style={{ ['--pcols' as string]: cols }}
    >
      {children}
    </div>
  );
}
