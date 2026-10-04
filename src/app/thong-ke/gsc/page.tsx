import { Suspense } from "react";
import GscAnalyticsView from "@/modules/giam-sat-chung/views/GscAnalyticsView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Thống kê khoa",
  description: "Dashboard phân tích giám sát tuân thủ",
};

export default function ThongKeGscPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscAnalyticsView />
    </Suspense>
  );
}
