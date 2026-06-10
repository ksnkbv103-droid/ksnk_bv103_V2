import { Suspense } from "react";
import GscHistoryView from "@/modules/giam-sat-chung/views/GscHistoryView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Lịch sử giám sát tổng hợp | KSNK 103",
  description: "Tra cứu lịch sử phiên giám sát tuân thủ KSNK",
};

export default function LichSuGscPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GscHistoryView />
    </Suspense>
  );
}
