"use client";

import Link from "next/link";
import { formatLoaiCongViecLabel } from "../lib/qlcv-labels";

type Props = {
  loaiCongViec?: string | null;
  dinhKyMauId?: string | null;
  className?: string;
};

/** Chip loại + link sang tab mẫu khi phiếu sinh từ định kỳ. */
export function QlcvDinhKyMauChip({ loaiCongViec, dinhKyMauId, className }: Props) {
  const loai = String(loaiCongViec || "").toUpperCase();
  const label = formatLoaiCongViecLabel(loai);

  if (loai === "DINH_KY" && dinhKyMauId) {
    return (
      <span className={className}>
        <Link
          href={`/quan-ly-cong-viec?tab=DINH_KY&mau=${encodeURIComponent(dinhKyMauId)}`}
          className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
          onClick={(e) => e.stopPropagation()}
        >
          Định kỳ · từ mẫu
        </Link>
      </span>
    );
  }

  if (loai === "DINH_KY") {
    return (
      <span
        className={`inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ${className || ""}`}
      >
        Định kỳ
      </span>
    );
  }

  if (loai === "KHAN_CAP") {
    return (
      <span
        className={`inline-flex rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-800 ${className || ""}`}
      >
        {label}
      </span>
    );
  }

  return <span className={`text-[11px] text-slate-500 ${className || ""}`}>{label}</span>;
}
