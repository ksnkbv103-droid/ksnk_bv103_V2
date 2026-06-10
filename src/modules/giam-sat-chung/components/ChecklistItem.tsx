// src/modules/giam-sat-chung/components/ChecklistItem.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChecklistCriterion, ChecklistResult } from "@/types/giam-sat-chung";
import { gscFormChrome } from "../lib/gsc-form-chrome";
import LogEntryForm from "./LogEntryForm";

interface ChecklistItemProps {
  criterion: ChecklistCriterion;
  result: ChecklistResult;
  onChange?: (result: ChecklistResult) => void;
  /** Chỉ hiển thị (xem lại phiên), không cho sửa. */
  readOnly?: boolean;
  /** Số thứ tự tiêu chí trong bảng kiểm. */
  index?: number;
  // Slice 6 (session-level RCA v5): KHÔNG còn dropdown per-criterion — chuyển sang
  // SessionRcaAnalysisPanel ở cuối form. Loại bỏ props failureReasons & contextTags.
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

const renderWeightBadge = (weightType?: string, isRedFlag?: boolean) => {
  if (isRedFlag) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700 animate-pulse border border-red-200 shadow-sm">
        🚨 Chí mạng (Red Flag)
      </span>
    );
  }
  if (weightType === "CRITICAL") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-600 border border-red-100">
        Chí mạng
      </span>
    );
  }
  if (weightType === "MINOR") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600 border border-blue-100">
        Hành chính
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-600 border border-amber-100">
      Nghiêm trọng
    </span>
  );
};

