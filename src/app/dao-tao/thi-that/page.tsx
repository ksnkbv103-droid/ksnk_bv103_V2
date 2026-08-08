"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const ThiThatPage = dynamic(() => import("@/modules/dao-tao/views/ThiThatPage"), {
  ssr: false,
  loading: () => <SupervisionPageSkeleton />,
});

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <ThiThatPage />
    </Suspense>
  );
}
