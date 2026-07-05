"use client";

import { BarChart2, Eye, Globe2 } from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { MobileCollapsibleNotice } from "@/components/shared/MobileCollapsibleNotice";

type Props = {
  khoaFilterLocked: boolean;
  lockedKhoaLabel?: string | null;
};

const bannerBase = "rounded-xl border px-3 py-2 sm:px-4 sm:py-3";

/** Banner phạm vi trên màn Thống kê VST/GSC — khách vs mạng lưới vs khóa khoa. */
export function AnalyticsThongKeScopeBanner({ khoaFilterLocked, lockedKhoaLabel }: Props) {
  const { isGuestStatsOnly, isMangLuoi, loading } = usePermission(undefined, "view");

  if (loading) return null;

  if (isGuestStatsOnly) {
    return (
      <MobileCollapsibleNotice
        className={`${bannerBase} border-violet-200 bg-violet-50/80 text-violet-900`}
        icon={<Eye size={16} className="mt-0.5 shrink-0 text-violet-600" aria-hidden />}
        summary={
          <span>
            <span className="font-semibold">Chế độ khách:</span> chỉ xem thống kê.
          </span>
        }
        detail={
          <>
            Bạn có thể dùng bộ lọc để so sánh các khoa; không thể thêm, sửa hoặc xóa phiên giám sát.
          </>
        }
      />
    );
  }

  if (isMangLuoi && !khoaFilterLocked) {
    return (
      <MobileCollapsibleNotice
        className={`${bannerBase} border-emerald-200 bg-emerald-50/80 text-emerald-900`}
        icon={<Globe2 size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />}
        summary={
          <span>
            <span className="font-semibold">So sánh toàn viện:</span> bộ lọc khoa mở.
          </span>
        }
        detail={
          <>
            Xem thống kê các khoa. Nhập liệu và lịch sử phiên vẫn chỉ tại khoa bạn được phân công.
          </>
        }
      />
    );
  }

  if (khoaFilterLocked && lockedKhoaLabel) {
    return (
      <MobileCollapsibleNotice
        className={`${bannerBase} border-sky-200 bg-sky-50/80 text-sky-900`}
        icon={<BarChart2 size={16} className="mt-0.5 shrink-0 text-sky-600" aria-hidden />}
        summary={
          <span>
            <span className="font-semibold">Phạm vi khoa:</span> {lockedKhoaLabel}
          </span>
        }
        detail="Bộ lọc khoa đã khóa theo quyền của bạn."
      />
    );
  }

  return null;
}
