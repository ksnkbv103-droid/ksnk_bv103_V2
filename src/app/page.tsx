"use client";

import dynamic from "next/dynamic";

function DashboardRouteSkeleton() {
  return (
    <div className="flex h-[45vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#026f17] border-t-transparent" />
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
