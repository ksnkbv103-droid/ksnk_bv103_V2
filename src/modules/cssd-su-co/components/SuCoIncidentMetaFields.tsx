"use client";

import React, { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Link as LinkIcon, Trash2, UploadCloud } from "lucide-react";
import SearchableSelect, { type SearchableSelectOption } from "@/components/shared/SearchableSelect";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { getGoogleDriveDirectLink } from "./IncidentPrintView";

function compressAndLoadImage(file: File, callback: (base64: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1200;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL("image/jpeg", 0.75));
      } else {
        callback(String(e.target?.result || ""));
      }
    };
    img.src = String(e.target?.result || "");
  };
  reader.readAsDataURL(file);
}

export type SuCoIncidentMetaState = {
  thoiGianPhatHien: string;
  nguoiPhatHien: string;
  nguoiPhatHienId: string;
  nguoiLienQuan: string;
  nguoiLienQuanId: string;
  moTa: string;
  anhMinhChung: string;
};

type Props = {
  values: SuCoIncidentMetaState;
  nguoiLapLabel: string;
  imageRequired?: boolean;
  imageHidden?: boolean;
  detectorOptions: SearchableSelectOption[];
  relatedOptions: SearchableSelectOption[];
  relatedHint?: string;
  wide?: boolean;
  timeLabel?: string;
  detectorLabel?: string;
  moTaLabel?: string;
  onChange: (key: keyof SuCoIncidentMetaState, value: string) => void;
  onSelectDetector: (id: string, label: string) => void;
  onSelectRelated: (id: string, label: string) => void;
};

export function defaultDetectionDateTimeLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function SuCoIncidentMetaFields({
  values,
  nguoiLapLabel,
  imageRequired = false,
  imageHidden = false,
  detectorOptions,
  relatedOptions,
  relatedHint,
  wide = false,
  timeLabel = "Thời gian phát hiện",
  detectorLabel = "Người phát hiện (tùy chọn)",
  moTaLabel = "Mô tả chi tiết sự cố",
  onChange,
  onSelectDetector,
  onSelectRelated,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const peopleGrid = `grid grid-cols-1 gap-4 sm:grid-cols-2 ${wide ? "lg:grid-cols-4" : ""}`;
  const detailGrid = wide
    ? `grid grid-cols-1 gap-4 ${imageHidden ? "" : "lg:grid-cols-2"}`
    : "space-y-[var(--bv103-space-3)]";
  return (
    <div className="space-y-[var(--bv103-space-3)]">
      <div className={peopleGrid}>
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>{timeLabel}</label>
          <input
            type="datetime-local"
            value={values.thoiGianPhatHien}
            onChange={(e) => onChange("thoiGianPhatHien", e.target.value)}
            className={`${bv103LayoutChrome.controlInput} bg-slate-50`}
          />
        </div>
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>Người lập (tài khoản đăng nhập)</label>
          <input
            value={nguoiLapLabel}
            readOnly
            className={`${bv103LayoutChrome.controlInput} cursor-not-allowed border-slate-100 bg-slate-100 text-slate-600`}
          />
        </div>
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>{detectorLabel}</label>
          <SearchableSelect
            value={values.nguoiPhatHienId}
            onChange={(id) => {
              const opt = detectorOptions.find((o) => o.id === id);
              onSelectDetector(id, opt?.label || "");
            }}
            options={detectorOptions}
            placeholder="— Chọn nhân viên —"
            searchPlaceholder="Tìm tên / mã NV…"
          />
        </div>
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>Người liên quan (tùy chọn)</label>
          <SearchableSelect
            value={values.nguoiLienQuanId}
            onChange={(id) => {
              const opt = relatedOptions.find((o) => o.id === id);
              onSelectRelated(id, opt?.label || "");
            }}
            options={relatedOptions}
            placeholder="— Chọn từ khâu / danh mục —"
            searchPlaceholder="Tìm tên / mã NV…"
          />
          {relatedHint ? (
            <p className="text-[11px] font-medium text-slate-500">{relatedHint}</p>
          ) : null}
        </div>
      </div>

      <div className={detailGrid}>
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>
            {moTaLabel} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={values.moTa}
            onChange={(e) => onChange("moTa", e.target.value)}
            rows={wide ? 3 : 4}
            className="w-full resize-none rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-[var(--primary)]/50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/15"
            placeholder="Mô tả cụ thể sự việc..."
          />
        </div>
        {!imageHidden ? (
          <div className={`space-y-1.5 ${wide ? "" : "border-t border-slate-100 pt-2"}`}>
            <div className="flex items-center justify-between">
              <label className={bv103LayoutChrome.labelBlock}>
                Ảnh minh chứng{imageRequired ? " *" : " (tùy chọn)"}
              </label>
              <button
                type="button"
                onClick={() => setShowLinkInput(!showLinkInput)}
                className="text-[11px] font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1"
              >
                <LinkIcon size={12} />
                {showLinkInput ? "Chụp/Tải ảnh" : "Dán link ảnh"}
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  compressAndLoadImage(file, (dataUrl) => {
                    onChange("anhMinhChung", dataUrl);
                  });
                }
              }}
            />

            {showLinkInput ? (
              <div className="relative">
                <input
                  value={values.anhMinhChung}
                  onChange={(e) => onChange("anhMinhChung", e.target.value)}
                  className={`${bv103LayoutChrome.controlInput} bg-slate-50 pr-10`}
                  placeholder="Dán link ảnh hoặc link Google Drive..."
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <LinkIcon size={16} />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95"
                >
                  <Camera size={15} className="text-[var(--primary)]" />
                  Chụp ảnh / Tải ảnh lên
                </button>
                {values.anhMinhChung ? (
                  <button
                    type="button"
                    onClick={() => onChange("anhMinhChung", "")}
                    className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 size={14} /> Xóa ảnh
                  </button>
                ) : null}
              </div>
            )}

            {values.anhMinhChung ? (
              <div className="mt-2.5 flex max-h-48 flex-col items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 p-2 relative group">
                <img
                  src={getGoogleDriveDirectLink(values.anhMinhChung)}
                  alt="Preview ảnh minh chứng"
                  className="max-h-40 rounded-lg border border-slate-100 bg-white object-contain shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
