"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import TaiKhoanNhanSuStaffRow from "../components/TaiKhoanNhanSuStaffRow";
import {
  getAvailableRolesAction,
  listStaffAuthOverview,
  provisionStaffAuthAccount,
  setStaffKsnkRbacRole,
} from "../actions/tai-khoan-nhan-su.actions";
import type { StaffAuthRow } from "@/types/nhan-su";


export default function TaiKhoanNhanSuPage() {
  const { loading: permLoading, isAdmin, canView, canEdit } = usePermission();
  const canUse = !permLoading && (isAdmin || (canView("PHAN_QUYEN") && canEdit("PHAN_QUYEN")));

  const [rows, setRows] = useState<StaffAuthRow[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listStaffAuthOverview({ search: debouncedSearch, pageSize: 200 });
    setLoading(false);
    if (!res.success) {
      toast.error(res.error || "Không tải được danh sách.");
      return;
    }
    setRows(res.rows);
  }, [debouncedSearch]);

  const loadRoles = useCallback(async () => {
    const res = await getAvailableRolesAction();
    if (res.success) setRoles(res.data);
  }, []);

  useEffect(() => {
    if (canUse) {
      void load();
      void loadRoles();
    }
  }, [canUse, load, loadRoles]);


  const onProvision = async (r: StaffAuthRow, password: string) => {
    const res = await provisionStaffAuthAccount({ staffId: r.id, password });
    if (!res.success) {
      toast.error(res.error || "Không tạo được tài khoản.");
      return;
    }
    toast.success("Đã tạo tài khoản và liên kết hồ sơ.");
    void load();
  };

  const onSetRole = async (r: StaffAuthRow, roleName: string) => {
    const res = await setStaffKsnkRbacRole({ staffId: r.id, roleName });
    if (!res.success) {
      toast.error(res.error || "Không gán được vai trò.");
      return;
    }
    toast.success("Đã cập nhật vai trò KSNK.");
    void load();
  };

  if (permLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#026f17] border-t-transparent" />
      </div>
    );
  }

  if (!canUse) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-8 text-center text-sm text-slate-700">
        Cần quyền <strong>Quản trị phân quyền (sửa ma trận)</strong> hoặc vai trò quản trị để mở trang này.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="space-y-1">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[#026f17]">Tài khoản và vai trò KSNK</h1>
        <p className="text-sm text-slate-600">
          Danh sách nhân viên toàn viện: tạo tài khoản đăng nhập (theo email hồ sơ) và gán một trong các vai trò hệ
          thống KSNK.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-500">Tìm kiếm</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 min-h-11 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Mã NV, họ tên, email…"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-11 rounded-xl bg-[#026f17] px-4 text-sm font-bold uppercase text-white"
        >
          Tải lại
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="p-3">Mã NV</th>
              <th className="p-3">Họ tên</th>
              <th className="p-3">Email</th>
              <th className="p-3">Hoạt động</th>
              <th className="p-3">Tài khoản</th>
              <th className="p-3">Vai trò</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  Không có dữ liệu.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <TaiKhoanNhanSuStaffRow 
                  key={r.id} 
                  r={r} 
                  availableRoles={roles}
                  onProvision={onProvision} 
                  onSetRole={onSetRole} 
                />
              ))

            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
