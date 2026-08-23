"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cssdSuCoInstrumentHref } from "@/lib/cssd-routes";
import type { CSSDChiTiet } from "../types/catalog.types";

export function CSSDCatalogQuickActions({
  selectedChiTiet,
  selectedMaBo,
}: {
  selectedChiTiet: CSSDChiTiet | null;
  selectedMaBo?: string | null;
}) {
  const suCoHref = cssdSuCoInstrumentHref({
    type: "INSTRUMENT_BROKEN",
    ma: selectedMaBo || null,
    loai: selectedChiTiet?.loai_dung_cu_id || null,
    chiTiet: selectedChiTiet?.id || null,
  });

  return (
    <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={suCoHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold uppercase text-amber-900 hover:bg-amber-100"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Báo sự cố bộ này
        </Link>
        <p className="text-[11px] text-slate-500">
          Hỏng / Mất / Bổ sung cũng làm được ngay tại Đóng gói.
        </p>
      </div>
    </section>
  );
}
