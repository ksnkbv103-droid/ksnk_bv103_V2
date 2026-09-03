"use client";

import React from "react";

/** Strip cửa sổ thời gian trên tab Lâm sàng — trước khi điều dưỡng điền. */
export default function NkbvClinicalWindowStrip({
  checklistLabel,
  windowKind,
  windowStart,
  windowEnd,
  classification,
  doe,
}: {
  checklistLabel: string;
  windowKind: string;
  windowStart?: string | null;
  windowEnd?: string | null;
  classification?: string | null;
  doe?: string | null;
}) {
  return (
    <div
      className="sticky top-0 z-10 rounded-[var(--radius-shell)] border border-sky-200 bg-sky-50/95 px-3 py-2 text-xs text-sky-950 shadow-sm backdrop-blur-sm"
      role="status"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{checklistLabel}</span>
        <span>
          {windowKind}
          {windowStart && windowEnd ? `: ${windowStart} → ${windowEnd}` : ": chưa đủ dữ liệu"}
        </span>
        {doe ? <span>DOE: {doe}</span> : null}
        {classification ? (
          <span className="rounded-full bg-white/80 px-2 py-0.5 font-mono bv103-type-label font-semibold text-emerald-800">
            {classification}
          </span>
        ) : null}
      </div>
      <p className="mt-0.5 text-[11px] text-sky-800/80">
        Mỗi triệu chứng dương tính phải gắn ngày thuộc cửa sổ trên. Prefill dụng cụ từ Registry khi có đăng
        ký.
      </p>
    </div>
  );
}
