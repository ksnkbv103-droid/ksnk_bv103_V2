/**
 * /giam-sat-chung/he-thong — Slice 5 (giam-sat-tuan-thu reform v4).
 *
 * Tab "Đánh giá hệ thống": thanh tra JCI/APSIC dùng nội bộ. Bảng kiểm có
 * `loai_giam_sat='DANH_GIA_HE_THONG'` — thường gắn với SOP/policy review,
 * không xuất kết quả công khai.
 */

import React, { Suspense } from "react";
import GiamSatChungPage from "@/modules/giam-sat-chung/views/GiamSatChungPage";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Đánh giá Hệ thống KSNK | KSNK 103",
  description:
    "Tab đánh giá hệ thống nội bộ — thanh tra JCI/APSIC, review SOP/policy.",
};

export default function DanhGiaHeThongPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GiamSatChungPage initialLoaiGiamSat="DANH_GIA_HE_THONG" />
    </Suspense>
  );
}
