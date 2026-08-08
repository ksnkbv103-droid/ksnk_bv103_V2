"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const AdminKetQuaPage = dynamic(() => import("@/modules/dao-tao/views/AdminKetQuaPage"), {
  ssr: false,
  loading: () => <SupervisionPageSkeleton />,
});

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <AdminKetQuaPage />
    </Suspense>
  );
}
