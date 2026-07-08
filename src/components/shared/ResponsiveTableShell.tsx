"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMinWidth } from "@/hooks/use-min-width";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type Props = {
  children: React.ReactNode;
  /** Nội dung thay thế bảng trên viewport &lt;640px (thẻ dọc). */
  mobileCards?: React.ReactNode;
  scrollHint?: string;
  className?: string;
  viewportClassName?: string;
  maxHeight?: string;
  /** Bỏ khung trắng/viền khi component cha đã có panel. */
  unboxed?: boolean;
};

const shellFrame =
  "overflow-hidden rounded-[var(--radius-table)] bg-white ring-1 ring-slate-200/90";

export default function ResponsiveTableShell({
  children,
  mobileCards,
  scrollHint = "Vuốt ngang để xem thêm cột",
  className = "",
  viewportClassName = "",
  maxHeight = "max-h-[min(68dvh,640px)]",
  unboxed = false,
}: Props) {
  const isSmUp = useMinWidth(640, false);
  const frame = unboxed ? className : `${shellFrame} ${className}`.trim();

  if (!isSmUp && mobileCards) {
    return (
      <div className={frame}>
        <div className={`custom-scrollbar ${maxHeight} overflow-y-auto overscroll-contain touch-manipulation`}>
          {mobileCards}
        </div>
      </div>
    );
  }

  return (
    <div className={frame}>
      {!isSmUp ? (
        <p
          className={`border-b border-slate-100 px-3 py-2 ${bv103LayoutChrome.labelBlockInline} text-slate-500`}
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-1">
            <ChevronLeft size={12} aria-hidden />
            {scrollHint}
            <ChevronRight size={12} aria-hidden />
          </span>
        </p>
      ) : null}
      <div
        className={`custom-scrollbar ${maxHeight} overflow-auto overscroll-contain touch-manipulation ${viewportClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
