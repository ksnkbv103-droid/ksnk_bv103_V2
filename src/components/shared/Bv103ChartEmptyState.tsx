"use client";

import React from "react";
import { BarChart3 } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
  className?: string;
};

/** Trạng thái trống thân thiện cho biểu đồ / widget dashboard. */
export default function Bv103ChartEmptyState({
  title = "Chưa có số liệu trong khoảng đã chọn",
  description = "Thử đổi khoảng ngày, chuyên đề hoặc bộ lọc nâng cao rồi bấm Cập nhật.",
  className = "",
}: Props) {
  return (
    <div
      className={`flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center ${className}`}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <BarChart3 className="h-6 w-6 text-slate-400" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}
