"use client";

import { Camera, Check, XCircle } from "lucide-react";

/** Nút chọn Đạt / Không đạt — to, rõ, dễ bấm trên thiết bị nhỏ */
export function PassFailToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: "DAT" | "KHONG_DAT" | "";
  onChange: (v: "DAT" | "KHONG_DAT" | "") => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value === "DAT" ? "" : "DAT")}
        className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-xs font-black uppercase tracking-wide transition-all ${
          value === "DAT"
            ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-100"
            : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <Check size={14} />
        ĐẠT
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value === "KHONG_DAT" ? "" : "KHONG_DAT")}
        className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 text-xs font-black uppercase tracking-wide transition-all ${
          value === "KHONG_DAT"
            ? "border-red-500 bg-red-500 text-white shadow-md shadow-red-100"
            : "border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:bg-red-50"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <XCircle size={14} />
        KHÔNG ĐẠT
      </button>
    </div>
  );
}

/** Ô upload / nhập URL ảnh minh chứng */
function PhotoProof({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="mt-2 space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Camera size={12} className={required ? "text-amber-500" : "text-slate-400"} />
        Ảnh minh chứng — {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
      />
    </div>
  );
}
