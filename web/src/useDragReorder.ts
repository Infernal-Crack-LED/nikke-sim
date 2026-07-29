import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// pointer-based drag-to-reorder that works for both mouse and touch. items
// register their DOM node by index; the drag element (a handle, or the item
// itself) gets handleProps. A press that moves past a small threshold becomes a
// drag (live-reordering via onMove by nearest item centre); a press that never
// crosses it is treated as a tap (onTap) — lets one chip both expand and drag.
// Shared by every slot surface: the Team Sim cards + compact strip, the Team
// Builder strip and 5×5, and both Browse Nikkes modals.
//
// opts.ignoreFrom: a selector for sub-elements that must keep their own click
// behaviour (e.g. the × remove chip). Presses starting there skip drag
// tracking entirely — otherwise the pointer capture set on the item would
// retarget the follow-up click onto the item and swallow the sub-element's
// onClick.
//
// opts.commitOnDrop: nothing is displaced while dragging — the grid stays put
// and `overIndex` tracks the slot the item would land on (render it as a drop
// indicator). The move is committed with a single onMove only on release, at
// the final drop point. Without it, onMove fires live as the pointer crosses
// items (the classic make-room reorder).
export function useDragReorder(
  onMove: (from: number, to: number) => void,
  onTap?: (i: number) => void,
  opts?: { ignoreFrom?: string; commitOnDrop?: boolean }
) {
  const items = useRef(new Map<number, HTMLElement>());
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    index: number;
    moved: boolean;
  } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // commitOnDrop only: the slot the dragged item would land on if released now
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const register = (i: number) => (el: HTMLElement | null) => {
    if (el) {
      items.current.set(i, el);
    } else {
      items.current.delete(i);
    }
  };

  // index of the item whose centre is nearest the pointer (2D, so it works for
  // a horizontal strip, a single row, or a wrapped grid alike)
  const nearest = (x: number, y: number): number => {
    let best = -1;
    let bestDist = Infinity;
    items.current.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - x;
      const dy = r.top + r.height / 2 - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    });
    return best;
  };

  // onItemTap overrides the shared onTap for this initiator (e.g. a card's image
  // focuses that card's picker on tap, but reorders on drag)
  const handleProps = (
    i: number,
    onItemTap?: (i: number, e: ReactPointerEvent) => void
  ) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button && e.button !== 0) {
        return;
      }
      if (
        opts?.ignoreFrom &&
        (e.target as HTMLElement).closest(opts.ignoreFrom)
      ) {
        return;
      }
      drag.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        index: i,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const st = drag.current;
      if (!st || e.pointerId !== st.pointerId) {
        return;
      }
      if (!st.moved) {
        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        if (dx * dx + dy * dy < 36) {
          return;
        } // ~6px threshold before it's a drag
        st.moved = true;
        setDragIndex(st.index);
      }
      const target = nearest(e.clientX, e.clientY);
      if (opts?.commitOnDrop) {
        // no live reorder — just track where the item would land
        setOverIndex(target >= 0 && target !== st.index ? target : null);
        return;
      }
      if (target >= 0 && target !== st.index) {
        onMove(st.index, target);
        st.index = target;
        setDragIndex(target);
      }
    },
    onPointerUp: (e: ReactPointerEvent) => {
      const st = drag.current;
      if (!st || e.pointerId !== st.pointerId) {
        return;
      }
      if (!st.moved) {
        if (onItemTap) {
          onItemTap(st.index, e);
        } else if (onTap) {
          onTap(st.index);
        }
      } else if (opts?.commitOnDrop) {
        // displace only at the final drop point
        const target = nearest(e.clientX, e.clientY);
        if (target >= 0 && target !== st.index) {
          onMove(st.index, target);
        }
      }
      drag.current = null;
      setDragIndex(null);
      setOverIndex(null);
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragIndex(null);
      setOverIndex(null);
    },
  });

  return { register, handleProps, dragIndex, overIndex };
}

// Drag an EXTERNAL item (e.g. a roster-grid card, identified by a payload
// value rather than a registered index) onto one of N registered drop targets
// — the counterpart to useDragReorder above, for a source that isn't itself
// one of the registered items. overIndex tracks the slot the payload would
// land on if released now (render it with the same `.droptarget` class
// useDragReorder's commitOnDrop mode uses); the drop commits via
// onDrop(payload, index) on release. A press that never crosses the drag
// threshold calls onTap(payload) instead, so a plain click/tap keeps its usual
// meaning (e.g. "add to the next open slot").
export function useDropTarget<T>(
  onDrop: (payload: T, index: number) => void,
  onTap?: (payload: T) => void
) {
  const items = useRef(new Map<number, HTMLElement>());
  const drag = useRef<{
    pointerId: number;
    payload: T;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [dragPayload, setDragPayload] = useState<T | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const register = (i: number) => (el: HTMLElement | null) => {
    if (el) {
      items.current.set(i, el);
    } else {
      items.current.delete(i);
    }
  };

  const nearest = (x: number, y: number): number => {
    let best = -1;
    let bestDist = Infinity;
    items.current.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - x;
      const dy = r.top + r.height / 2 - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    });
    return best;
  };

  const dragProps = (payload: T) => ({
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button && e.button !== 0) {
        return;
      }
      drag.current = {
        pointerId: e.pointerId,
        payload,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const st = drag.current;
      if (!st || e.pointerId !== st.pointerId) {
        return;
      }
      if (!st.moved) {
        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        if (dx * dx + dy * dy < 36) {
          return;
        } // ~6px threshold before it's a drag
        st.moved = true;
        setDragPayload(payload);
      }
      const target = nearest(e.clientX, e.clientY);
      setOverIndex(target >= 0 ? target : null);
    },
    onPointerUp: (e: ReactPointerEvent) => {
      const st = drag.current;
      if (!st || e.pointerId !== st.pointerId) {
        return;
      }
      if (!st.moved) {
        onTap?.(st.payload);
      } else {
        const target = nearest(e.clientX, e.clientY);
        if (target >= 0) {
          onDrop(st.payload, target);
        }
      }
      drag.current = null;
      setDragPayload(null);
      setOverIndex(null);
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragPayload(null);
      setOverIndex(null);
    },
  });

  return { register, dragProps, dragPayload, overIndex };
}
