"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const DaoTaoHubPage = dynamic(() => import("@/modules/dao-tao/views/DaoTaoHubPage"), {
  ssr: false,
  loading: () => <SupervisionPageSkeleton />,
});

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <DaoTaoHubPage />
    </Suspense>
  );
}
