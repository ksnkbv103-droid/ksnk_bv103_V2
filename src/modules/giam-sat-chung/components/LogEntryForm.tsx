"use client";

/**
 * LogEntryForm — Slice 5 (giam-sat-tuan-thu reform v4).
 *
 * Render input theo `kieu_du_lieu` của tiêu chí (Slice 3 JSONB extended):
 *   - BOOLEAN  → 3 nút Đạt / Không đạt / NA (xử lý bởi ChecklistItem cũ).
 *   - LUA_CHON → dropdown từ `cac_lua_chon`.
 *   - SO_LIEU  → input numeric với gợi ý ngưỡng (NHAT_KY out-of-range alert).
 *
 * Component này tập trung 2 kiểu non-BOOLEAN — `cach_tinh_diem='NHAT_KY'` cần
 * (vd nhiệt độ lò TK, áp suất AIIR, MEC tủ ATSH, pH nước RO).
 */

import React from "react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

interface LogEntryFormProps {
  kieuDuLieu: "LUA_CHON" | "SO_LIEU";
  cacLuaChon?: string[] | null;
  giaTriLuaChon?: string | null;
  giaTriSo?: number | null;
  ngay_min?: number | null;
  ngay_max?: number | null;
  donVi?: string | null;
  onChange: (next: { gia_tri_so?: number | null; gia_tri_lua_chon?: string | null }) => void;
  disabled?: boolean;
}

export default function LogEntryForm({
  kieuDuLieu,
  cacLuaChon,
  giaTriLuaChon,
  giaTriSo,
  ngay_min,
  ngay_max,
  donVi,
  onChange,
  disabled,
}: LogEntryFormProps) {
  if (kieuDuLieu === "LUA_CHON") {
    const opts = Array.isArray(cacLuaChon) ? cacLuaChon : [];
    return (
      <select
        value={giaTriLuaChon ?? ""}
        disabled={disabled}
        onChange={(e) => onChange({ gia_tri_lua_chon: e.target.value || null })}
        className={`${C.controlSelectNative} text-sm disabled:opacity-60`}
      >
        <option value="">— Chọn giá trị —</option>
        {opts.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  // SO_LIEU
  const isOOR =
    typeof giaTriSo === "number" &&
    Number.isFinite(giaTriSo) &&
    ((typeof ngay_min === "number" && giaTriSo < ngay_min) ||
      (typeof ngay_max === "number" && giaTriSo > ngay_max));

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="any"
          inputMode="decimal"
          disabled={disabled}
          value={giaTriSo ?? ""}
          onChange={(e) => {
            const n = e.target.value === "" ? null : Number(e.target.value);
            onChange({ gia_tri_so: Number.isFinite(n as number) ? (n as number) : null });
          }}
          className={`${C.controlInput} text-sm transition-colors disabled:opacity-60 ${
            isOOR
              ? "border-rose-400 bg-rose-50 text-rose-900"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          aria-invalid={isOOR}
        />
        {donVi ? (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">
            {donVi}
          </span>
        ) : null}
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {typeof ngay_min === "number" && typeof ngay_max === "number"
          ? `Ngưỡng: ${ngay_min} – ${ngay_max}${donVi ? ` ${donVi}` : ""}`
          : typeof ngay_min === "number"
            ? `≥ ${ngay_min}${donVi ? ` ${donVi}` : ""}`
            : typeof ngay_max === "number"
              ? `≤ ${ngay_max}${donVi ? ` ${donVi}` : ""}`
              : "Không có ngưỡng quy định"}
      </p>
      {isOOR ? (
        <p className="text-[11px] font-medium text-rose-600">
          ⚠ Giá trị ngoài ngưỡng — sẽ được đánh dấu nghi vấn ở dashboard.
        </p>
      ) : null}
    </div>
  );
}
