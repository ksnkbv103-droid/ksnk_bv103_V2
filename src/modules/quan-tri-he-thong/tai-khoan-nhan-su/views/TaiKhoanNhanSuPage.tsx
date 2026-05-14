"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { usePermission } from "@/hooks/usePermission";
import TaiKhoanNhanSuStaffRow from "../components/TaiKhoanNhanSuStaffRow";
import SearchBar from "@/components/shared/SearchBar";
import { KsnkPageHeader } from "@/components/shared/KsnkPageShell";
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
      <KsnkPageHeader
        title="Tài khoản và vai trò KSNK"
        actions={
          <button
            type="button"
            onClick={() => void load()}
            className="bv103-control-h shrink-0 rounded-lg bg-[#026f17] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#015a12]"
          >
            Tải lại
          </button>
        }
      />

      <div className="flex max-h-[min(calc(100dvh-13rem),720px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="min-w-0 shrink-0 border-b border-slate-200 bg-slate-50/70 p-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Mã NV, họ tên, email…" />
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 text-xs font-black uppercase text-slate-500 shadow-[0_1px_0_rgb(226_232_240)]">
              <tr>
                <th className="w-[9%] p-3">Mã NV</th>
                <th className="w-[17%] p-3">Họ tên</th>
                <th className="w-[22%] p-3">Email</th>
                <th className="w-[8%] p-3">Hoạt động</th>
                <th className="w-[11%] p-3">Tài khoản</th>
                <th className="w-[13%] p-3">Vai trò</th>
                <th className="w-[20%] p-3">Thao tác</th>
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
    </div>
  );
}