export default function ChecklistItem({
  criterion,
  result,
  onChange = () => {},
  readOnly,
  index,
}: ChecklistItemProps) {
  const order = index || criterionOrder(criterion.description);
  const kieuDuLieu = criterion.kieu_du_lieu ?? "BOOLEAN";
  const isLogEntry = kieuDuLieu === "SO_LIEU" || kieuDuLieu === "LUA_CHON";
  const [noteOpen, setNoteOpen] = useState(Boolean(result.note && String(result.note).trim()));
  const noteRef = useRef<HTMLTextAreaElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const fileExt = file.name.split(".").pop();
      const fileName = `criterion-${criterion.id}-${Date.now()}.${fileExt}`;
      const filePath = `session-temp/${fileName}`;

      const { data, error } = await supabase.storage
        .from("gsc-evidences")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("gsc-evidences")
        .getPublicUrl(filePath);

      onChange({ ...result, image_url: publicUrl });
    } catch (err) {
      console.error("Lỗi upload ảnh:", err);
      alert("Không thể tải lên ảnh bằng chứng. Vui lòng kiểm tra kết nối mạng!");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    if (confirm("Bạn có chắc chắn muốn xóa ảnh bằng chứng này?")) {
      onChange({ ...result, image_url: null });
    }
  };

  if (readOnly) {
    return (
      <div
        className={`${gscFormChrome.panelShell} flex flex-col justify-between gap-4 border-l-4 border-slate-200 md:flex-row md:items-center`}
      >
        <div className="flex-1 space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1 text-xs font-bold text-slate-700">
              {order || "#"}
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm font-semibold leading-tight text-slate-800">{criterion.label}</h4>
                {renderWeightBadge(criterion.weightType, criterion.isRedFlag)}
              </div>
            </div>
          </div>
          
          {result.image_url ? (
            <div className="flex items-center gap-3 mt-2 pl-8">
              <div className="relative h-12 w-12 overflow-hidden rounded border border-slate-200 bg-slate-50 shadow-sm shrink-0">
                <img
                  src={result.image_url}
                  alt="Bằng chứng vi phạm"
                  className="h-full w-full object-cover cursor-pointer"
                  onClick={() => setPreviewOpen(true)}
                />
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="text-[11px] font-bold text-blue-600 hover:underline uppercase"
              >
                Xem bằng chứng ảnh
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                result.value === "DAT"
                  ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                  : result.value === "KHONG_DAT"
                    ? "bg-red-500/15 text-red-700"
                    : "bg-slate-200 text-slate-600"
              }`}
            >
              {valueLabel(result.value)}
            </span>
          </div>
          {result.note ? <p className="max-w-xs text-right text-[11px] text-slate-700">Ghi chú: {result.note}</p> : null}
        </div>

        {previewOpen && result.image_url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 transition-opacity animate-fade-in pointer-events-auto">
            <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-white p-2 shadow-2xl">
              <img
                src={result.image_url}
                alt="Bằng chứng phóng to"
                className="max-h-[80vh] object-contain rounded-lg"
              />
              <div className="mt-2 flex justify-end gap-2 px-1 pb-1">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
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
      className={`${gscFormChrome.panelShell} border-l-4 border-transparent transition-all hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20`}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1 text-xs font-bold text-slate-700">
              {order || "#"}
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="text-sm font-semibold leading-tight text-slate-800 sm:text-base">{criterion.label}</h4>
                {renderWeightBadge(criterion.weightType, criterion.isRedFlag)}
              </div>
              <p className="hidden text-[11px] font-medium text-slate-400 sm:block sm:text-[11px]">
                Phím <kbd className="rounded border border-slate-200 bg-slate-50 px-1">1</kbd> Đạt ·{" "}
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1">2</kbd> Không đạt ·{" "}
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1">3</kbd> Không áp dụng
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-nowrap">
          <button
            type="button"
            onClick={() => pickValue("DAT")}
            className={`${gscFormChrome.choiceBtnRow} min-w-[5.5rem] flex-1 md:flex-none ${
              result.value === "DAT" ? gscFormChrome.choiceBtnActive : gscFormChrome.choiceBtnIdle
            }`}
          >
            Đạt
          </button>

          <button
            type="button"
            onClick={() => pickValue("KHONG_DAT")}
            className={`${gscFormChrome.choiceBtnRow} min-w-[6.5rem] flex-1 md:flex-none ${
              result.value === "KHONG_DAT" ? gscFormChrome.choiceBtnActiveDanger : gscFormChrome.choiceBtnIdle
            }`}
          >
            Không đạt
          </button>

          <button
            type="button"
            onClick={() => pickValue("NA")}
            className={`${gscFormChrome.choiceBtnRow} min-w-[8.5rem] flex-1 md:flex-none ${
              result.value === "NA" ? "border-slate-500 bg-slate-600 text-white shadow-sm" : gscFormChrome.choiceBtnIdle
            }`}
          >
            Không áp dụng
          </button>

          <button
            type="button"
            onClick={() => setNoteOpen((v) => !v)}
            className={`${gscFormChrome.choiceBtnRow} min-w-[8.5rem] flex-1 md:flex-none ${
              noteOpen || String(result.note || "").trim()
                ? gscFormChrome.choiceBtnNote
                : gscFormChrome.choiceBtnIdle
            }`}
          >
            {noteOpen ? "Ẩn ghi chú" : "Bổ sung ghi chú"}
          </button>

          {result.value === "KHONG_DAT" && (
            <>
              <button
                type="button"
                onClick={handleCameraClick}
                disabled={uploading}
                className={`${gscFormChrome.choiceBtnRow} min-w-[8.5rem] flex-1 md:flex-none ${
                  result.image_url ? gscFormChrome.choiceBtnEvidence : gscFormChrome.choiceBtnIdle
                }`}
              >
                {uploading ? "Đang tải..." : result.image_url ? "📸 Có bằng chứng" : "📸 Chụp bằng chứng"}
              </button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
            </>
          )}
        </div>
      </div>

      {result.image_url ? (
        <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm shrink-0">
            <img
              src={result.image_url}
              alt="Bằng chứng vi phạm"
              className="h-full w-full object-cover cursor-pointer"
              onClick={() => setPreviewOpen(true)}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ảnh bằng chứng</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="text-[11px] font-semibold text-blue-600 hover:underline uppercase tracking-wide"
              >
                Xem to
              </button>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-[11px] font-semibold text-rose-600 hover:underline uppercase tracking-wide"
              >
                Xóa bỏ
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      {isLogEntry && !readOnly ? (
        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
          <label className={gscFormChrome.labelBlock}>
            {kieuDuLieu === "LUA_CHON" ? "Chọn giá trị" : "Số liệu đo được"}
          </label>
          <LogEntryForm
            kieuDuLieu={kieuDuLieu}
            cacLuaChon={criterion.cac_lua_chon ?? null}
            giaTriLuaChon={result.gia_tri_lua_chon ?? null}
            giaTriSo={result.gia_tri_so ?? null}
            ngay_min={criterion.nguong_min ?? null}
            ngay_max={criterion.nguong_max ?? null}
            donVi={criterion.don_vi ?? null}
            onChange={(next) => onChange({ ...result, ...next })}
          />
        </div>
      ) : null}

      {previewOpen && result.image_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 transition-opacity animate-fade-in">
          <div className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-white p-2 shadow-2xl">
            <img
              src={result.image_url}
              alt="Bằng chứng phóng to"
              className="max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-2 flex justify-end gap-2 px-1 pb-1">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
