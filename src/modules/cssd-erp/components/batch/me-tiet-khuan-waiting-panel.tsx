"use client";

import {
  CSSD_UI_ACTION_PRIMARY,
  CSSD_UI_ACTION_SECONDARY,
  CSSD_UI_PANEL_CHROME as UI,
} from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

import React, { useState } from "react";
import { ArrowRight, List, ListChecks } from "lucide-react";
import SetMembersModal from "../inventory/SetMembersModal";
import InlineEntityQrThumb from "@/components/shared/InlineEntityQrThumb";

export type MeTkWaitingRow = {
  id: string;
  ma_vach_qr?: string;
  bo?: { ten_bo?: string | null };
  bo_dung_cu_id?: string | null;
};

/**
 * Danh sách bộ ĐÓNG GÓI chưa gán mẻ — nút Xử lý như các trạm khác (nạp ngay vào phiếu TK).
 */
export default function MeTietKhuanWaitingPanel({
  rows,
  onProcess,
  napLocked,
}: {
  rows: MeTkWaitingRow[];
  /** Nạp bộ vào mẻ đang mở (ghi DB). */
  onProcess: (code: string) => void;
  napLocked?: boolean;
}) {
  const [detailSet, setDetailSet] = useState<{ bo_dung_cu_id: string; ten_bo: string } | null>(null);

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <List className="h-5 w-5 text-[var(--primary)]" aria-hidden />
        <h3 className={UI.panelTitle}>Chờ tiệt khuẩn (Đóng gói)</h3>
      </div>
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
        {rows.map((r) => {
          const code = String(r.ma_vach_qr || "").trim();
          const tenBo = r.bo?.ten_bo || "Bộ dụng cụ";
          return (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50 p-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-2">
                {code ? <InlineEntityQrThumb code={code} size={36} /> : null}
                <div className="min-w-0">
                  <span className="block truncate font-mono text-[11px] font-medium text-[var(--primary)]">
                    {code || "—"}
                  </span>
                  <span className="block truncate text-xs font-semibold text-slate-700">{tenBo}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                <button
                  type="button"
                  disabled={!r.bo_dung_cu_id}
                  onClick={() =>
                    r.bo_dung_cu_id
                      ? setDetailSet({ bo_dung_cu_id: String(r.bo_dung_cu_id), ten_bo: tenBo })
                      : undefined
                  }
                  className={CSSD_UI_ACTION_SECONDARY}
                >
                  <ListChecks size={14} aria-hidden />
                  Chi tiết
                </button>
                <button
                  type="button"
                  disabled={Boolean(napLocked) || !code}
                  onClick={() => onProcess(code)}
                  className={CSSD_UI_ACTION_PRIMARY}
                >
                  <ArrowRight size={14} aria-hidden />
                  Xử lý
                </button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-12 text-center text-[11px] font-medium text-slate-400">
            Không có bộ chờ
          </div>
        )}
      </div>

      <SetMembersModal
        isOpen={detailSet !== null}
        onClose={() => setDetailSet(null)}
        set={detailSet}
      />
    </div>
  );
}
