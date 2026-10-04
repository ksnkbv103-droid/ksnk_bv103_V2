import { Suspense } from "react";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import LichSuVstClient from "./LichSuVstClient";

export const metadata = {
  title: "Lịch sử giám sát",
  description: "Tra cứu lịch sử phiên giám sát vệ sinh tay WHO",
};

export default function LichSuVstPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <LichSuVstClient />
    </Suspense>
  );
}
