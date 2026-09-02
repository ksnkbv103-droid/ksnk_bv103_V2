"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { cssdSuCoInstrumentHref } from "@/lib/cssd-routes";
import type { CSSDChiTiet } from "../types/catalog.types";
import { CSSD_UI_ACTION_SECONDARY, CSSD_UI_SECTION_TITLE } from "../shared/ui/cssd-ui-chrome";

const MDM_DUNG_CU_HREF = "/quan-tri-he-thong/danh-muc/dung-cu";

export function CSSDCatalogQuickActions(props: {
  selectedBoId: string | null;
  selectedChiTiet: CSSDChiTiet | null;
  selectedMaBo?: string | null;
  reload: () => Promise<void>;
}) {
  const { selectedChiTiet, selectedMaBo } = props;
  const suCoHref = cssdSuCoInstrumentHref({
    type: "INSTRUMENT_BROKEN",
    ma: selectedMaBo || null,
    loai: selectedChiTiet?.loai_dung_cu_id || null,
    chiTiet: selectedChiTiet?.id || null,
  });

  return (
    <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4">
      <h4 className={CSSD_UI_SECTION_TITLE}>Tác vụ vận hành</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={MDM_DUNG_CU_HREF}
          className={`${CSSD_UI_ACTION_SECONDARY} gap-1.5 px-3`}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Sửa danh mục (Quản trị)
        </Link>
        <Link
          href={suCoHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold uppercase text-amber-900 hover:bg-amber-100"
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Báo cáo sự cố dụng cụ
        </Link>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Báo Hỏng / Mất / Lấy-trả kho / Điều chuyển bộ → bộ tại trang Báo cáo sự cố hoặc lối tắt tại trạm Đóng gói. Thêm dòng định mức và sửa loại: Quản trị.
      </p>
    </section>
  );
}
