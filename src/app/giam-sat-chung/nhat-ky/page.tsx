import React, { Suspense } from "react";
import GscFormView from "@/modules/giam-sat-chung/views/GscFormView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Nhật ký vận hành KSNK | KSNK 103",
  description:
    "Tab nhật ký vận hành — log số liệu thiết bị/môi trường, không tính rate, cảnh báo ngoài ngưỡng (out-of-range).",
};

export default function NhatKyVanHanhPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscFormView initialLoaiGiamSat="NHAT_KY_VAN_HANH" />
    </Suspense>
  );
}
