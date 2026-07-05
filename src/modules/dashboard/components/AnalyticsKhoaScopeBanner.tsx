"use client";

import { Building2 } from "lucide-react";
import { MobileCollapsibleNotice } from "@/components/shared/MobileCollapsibleNotice";

export function AnalyticsKhoaScopeBanner({ khoaLabel }: { khoaLabel: string }) {
  return (
    <MobileCollapsibleNotice
      className="rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-sky-900 sm:px-4 sm:py-3"
      icon={<Building2 size={16} className="mt-0.5 shrink-0 text-sky-600" aria-hidden />}
      summary={
        <span>
          <span className="font-semibold">Phạm vi khoa:</span> {khoaLabel}
        </span>
      }
      detail="Bộ lọc khoa đã khóa — số liệu khớp quyền mạng lưới KSNK tại khoa."
    />
  );
}
