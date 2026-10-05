"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

function PageSkeleton() {
  return (
    <div className="w-full bv103-stack-page">
      <div className="h-24 animate-pulse rounded-[var(--radius-shell)] border border-slate-200 bg-slate-100/80" />
      <div className="h-64 animate-pulse rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50" />
    </div>
  );
}

// Bỏ ssr:false — shell RSC + dynamic vẫn code-split charts (PERF2-chunks).
const BaoCaoTongHopPage = dynamic(
  () =>
    import("@/modules/dashboard/views/bao-cao-tong-hop-page").then((m) => ({
      default: m.BaoCaoTongHopPage,
    })),
  { loading: () => <PageSkeleton /> },
);

export default function BaoCaoTongHopRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BaoCaoTongHopPage />
    </Suspense>
  );
}
