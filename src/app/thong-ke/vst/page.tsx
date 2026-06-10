import { Suspense } from "react";
import VSTAnalyticsView from "@/modules/giam-sat-vst/views/VSTAnalyticsView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Thống kê Vệ sinh tay | KSNK 103",
  description: "Dashboard phân tích giám sát vệ sinh tay",
};

export default function ThongKeVstPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <VSTAnalyticsView />
    </Suspense>
  );
}
