/**
 * /giam-sat-chung/nhat-ky — Slice 5 (giam-sat-tuan-thu reform v4).
 *
 * Tab "Nhật ký vận hành": NVYT khoa CSSD/ICU/Lab tự log số liệu (nhiệt độ lò
 * TK, áp suất AIIR, MEC tủ ATSH, pH/độ dẫn nước RO). Bảng kiểm có
 * `loai_giam_sat='NHAT_KY_VAN_HANH'` + `cach_tinh_diem='NHAT_KY'` — KHÔNG
 * tính rate, chỉ ghi & cảnh báo OOR.
 */

import React, { Suspense } from "react";
import GiamSatChungPage from "@/modules/giam-sat-chung/views/GiamSatChungPage";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Nhật ký vận hành KSNK | KSNK 103",
  description:
    "Tab nhật ký vận hành — log số liệu thiết bị/môi trường, không tính rate, cảnh báo ngoài ngưỡng (out-of-range).",
};

export default function NhatKyVanHanhPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GiamSatChungPage initialLoaiGiamSat="NHAT_KY_VAN_HANH" />
    </Suspense>
  );
}
