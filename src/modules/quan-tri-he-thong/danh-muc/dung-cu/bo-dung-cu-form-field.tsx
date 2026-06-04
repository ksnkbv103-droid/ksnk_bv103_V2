import React from "react";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
  required?: boolean;
  disabled?: boolean;
}

/** Ô nhập một dòng — dùng trong modal Bộ dụng cụ. */
export default function BoDungCuTextField({ label, value, onChange, type = "text", required, disabled }: Props) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-black text-slate-400 uppercase ml-1">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 font-bold text-xs disabled:opacity-60"
      />
    </div>
  );
}
