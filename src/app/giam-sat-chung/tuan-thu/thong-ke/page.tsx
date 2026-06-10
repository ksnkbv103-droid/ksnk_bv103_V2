import { Suspense } from "react";
import GscAnalyticsView from "@/modules/giam-sat-chung/views/GscAnalyticsView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = { title: "Thống kê giám sát tuân thủ | KSNK 103" };

export default function TuanThuAnalyticsPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscAnalyticsView initialLoaiGiamSat="TUAN_THU" />
    </Suspense>
  );
}
