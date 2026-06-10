import React, { Suspense } from "react";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Đánh giá Hệ thống KSNK | KSNK 103",
  description:
    "Tab đánh giá hệ thống nội bộ — thanh tra JCI/APSIC, review SOP/policy.",
};

export default function DanhGiaHeThongPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscFormView initialLoaiGiamSat="DANH_GIA_HE_THONG" />
    </Suspense>
  );
}
