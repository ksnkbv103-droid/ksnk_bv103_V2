"use client";

import React, { useEffect, useState } from "react";
import { fetchKhoaNhanOptionsForCapPhat } from "../../actions/cssd-khoa-nhan.actions";

export function CapPhatKhoaNhanPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [opts, setOpts] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    void fetchKhoaNhanOptionsForCapPhat().then((r) => {
      if (r.success) setOpts(r.data);
    });
  }, []);

  return (
    <label className="block space-y-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      Khoa nhận (cấp phát)
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-300"
      >
        <option value="">— Chọn khoa nhận (không chọn = khoa sở hữu bộ) —</option>
        {opts.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
