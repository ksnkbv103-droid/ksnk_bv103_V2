"use client";

import React, { useState } from "react";
import type { StaffAuthRow } from "../actions/tai-khoan-nhan-su.actions";
export default function TaiKhoanNhanSuStaffRow({
  r,
  availableRoles = [],
  onProvision,
  onSetRole,
}: {
  r: StaffAuthRow;
  availableRoles: { id: string; name: string }[];
  onProvision: (row: StaffAuthRow, password: string) => void;
  onSetRole: (row: StaffAuthRow, roleName: string) => void;
}) {
  const [pw, setPw] = useState("");
  const ksnkRole = (r.role_names || [])[0]; // Lấy vai trò đầu tiên (thường là vai trò KSNK chính)

  return (
    <tr className="border-b border-slate-100">
      <td className="p-3 font-mono text-xs">{r.ma_nv}</td>
      <td className="p-3 font-medium">{r.ho_ten || "—"}</td>
      <td className="p-3 text-xs">{r.email || "—"}</td>
      <td className="p-3">{r.is_active === false ? "Không" : "Có"}</td>
      <td className="p-3 text-xs">{r.auth_user_id ? "Đã liên kết" : "Chưa"}</td>
      <td className="p-3 text-xs">
        {ksnkRole ? (
          <span className="bg-emerald-50 text-[#026f17] px-2 py-0.5 rounded font-bold border border-emerald-100">
            {ksnkRole}
          </span>
        ) : "—"}
      </td>
      <td className="space-y-2 p-3 align-top">
        {!r.auth_user_id ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Mật khẩu ban đầu"
              className="min-h-9 min-w-[140px] rounded-lg border border-slate-200 px-2 text-xs"
            />
            <button
              type="button"
              disabled={r.is_active === false}
              onClick={() => onProvision(r, pw)}
              className="rounded-lg bg-slate-800 px-2 py-1.5 text-xs font-bold uppercase text-white disabled:opacity-40"
            >
              Tạo TK
            </button>
          </div>
        ) : (
          <select
            className="min-h-9 w-full max-w-[220px] rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
            value={ksnkRole || ""}
            onChange={(e) => {
              if (e.target.value) onSetRole(r, e.target.value);
            }}
          >
            <option value="">— Chọn vai trò gán —</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
        )}
      </td>
    </tr>
  );
}

