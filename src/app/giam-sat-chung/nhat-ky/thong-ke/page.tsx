import { Suspense } from "react";
import GscAnalyticsView from "@/modules/giam-sat-chung/views/GscAnalyticsView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = { title: "Thống kê nhật ký vận hành | KSNK 103" };

export default function NhatKyAnalyticsPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscAnalyticsView initialLoaiGiamSat="NHAT_KY_VAN_HANH" />
    </Suspense>
  );
}
