"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const AdminNganHangPage = dynamic(
  () => import("@/modules/dao-tao/views/AdminNganHangPage"),
  { ssr: false, loading: () => <SupervisionPageSkeleton /> },
);

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <AdminNganHangPage />
    </Suspense>
  );
}
