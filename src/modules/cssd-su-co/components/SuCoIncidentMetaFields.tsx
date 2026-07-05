"use client";

import React from "react";
import { Camera } from "lucide-react";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { getGoogleDriveDirectLink } from "./IncidentPrintView";

export type SuCoIncidentMetaState = {
  thoiGianPhatHien: string;
  nguoiPhatHien: string;
  nguoiLienQuan: string;
  moTa: string;
  anhMinhChung: string;
};

type Props = {
  values: SuCoIncidentMetaState;
  nguoiLapLabel: string;
  imageRequired?: boolean;
  imageHidden?: boolean;
  onChange: (key: keyof SuCoIncidentMetaState, value: string) => void;
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
  onChange,
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
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-800 outline-none transition-all focus:border-[var(--primary)] focus:bg-white sm:text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>Người lập (tài khoản đăng nhập)</label>
          <input
            value={nguoiLapLabel}
            readOnly
            className="h-12 w-full cursor-not-allowed rounded-xl border border-slate-100 bg-slate-100 px-4 text-xs font-semibold text-slate-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>Người phát hiện (tùy chọn)</label>
          <input
            value={values.nguoiPhatHien}
            onChange={(e) => onChange("nguoiPhatHien", e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none transition-all focus:border-[var(--primary)] focus:bg-white sm:text-sm"
            placeholder="Tên hoặc mã nhân viên..."
          />
        </div>
        <div className="space-y-1.5">
          <label className={bv103LayoutChrome.labelBlock}>Người liên quan (tùy chọn)</label>
          <input
            value={values.nguoiLienQuan}
            onChange={(e) => onChange("nguoiLienQuan", e.target.value)}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-700 outline-none transition-all focus:border-[var(--primary)] focus:bg-white sm:text-sm"
            placeholder="Tự điền hoặc truy vết từ khâu lỗi..."
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
          Mô tả chi tiết sự cố <span className="text-red-500 font-bold">*</span>
        </label>
        <textarea
          value={values.moTa}
          onChange={(e) => onChange("moTa", e.target.value)}
          rows={5}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-base font-medium text-slate-800 outline-none transition-all focus:border-[var(--primary)] focus:bg-white sm:text-sm"
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
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-base font-semibold text-slate-700 outline-none transition-all focus:border-[var(--primary)] focus:bg-white sm:text-xs"
              placeholder="Dán link ảnh hoặc link Google Drive..."
            />
            <div className="absolute right-3.5 top-3.5 text-slate-400">
              <Camera size={16} />
            </div>
          </div>
          {values.anhMinhChung ? (
            <div className="mt-3 flex max-h-48 flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
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
