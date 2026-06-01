"use client";

import React, { useState } from "react";
import type { StaffAuthRow } from "@/types/nhan-su";
import { toast } from "sonner";

export default function TaiKhoanNhanSuStaffRow({
  r,
  availableRoles = [],
  onProvision,
  onSetRole,
  onResetPassword,
}: {
  r: StaffAuthRow;
  availableRoles: { id: string; name: string }[];
  onProvision: (row: StaffAuthRow, password: string) => void;
  onSetRole: (row: StaffAuthRow, roleName: string) => void;
  onResetPassword: (row: StaffAuthRow, password: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [newPw, setNewPw] = useState("");
  const ksnkRole = (r.role_names || [])[0]; // Lấy vai trò đầu tiên (thường là vai trò KSNK chính)

  return (
    <tr className="border-b border-slate-100 animate-in fade-in duration-300">
      <td className="p-3 font-mono text-xs">{r.ma_nv}</td>
      <td className="p-3 font-medium">{r.ho_ten || "—"}</td>
      <td className="max-w-0 truncate p-3 text-xs" title={r.email || undefined}>
        {r.email || "—"}
      </td>
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
              onClick={() => {
                if (pw.length < 8) {
                  toast.error("Mật khẩu tối thiểu 8 ký tự.");
                  return;
                }
                onProvision(r, pw);
              }}
              className="rounded-lg bg-slate-800 px-2 py-1.5 text-xs font-bold uppercase text-white disabled:opacity-40"
            >
              Tạo TK
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <select
                className="min-h-9 flex-1 max-w-[180px] rounded-lg border border-slate-200 text-xs font-medium text-slate-700"
                value={ksnkRole || ""}
                onChange={(e) => {
                  if (e.target.value) onSetRole(r, e.target.value);
                }}
              >
                <option value="">— Vai trò —</option>
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowReset(!showReset)}
                className="flex items-center justify-center shrink-0 w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-sm transition-all active:scale-95"
                title="Đổi mật khẩu tài khoản"
              >
                🔑
              </button>
            </div>

            {showReset && (
              <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Mật khẩu mới (≥8 ký tự)"
                  className="min-h-8 min-w-[110px] flex-1 rounded-lg border border-slate-200 px-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newPw.length < 8) {
                      toast.error("Mật khẩu tối thiểu 8 ký tự.");
                      return;
                    }
                    onResetPassword(r, newPw);
                    setNewPw("");
                    setShowReset(false);
                  }}
                  className="rounded-lg bg-rose-600 hover:bg-rose-700 px-2.5 py-1 text-xs font-bold text-white transition-colors"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReset(false);
                    setNewPw("");
                  }}
                  className="rounded-lg border border-slate-200 hover:bg-slate-50 px-1.5 py-1 text-xs text-slate-500 transition-colors"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}


