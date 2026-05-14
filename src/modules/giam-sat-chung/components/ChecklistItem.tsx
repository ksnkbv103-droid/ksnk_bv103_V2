// src/modules/giam-sat-chung/components/ChecklistItem.tsx
"use client";

import React, { useState } from "react";
import { ChecklistCriterion, ChecklistResult } from "@/types/giam-sat-chung";
import { gscFormChrome } from "../lib/gsc-form-chrome";

interface ChecklistItemProps {
  criterion: ChecklistCriterion;
  result: ChecklistResult;
  onChange?: (result: ChecklistResult) => void;
  /** Chỉ hiển thị (xem lại phiên), không cho sửa. */
  readOnly?: boolean;
}

const valueLabel = (v: ChecklistResult["value"]) =>
  v === "DAT" ? "Đạt" : v === "KHONG_DAT" ? "Không đạt" : "N/A";

const criterionOrder = (description?: string | null) => {
  const m = String(description || "").match(/(\d+)/);
  return m ? m[1] : null;
};

export default function ChecklistItem({ criterion, result, onChange = () => {}, readOnly }: ChecklistItemProps) {
  const order = criterionOrder(criterion.description);
  const [noteOpen, setNoteOpen] = useState(Boolean(result.note && String(result.note).trim()));

  if (readOnly) {
    return (
      <div
        className={`${gscFormChrome.panelShell} pointer-events-none flex flex-col justify-between gap-4 border-l-4 border-slate-200 md:flex-row md:items-center`}
      >
        <div className="flex-1 space-y-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1 text-xs font-bold text-slate-700">
              {order || "#"}
            </span>
            <h4 className="text-sm font-black leading-tight text-slate-800">{criterion.label}</h4>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
              result.value === "DAT"
                ? "bg-[#026f17]/15 text-[#026f17]"
                : result.value === "KHONG_DAT"
                  ? "bg-red-500/15 text-red-700"
                  : "bg-slate-200 text-slate-600"
            }`}
          >
            {valueLabel(result.value)}
          </span>
          {result.note ? <p className="max-w-xs text-right text-[11px] text-slate-700">Ghi chú: {result.note}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`${gscFormChrome.panelShell} border-l-4 border-transparent transition-all hover:border-[#026f17]`}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex-1 space-y-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1 text-xs font-bold text-slate-700">
              {order || "#"}
            </span>
            <h4 className="text-sm font-black leading-tight text-slate-800">{criterion.label}</h4>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...result, value: "DAT" })}
            className={`h-11 min-w-[5.5rem] flex-1 rounded-xl border px-4 text-xs font-semibold uppercase tracking-wide transition-colors md:h-10 md:flex-none ${
              result.value === "DAT"
                ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            Đạt
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...result, value: "KHONG_DAT" })}
            className={`h-11 min-w-[5.5rem] flex-1 rounded-xl border px-4 text-xs font-semibold uppercase tracking-wide transition-colors md:h-10 md:flex-none ${
              result.value === "KHONG_DAT"
                ? "border-rose-600 bg-rose-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/60"
            }`}
          >
            Không đạt
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...result, value: "NA" })}
            className={`h-11 min-w-[5.5rem] flex-1 rounded-xl border px-4 text-xs font-semibold uppercase tracking-wide transition-colors md:h-10 md:flex-none ${
              result.value === "NA"
                ? "border-slate-500 bg-slate-600 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            N/A
          </button>

          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            className={`${gscFormChrome.noteToggle} ${
              noteOpen || String(result.note || "").trim()
                ? "border-amber-200/90 bg-amber-50/90 text-amber-900 hover:bg-amber-50"
                : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {noteOpen ? "Ẩn ghi chú" : "Bổ sung ghi chú"}
          </button>
        </div>
      </div>

      {noteOpen ? (
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
          <label className={gscFormChrome.labelBlock}>Ghi chú bổ sung cho tiêu chí</label>
          <textarea
            value={result.note || ""}
            onChange={(e) => onChange({ ...result, note: e.target.value })}
            className={gscFormChrome.textareaCriterionNote}
            placeholder="Nhập ghi chú bổ sung (nếu có)..."
          />
        </div>
      ) : null}
    </div>
  );
}
