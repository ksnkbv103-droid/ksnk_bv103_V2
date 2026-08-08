"use client";

import React from "react";
import { Camera } from "lucide-react";
import SearchableSelect, { type SearchableSelectOption } from "@/components/shared/SearchableSelect";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { getGoogleDriveDirectLink } from "./IncidentPrintView";

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
  onChange,
  onSelectDetector,
  onSelectRelated,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>Thời gian phát hiện</label>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>Người phát hiện (tùy chọn)</label>
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

      <div className="space-y-1.5">
        <label className={bv103LayoutChrome.labelBlock}>
          Mô tả chi tiết sự cố <span className="text-red-500">*</span>
        </label>
        <textarea
          value={values.moTa}
          onChange={(e) => onChange("moTa", e.target.value)}
          rows={4}
          className="w-full resize-none rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-[var(--primary)]/50 focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/15"
          placeholder="Mô tả cụ thể sự việc..."
        />
      </div>

      {!imageHidden ? (
        <div className="space-y-1.5 border-t border-slate-100 pt-2">
          <label className={bv103LayoutChrome.labelBlock}>
            Ảnh minh chứng{imageRequired ? " *" : " (tùy chọn)"}
          </label>
          <div className="relative">
            <input
              value={values.anhMinhChung}
              onChange={(e) => onChange("anhMinhChung", e.target.value)}
              className={`${bv103LayoutChrome.controlInput} bg-slate-50 pr-10`}
              placeholder="Dán link ảnh hoặc link Google Drive..."
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Camera size={16} />
            </div>
          </div>
          {values.anhMinhChung ? (
            <div className="mt-3 flex max-h-48 flex-col items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 p-3">
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
  );
}
