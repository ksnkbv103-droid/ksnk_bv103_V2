import { Suspense } from "react";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import LichSuGscClient from "./LichSuGscClient";

export const metadata = {
  title: "Lịch sử giám sát",
  description: "Tra cứu lịch sử phiên giám sát tuân thủ KSNK",
};

export default function LichSuGscPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <LichSuGscClient />
    </Suspense>
  );
}
