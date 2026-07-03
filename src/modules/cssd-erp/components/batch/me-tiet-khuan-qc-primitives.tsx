"use client";

import { Check, XCircle } from "lucide-react";

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