"use client";

import React from "react";
import { FlaskConical, ArrowRight } from "lucide-react";
import type { SuCoChemicalRow } from "../../actions/cssd-kho-hoa-chat-su-co.actions";
import { CSSD_UI_ACTION_SECONDARY, CSSD_UI_SECTION_TITLE } from "../../shared/ui/cssd-ui-chrome";

type Props = {
  rows: SuCoChemicalRow[];
  canEdit: boolean;
  onXuatTuSuCo: (row: SuCoChemicalRow) => void;
};

export default function KhoHoaChatSuCoPanel({ rows, canEdit, onXuatTuSuCo }: Props) {
  if (!rows.length) return null;

  return (
    <div className="rounded-[var(--radius-shell)] border border-violet-200 bg-violet-50/60 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-violet-700" />
        <h3 className={CSSD_UI_SECTION_TITLE}>Sự cố hóa chất chưa ghi xuất kho ({rows.length})</h3>
      </div>
      <p className="mb-3 text-[11px] font-medium leading-relaxed text-violet-800">
        Các báo cáo CHEMICAL gần đây chưa có phiếu xuất/điều chỉnh liên kết. Ghi xuất để đồng bộ tồn với biên bản sự cố.
      </p>
      <div className="space-y-2">
        {rows.slice(0, 8).map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-slate-800">
                {r.ma_hoa_chat} — {r.ten_hoa_chat}
                {r.ma_lo ? <span className="ml-1 font-mono text-violet-700">· Lô {r.ma_lo}</span> : null}
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {r.incident_type_label || "Sự cố hóa chất"}
                {r.mo_ta ? ` — ${r.mo_ta}` : ""}
              </p>
            </div>
            {canEdit ? (
              <button
                type="button"
                className={`${CSSD_UI_ACTION_SECONDARY} inline-flex items-center gap-1 text-[11px]`}
                onClick={() => onXuatTuSuCo(r)}
              >
                Ghi xuất <ArrowRight className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
