"use client";

import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

import React from "react";
import type { FactBaoTriRow } from "../../actions/cssd-bao-tri.types";

type Props = {
  rows: FactBaoTriRow[];
  ketQuaById: Record<string, string>;
  onKetQuaChange: (id: string, v: string) => void;
  onKetThuc: (id: string) => void;
  onHuy: (id: string) => void;
};

export default function BaoTriActivePanel({ rows, ketQuaById, onKetQuaChange, onKetThuc, onHuy }: Props) {
  const active = rows.filter((x) => x.trang_thai === "DANG_THUC_HIEN");
  return (
    <div className={`${UI.sectionGap} space-y-4 rounded-2xl border border-amber-100 bg-amber-50/40 p-4 text-sm text-slate-700`}>
      <p className="font-semibold text-slate-800">Phiếu đang thực hiện — nhập kết quả và hoàn thành</p>
      <div className="grid gap-3 md:grid-cols-1">
        {active.map((x) => (
          <div key={x.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 md:flex-row md:items-end">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium text-slate-400">{x.ma_phieu}</div>
              <div className="truncate text-sm font-semibold">{x.ten_thiet_bi || x.thiet_bi_id}</div>
            </div>
            <textarea
              className="min-h-[72px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"
              placeholder="Kết quả kiểm định / biên bản bàn giao..."
              value={ketQuaById[x.id] ?? ""}
              onChange={(e) => onKetQuaChange(x.id, e.target.value)}
            />
            <div className="flex shrink-0 gap-2">
              <button type="button" className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#FFD700]" onClick={() => void onKetThuc(x.id)}>
                Hoàn thành
              </button>
              <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-[11px] font-medium text-slate-500" onClick={() => void onHuy(x.id)}>
                Hủy
              </button>
            </div>
          </div>
        ))}
      </div>
      {active.length === 0 ? <p className="text-xs text-slate-500">Không có phiếu đang mở.</p> : null}
    </div>
  );
}
