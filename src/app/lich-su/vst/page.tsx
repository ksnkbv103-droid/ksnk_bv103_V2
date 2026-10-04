import { Suspense } from "react";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import LichSuVstClient from "./LichSuVstClient";

export const metadata = {
  title: "Lịch sử giám sát Vệ sinh tay | KSNK 103",
  description: "Tra cứu lịch sử phiên giám sát vệ sinh tay WHO",
};

export default function LichSuVstPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <LichSuVstClient />
    </Suspense>
  );
}
