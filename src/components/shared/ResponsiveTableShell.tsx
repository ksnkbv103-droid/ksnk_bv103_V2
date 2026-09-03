"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMinWidth } from "@/hooks/use-min-width";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103TableLayout } from "@/lib/bv103-table-layout";

type Props = {
  children: React.ReactNode;
  /** Nội dung thay thế bảng trên viewport &lt;640px (thẻ dọc). */
  mobileCards?: React.ReactNode;
  /** Hàng trên cùng trong khung sổ (ô tìm / quét QR). */
  toolbar?: React.ReactNode;
  scrollHint?: string;
  className?: string;
  viewportClassName?: string;
  maxHeight?: string;
  /** Bỏ khung trắng/viền khi component cha đã có panel. */
  unboxed?: boolean;
};

const shellFrame = bv103TableLayout.frame;

export default function ResponsiveTableShell({
  children,
  mobileCards,
  toolbar,
  scrollHint = "Vuốt ngang để xem thêm cột",
  className = "",
  viewportClassName = "",
  maxHeight = "max-h-none",
  unboxed = false,
}: Props) {
  const isSmUp = useMinWidth(640, false);
  const frame = unboxed ? className : `${shellFrame} ${className}`.trim();
  const toolbarBar = toolbar ? (
    <div className="border-b border-slate-200 bg-slate-50/80 px-[var(--bv103-space-3)] py-[var(--bv103-space-2)] no-print">{toolbar}</div>
  ) : null;

  if (!isSmUp && mobileCards) {
    /* Không tạo scroll container giả — để [data-bv103-app-scroll] cuộn trang (Android). */
    return (
      <div className={frame}>
        {toolbarBar}
        {mobileCards}
      </div>
    );
  }

  if (!isSmUp) {
    return (
      <div className={frame}>
        {toolbarBar}
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
        <div className={`bv103-scroll-x custom-scrollbar -mx-0.5 px-0.5 pb-1 ${viewportClassName}`}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={frame}>
      {toolbarBar}
      <div
        className={`custom-scrollbar bv103-scroll-y ${maxHeight} ${viewportClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
