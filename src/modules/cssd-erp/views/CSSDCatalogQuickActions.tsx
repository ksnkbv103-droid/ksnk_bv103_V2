"use client";

import Link from "next/link";
import { cssdCatalogEditProposalHref } from "@/lib/cssd-routes";

export function CSSDCatalogQuickActions({
  selectedMaBo,
}: {
  selectedMaBo?: string | null;
}) {
  const href = cssdCatalogEditProposalHref({
    kind: "BOM",
    ma: selectedMaBo || null,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href} className="text-[11px] font-semibold text-amber-800 hover:underline">
        Đề nghị sửa danh mục
      </Link>
      <p className="text-[11px] text-slate-500">
        Dialog đề nghị trên danh mục — không qua sự cố.
      </p>
    </div>
  );
}
