"use client";

import { useCallback, useRef } from "react";

/**
 * Đồng bộ scrollTop giữa bảng chung ↔ khung phân tích (cùng trục ngày dọc).
 */
export function useSyncedVerticalScroll() {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const locking = useRef(false);

  const register = useCallback((index: number) => {
    return (el: HTMLDivElement | null) => {
      refs.current[index] = el;
    };
  }, []);

  const onScroll = useCallback((sourceIndex: number) => {
    return () => {
      if (locking.current) return;
      const source = refs.current[sourceIndex];
      if (!source) return;
      locking.current = true;
      const top = source.scrollTop;
      const left = source.scrollLeft;
      for (let i = 0; i < refs.current.length; i += 1) {
        if (i === sourceIndex) continue;
        const el = refs.current[i];
        if (!el) continue;
        if (el.scrollTop !== top) el.scrollTop = top;
        if (el.scrollLeft !== left) el.scrollLeft = left;
      }
      locking.current = false;
    };
  }, []);

  return { register, onScroll };
}
