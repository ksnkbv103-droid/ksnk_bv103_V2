import { Suspense } from "react";
import VSTHistoryView from "@/modules/giam-sat-vst/views/VSTHistoryView";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Lịch sử giám sát Vệ sinh tay | KSNK 103",
  description: "Tra cứu lịch sử phiên giám sát vệ sinh tay WHO",
};

export default function LichSuVstPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <VSTHistoryView />
    </Suspense>
  );
}
