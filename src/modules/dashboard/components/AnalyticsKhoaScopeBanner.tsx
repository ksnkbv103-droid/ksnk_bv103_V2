"use client";

import { Building2 } from "lucide-react";

export function AnalyticsKhoaScopeBanner({ khoaLabel }: { khoaLabel: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
      <Building2 size={16} className="mt-0.5 shrink-0 text-sky-600" aria-hidden />
      <p>
        <span className="font-semibold">Phạm vi khoa của tôi:</span> {khoaLabel}. Bộ lọc khoa đã khóa — số liệu
        khớp quyền mạng lưới KSNK tại khoa.
      </p>
    </div>
  );
}
