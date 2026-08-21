"use client";

import React, { useEffect, useState } from "react";
import { listKhoaPhongForCssdCapPhatAction, type CssdKhoaNhanOption } from "../../actions/cssd-khoa-nhan.actions";

type Props = {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

export default function CssdKhoaNhanPicker({ value, onChange, disabled }: Props) {
  const [rows, setRows] = useState<CssdKhoaNhanOption[]>([]);
  useEffect(() => {
    void listKhoaPhongForCssdCapPhatAction().then((res) => {
      if (res.success) setRows(res.data);
    });
  }, []);
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Khoa nhận <span className="text-red-500">*</span>
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-300 disabled:bg-slate-50"
      >
        <option value="">— Chọn khoa nhận bộ —</option>
        {rows.map((k) => (
          <option key={k.id} value={k.id}>
            {k.ma ? `${k.ma} · ${k.ten}` : k.ten}
          </option>
        ))}
      </select>
    </label>
  );
}
