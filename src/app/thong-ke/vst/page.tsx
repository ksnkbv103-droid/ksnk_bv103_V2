"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const VSTAnalyticsView = dynamic(
  () => import("@/modules/giam-sat-vst/views/VSTAnalyticsView"),
  { ssr: false, loading: () => <SupervisionPageSkeleton /> },
);

export default function ThongKeVstPage() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <VSTAnalyticsView />
    </Suspense>
  );
}
