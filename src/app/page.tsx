"use client";

import dynamic from "next/dynamic";

function DashboardRouteSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
      <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100/80" />
      <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
    </div>
  );
}

/** Tách chunk + tắt SSR: giảm JS ban đầu của route `/` và tránh hydrate Recharts nặng trên server. */
const CommandCenterDashboardPage = dynamic(
  () =>
    import("@/modules/dashboard/views/command-center-dashboard-page").then((m) => ({
      default: m.CommandCenterDashboardPage,
    })),
  { ssr: false, loading: () => <DashboardRouteSkeleton /> },
);

export default function HomePage() {
  return <CommandCenterDashboardPage />;
}
