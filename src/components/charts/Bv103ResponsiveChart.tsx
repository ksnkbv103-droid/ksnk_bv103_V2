"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

/**
 * Tránh cảnh báo Recharts "width(-1) and height(-1)..." khi parent chưa có kích thước thật
 * (flex/grid, tab, animation). Chỉ mount ResponsiveContainer sau khi đo ≥ 2px.
 */
export function Bv103ResponsiveChart({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactElement;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(0, Math.round(r.width));
      const h = Math.max(0, Math.round(r.height));
      if (w < 2 || h < 2) {
        setDims(null);
        return;
      }
      setDims((prev) => (prev?.w === w && prev?.h === h ? prev : { w, h }));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={className} style={style}>
      {dims ? (
        <ResponsiveContainer width={dims.w} height={dims.h} minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
