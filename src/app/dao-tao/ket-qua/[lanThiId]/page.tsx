"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const KetQuaPage = dynamic(() => import("@/modules/dao-tao/views/KetQuaPage"), {
  ssr: false,
  loading: () => <SupervisionPageSkeleton />,
});

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <KetQuaPage />
    </Suspense>
  );
}
