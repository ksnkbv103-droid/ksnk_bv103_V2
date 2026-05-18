// src/modules/giam-sat-chung/components/ChecklistItem.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChecklistCriterion, ChecklistResult } from "@/types/giam-sat-chung";
import { gscFormChrome } from "../lib/gsc-form-chrome";

interface ChecklistItemProps {
  criterion: ChecklistCriterion;
  result: ChecklistResult;
  onChange?: (result: ChecklistResult) => void;
  /** Chỉ hiển thị (xem lại phiên), không cho sửa. */
  readOnly?: boolean;
  /** Số thứ tự tiêu chí trong bảng kiểm. */
  index?: number;
}

const valueLabel = (v: ChecklistResult["value"]) =>
  v === "DAT" ? "Đạt" : v === "KHONG_DAT" ? "Không đạt" : "Không áp dụng";

const criterionOrder = (description?: string | null) => {
  const m = String(description || "").match(/(\d+)/);
  return m ? m[1] : null;
};

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export default function ChecklistItem({
  criterion,
  result,
  onChange = () => {},
  readOnly,
  index,
}: ChecklistItemProps) {
  const order = index || criterionOrder(criterion.description);
  const [noteOpen, setNoteOpen] = useState(Boolean(result.note && String(result.note).trim()));
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (result.note && String(result.note).trim()) setNoteOpen(true);
  }, [result.note]);

  useEffect(() => {
    if (result.value !== "KHONG_DAT") return;
    setNoteOpen(true);
    const tid = window.setTimeout(() => noteRef.current?.focus(), 0);
    return () => window.clearTimeout(tid);
  }, [result.value]);

  const pickValue = (value: ChecklistResult["value"]) => {
    onChange({ ...result, value });
    if (value === "KHONG_DAT") setNoteOpen(true);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTypingTarget(e.target) && e.target !== e.currentTarget) return;
    if (e.key === "1") {
      e.preventDefault();
      pickValue("DAT");
    } else if (e.key === "2") {
      e.preventDefault();
      pickValue("KHONG_DAT");
    } else if (e.key === "3") {
      e.preventDefault();
      pickValue("NA");
    }
  };

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

  const noteRequired = result.value === "KHONG_DAT";
  const notePlaceholder = noteRequired
    ? "Ghi rõ lý do không đạt (khuyến nghị bắt buộc)…"
    : "Nhập ghi chú bổ sung (nếu có)…";

  return (
    <div
      tabIndex={0}
      onKeyDown={handleRowKeyDown}
      className={`${gscFormChrome.panelShell} border-l-4 border-transparent transition-all hover:border-[#026f17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20`}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex-1 space-y-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1 text-xs font-bold text-slate-700">
              {order || "#"}
            </span>
            <div className="min-w-0 space-y-1">
              <h4 className="text-sm font-black leading-tight text-slate-800 sm:text-base">{criterion.label}</h4>
              <p className="hidden text-[10px] font-medium text-slate-400 sm:block sm:text-[11px]">
                Phím <kbd className="rounded border border-slate-200 bg-slate-50 px-1">1</kbd> Đạt ·{" "}
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1">2</kbd> Không đạt ·{" "}
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1">3</kbd> Không áp dụng
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          <button
            type="button"
            onClick={() => pickValue("DAT")}
            className={`bv103-control-h min-w-[5.5rem] flex-1 rounded-xl border px-3 text-[11px] font-black uppercase tracking-wide transition-all md:flex-none ${
              result.value === "DAT"
                ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md scale-[1.02]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            Đạt
          </button>

          <button
            type="button"
            onClick={() => pickValue("KHONG_DAT")}
            className={`bv103-control-h min-w-[6.5rem] flex-1 rounded-xl border px-3 text-[11px] font-black uppercase tracking-wide transition-all md:flex-none ${
              result.value === "KHONG_DAT"
                ? "border-rose-600 bg-rose-600 text-white shadow-md scale-[1.02]"
                : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/60"
            }`}
          >
            Không đạt
          </button>

          <button
            type="button"
            onClick={() => pickValue("NA")}
            className={`bv103-control-h min-w-[8.5rem] flex-1 rounded-xl border px-3 text-[11px] font-black uppercase tracking-wide transition-all md:flex-none ${
              result.value === "NA"
                ? "border-slate-500 bg-slate-600 text-white shadow-md scale-[1.02]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            Không áp dụng
          </button>

          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            className={`bv103-control-h min-w-[8.5rem] flex-1 rounded-xl border px-3 text-[11px] font-black uppercase tracking-wide transition-all shadow-sm md:flex-none ${
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
          <label className={gscFormChrome.labelBlock}>
            {noteRequired ? "Lý do không đạt" : "Ghi chú bổ sung cho tiêu chí"}
          </label>
          <textarea
            ref={noteRef}
            value={result.note || ""}
            onChange={(e) => onChange({ ...result, note: e.target.value })}
            className={gscFormChrome.textareaCriterionNote}
            placeholder={notePlaceholder}
            aria-required={noteRequired}
          />
        </div>
      ) : null}
    </div>
  );
}
