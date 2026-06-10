import { Suspense } from "react";
import GiamSatHubPage from "@/modules/giam-sat-hub/views/GiamSatHubPage";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export const metadata = {
  title: "Trung tâm giám sát | KSNK 103",
  description: "Cổng vào nhập liệu và tra cứu giám sát VST, GSC, NKBV",
};

export default function GiamSatHubRoute() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GiamSatHubPage />
    </Suspense>
  );
}
