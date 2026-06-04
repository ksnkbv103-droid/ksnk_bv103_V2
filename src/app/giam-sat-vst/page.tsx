import { Suspense } from "react";
import VSTPage from "@/modules/giam-sat-vst/views/VSTPage";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

export default function GiamSatVstPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <VSTPage />
    </Suspense>
  );
}
