import { Suspense } from "react";
import GscAnalyticsView from "@/modules/giam-sat-chung/views/GscAnalyticsView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = { title: "Thống kê đánh giá hệ thống | KSNK 103" };

export default function HeThongAnalyticsPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscAnalyticsView initialLoaiGiamSat="DANH_GIA_HE_THONG" />
    </Suspense>
  );
}
