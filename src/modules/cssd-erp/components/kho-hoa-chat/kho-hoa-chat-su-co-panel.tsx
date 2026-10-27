"use client";

import React from "react";
import type { SuCoChemicalRow } from "../../actions/cssd-kho-hoa-chat-su-co.actions";

type Props = {
  rows: SuCoChemicalRow[];
  canEdit: boolean;
  onXuatTuSuCo: (row: SuCoChemicalRow) => void;
};

/** Nhắc gọn một dòng; mở ra để ghi xuất theo từng sự cố. */
export default function KhoHoaChatSuCoPanel({ rows, canEdit, onXuatTuSuCo }: Props) {
  if (!rows.length) return null;
  return (
    <details className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-1.5">
      <summary className="bv103-type-label cursor-pointer font-semibold text-violet-800">
        {rows.length} sự cố hóa chất chưa ghi xuất kho
      </summary>
      <ul className="mt-1.5 space-y-1">
        {rows.slice(0, 8).map((r) => (
          <li key={r.id} className="bv103-type-label flex items-center justify-between gap-2 text-slate-700">
            <span className="min-w-0 truncate">
              {r.ma_hoa_chat} — {r.ten_hoa_chat}
              {r.ma_lo ? ` · Lô ${r.ma_lo}` : ""}
            </span>
            {canEdit ? (
              <button type="button" className="shrink-0 font-semibold text-violet-700 underline" onClick={() => onXuatTuSuCo(r)}>
                Ghi xuất
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  );
}
