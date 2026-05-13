"use client";

import { useEffect, useState } from "react";

/** Trả về `true` khi viewport ≥ `px` (chỉ client; SSR = `initial`). `enabled=false` → không đăng ký listener (tiết kiệm trên bảng chỉ inline). */
export function useMinWidth(px: number, initial = false, enabled = true) {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    if (!enabled) return;
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [px, enabled]);
  return enabled ? matches : false;
}
