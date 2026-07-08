"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";

const GiamSatNkbvPage = dynamic(
  () => import("@/modules/giam-sat-nkbv/views/GiamSatNkbvPage"),
  { ssr: false, loading: () => <SupervisionPageSkeleton /> },
);

export default function Page() {
  return (
    <Suspense fallback={<SupervisionPageSkeleton />}>
      <GiamSatNkbvPage />
    </Suspense>
  );
}
