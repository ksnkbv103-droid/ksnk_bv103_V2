"use client";

import dynamic from "next/dynamic";

function PageSkeleton() {
  return (
    <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
    </div>
  );
}

/** Route shell light — chemical inventory lazy (W5 / Perf P1). */
const CSSDChemicalInventoryPage = dynamic(
  () =>
    import("@/modules/cssd-erp/contexts/inventory-chemical/entrypoint").then((m) => ({
      default: m.CSSDChemicalInventoryPage,
    })),
  { ssr: false, loading: () => <PageSkeleton /> },
);

export default function CssdHoaChatClient() {
  return <CSSDChemicalInventoryPage />;
}
