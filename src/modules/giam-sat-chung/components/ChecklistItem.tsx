// src/modules/giam-sat-chung/components/ChecklistItem.tsx
"use client";

import React, { useState } from "react";
import { ChecklistCriterion, ChecklistResult } from "@/types/giam-sat-chung";

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
      <div className="premium-card glass-panel pointer-events-none flex flex-col justify-between gap-4 border-l-4 border-slate-200 bg-white p-5 md:flex-row md:items-center">
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
    <div className="premium-card glass-panel border-l-4 border-transparent bg-white p-5 transition-all hover:border-[#026f17]">
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
          {/* Đạt / Có */}
          <button
            onClick={() => onChange({ ...result, value: "DAT" })}
            className={`h-12 flex-1 rounded-2xl border-2 px-6 text-[11px] font-black uppercase tracking-wider transition-all md:flex-none ${
              result.value === "DAT"
                ? "border-[#026f17] bg-[#026f17] text-white shadow-lg shadow-[#026f17]/20"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#026f17]/30 hover:bg-white"
            }`}
          >
            ✅ Đạt
          </button>

          {/* Không Đạt */}
          <button
            onClick={() => onChange({ ...result, value: "KHONG_DAT" })}
            className={`h-12 flex-1 rounded-2xl border-2 px-6 text-[11px] font-black uppercase tracking-wider transition-all md:flex-none ${
              result.value === "KHONG_DAT"
                ? "border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/20"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-red-300 hover:bg-white"
            }`}
          >
            ❌ K.Đạt
          </button>

          {/* Không áp dụng */}
          <button
            onClick={() => onChange({ ...result, value: "NA" })}
            className={`h-12 flex-1 rounded-2xl border-2 px-6 text-[11px] font-black uppercase tracking-wider transition-all md:flex-none ${
              result.value === "NA"
                ? "border-slate-400 bg-slate-400 text-white shadow-lg shadow-slate-400/20"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
            }`}
          >
            N/A
          </button>

          <button
            onClick={() => setNoteOpen((v) => !v)}
            className={`h-12 rounded-2xl border-2 px-4 text-[11px] font-bold uppercase tracking-wider transition-all ${
              noteOpen || String(result.note || "").trim()
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
            }`}
          >
            {noteOpen ? "Ẩn ghi chú" : "Bổ sung ghi chú"}
          </button>
        </div>
      </div>

      {noteOpen ? (
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
          <label className="text-[11px] font-semibold text-slate-700">Ghi chú bổ sung cho tiêu chí</label>
          <textarea
            value={result.note || ""}
            onChange={(e) => onChange({ ...result, note: e.target.value })}
            className="min-h-[84px] w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none transition-colors focus:border-[var(--primary)]"
            placeholder="Nhập ghi chú bổ sung (nếu có)..."
          />
        </div>
      ) : null}
    </div>
  );
}
