"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const QuanLyCongViecPage = dynamic(
  () => import("@/modules/quan-ly-cong-viec/views/QuanLyCongViecPage"),
  { ssr: false, loading: () => <SupervisionPageSkeleton /> },
);

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <QuanLyCongViecPage />
    </Suspense>
  );
}
