"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const AdminMucDoPage = dynamic(() => import("@/modules/dao-tao/views/AdminMucDoPage"), {
  ssr: false,
  loading: () => <SupervisionPageSkeleton />,
});

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <AdminMucDoPage />
    </Suspense>
  );
}
