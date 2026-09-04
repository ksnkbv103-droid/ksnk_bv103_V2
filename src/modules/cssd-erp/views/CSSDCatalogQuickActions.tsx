"use client";

import Link from "next/link";
import { cssdSuCoInstrumentHref } from "@/lib/cssd-routes";

export function CSSDCatalogQuickActions({
  selectedMaBo,
}: {
  selectedMaBo?: string | null;
}) {
  const suCoHref = cssdSuCoInstrumentHref({
    type: "INSTRUMENT_SET_RECONCILE",
    ma: selectedMaBo || null,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={suCoHref}
        className="text-[11px] font-semibold text-amber-800 hover:underline"
      >
        Đề nghị đổi danh mục
      </Link>
      <p className="text-[11px] text-slate-500">Cửa Đổi danh mục — đề nghị chờ duyệt (không CRUD tại RO).</p>
    </div>
  );
}
