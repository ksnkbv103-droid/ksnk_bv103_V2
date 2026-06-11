"use client";

import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

import React from "react";
import { List } from "lucide-react";

export type MeTkWaitingRow = { id: string; ma_vach_qr?: string; bo?: { ten_bo?: string | null } };

/** Danh sách bộ đang ĐÓNG GÓI, chưa gán mẻ — tương tự “chờ tại trạm” trước khi vào phiếu TK. */
export default function MeTietKhuanWaitingPanel({
  rows,
  onPickCode,
}: {
  rows: MeTkWaitingRow[];
  onPickCode: (code: string) => void;
}) {
  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <List className="h-5 w-5 text-[var(--primary)]" aria-hidden />
        <h3 className={UI.panelTitle}>Chờ tiệt khuẩn (Đóng gói)</h3>
      </div>
      <p className="mb-3 text-[11px] font-medium uppercase leading-relaxed text-slate-500">
        Các bộ đã đóng gói, chưa gán mẻ — có thể bấm dòng để đưa mã vào ô quét hoặc quét QR trực tiếp.
      </p>
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onPickCode(String(r.ma_vach_qr || "").trim())}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
          >
            <span className="block truncate font-mono text-[11px] font-medium text-[var(--primary)]">{r.ma_vach_qr || "—"}</span>
            <span className="block truncate text-xs font-bold text-slate-700">{r.bo?.ten_bo || "Bộ dụng cụ"}</span>
          </button>
        ))}
        {rows.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-12 text-center text-[11px] font-mediumst text-slate-400">
            Không có bộ chờ
          </div>
        )}
      </div>
    </div>
  );
}
