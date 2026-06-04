"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

function PageSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80" />
      <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
    </div>
  );
}

const BaoCaoTongHopPage = dynamic(
  () =>
    import("@/modules/dashboard/views/bao-cao-tong-hop-page").then((m) => ({
      default: m.BaoCaoTongHopPage,
    })),
  { ssr: false, loading: () => <PageSkeleton /> },
);

export default function BaoCaoTongHopRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BaoCaoTongHopPage />
    </Suspense>
  );
}
