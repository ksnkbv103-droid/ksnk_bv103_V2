"use client";

import React, { useEffect, useState } from "react";
import { getLoaiMayTietKhuanOptionsAction } from "../actions/thiet-bi.actions";
import type { LoaiMayTietKhuanOption } from "../actions/thiet-bi.types";
import { quanTriFormChrome as C } from "../../lib/quan-tri-form-chrome";

/** Chọn loại máy từ `cssd_dm_loai_may` (đồng bộ với khai báo danh mục). */
export function ThietBiLoaiMayField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [rows, setRows] = useState<LoaiMayTietKhuanOption[]>([]);
  useEffect(() => {
    void getLoaiMayTietKhuanOptionsAction().then((r) => {
      if (r.success) setRows(r.data);
    });
  }, []);

  const v = value.trim();
  const codes = new Set(rows.map((r) => r.ma_loai_may));
  const orphan = Boolean(v && !codes.has(v));

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-400 ml-1">Loại máy (danh mục khai báo)</label>
      <select
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className={C.controlInput}
      >
        <option value="">— Chọn loại —</option>
        {orphan ? (
          <option value={v}>Giữ mã hiện tại: {v}</option>
        ) : null}
        {rows.map((r) => (
          <option key={r.id} value={r.ma_loai_may}>
            {r.ten_loai_may} ({r.ma_loai_may})
          </option>
        ))}
      </select>
    </div>
  );
}
