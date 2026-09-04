"use client";

import React from "react";
import type { CssdPmChecklistItem } from "@/lib/domain/cssd-equipment-pm-checklist";
import type { FactBaoTriRow } from "../../actions/cssd-bao-tri.types";
import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

type Props = {
  rows: FactBaoTriRow[];
  ketQuaById: Record<string, string>;
  checklistById: Record<string, CssdPmChecklistItem[]>;
  onKetQuaChange: (id: string, v: string) => void;
  onChecklistChange: (id: string, items: CssdPmChecklistItem[]) => void;
  onKetThuc: (id: string) => void;
  onHuy: (id: string) => void;
};

function loaiPhieuLabel(loai: string) {
  return loai === "SUA_CHUA" ? "Sửa chữa" : "Bảo dưỡng định kỳ";
}

export default function BaoTriActivePanel({
  rows,
  ketQuaById,
  checklistById,
  onKetQuaChange,
  onChecklistChange,
  onKetThuc,
  onHuy,
}: Props) {
  const active = rows.filter((x) => x.trang_thai === "DANG_THUC_HIEN");
  return (
    <div className={`${UI.sectionGap} space-y-[var(--bv103-space-3)] rounded-[var(--radius-shell)] border border-amber-100 bg-amber-50/40 p-4 text-sm text-slate-700`}>
      <p className="font-semibold text-slate-800">Phiếu đang thực hiện — checklist + biên bản</p>
      <div className="grid gap-3 md:grid-cols-1">
        {active.map((x) => {
          const checklist = checklistById[x.id] ?? x.checklist_jsonb ?? [];
          return (
            <div key={x.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-slate-400">{x.ma_phieu}</div>
                  <div className="truncate text-sm font-semibold">{x.ten_thiet_bi || x.thiet_bi_id}</div>
                  <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {loaiPhieuLabel(x.loai_phieu)}
                  </span>
                </div>
              </div>

              {checklist.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">Checklist</p>
                  {checklist.map((item) => (
                    <label key={item.id} className="flex cursor-pointer items-start gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                        checked={item.done}
                        onChange={(e) => {
                          const next = checklist.map((c) => (c.id === item.id ? { ...c, done: e.target.checked } : c));
                          onChecklistChange(x.id, next);
                        }}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              <textarea
                className="min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                placeholder="Kết quả kiểm định / biên bản bàn giao..."
                value={ketQuaById[x.id] ?? ""}
                onChange={(e) => onKetQuaChange(x.id, e.target.value)}
              />
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-[11px] font-semibold text-white"
                  onClick={() => void onKetThuc(x.id)}
                >
                  Hoàn thành
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-[11px] font-medium text-slate-500"
                  onClick={() => void onHuy(x.id)}
                >
                  Hủy
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {active.length === 0 ? <p className="text-xs text-slate-500">Không có phiếu đang mở.</p> : null}
    </div>
  );
}
