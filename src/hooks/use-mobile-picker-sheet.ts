"use client";

import { useEffect, useState } from "react";

/**
 * true khi viewport hẹp — SearchableSelect / SearchableMultiSelect dùng modal căn giữa
 * thay vì dropdown gắn field (điện thoại + máy tính bảng; mặc định ≤1023px).
 */
export function useMobilePickerSheet(breakpointPx = 1023) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const fn = () => setIsMobile(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [breakpointPx]);
  return isMobile;
}
